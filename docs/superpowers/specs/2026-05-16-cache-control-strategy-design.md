# Cache-Control Strategy Redesign

- Date: 2026-05-16
- Status: Approved
- Scope: `apps/web` HTTP response cache headers

## Background

`https://innei.in/ja` was observed stuck in Cloudflare's cache for an extended
period. Investigation found:

- `next.config.mjs` `headers()` only enumerates `/`, `/posts*`, `/notes*` (and
  their `/:locale/...` variants), `/api/*`, `/feed`. It has no entry for the
  locale-prefixed home (`/:locale`), nor for `/thinking`, `/timeline`,
  `/friends`, page slugs, etc.
- Uncovered routes receive no `CDN-Cache-Control`. Cloudflare falls back to the
  `Cache-Control` Next.js natively emits for ISR pages:
  `s-maxage=600, stale-while-revalidate=31535400` (`revalidate=600` from
  `[locale]/layout.tsx`; SWR ~= 1 year). The 1-year SWR window lets Cloudflare
  serve the cached copy almost indefinitely.
- A response carrying `Set-Cookie` is not cached by Cloudflare
  (`cf-cache-status: BYPASS`). `/ja` happened to be populated into CF cache by a
  cookie-less request, so it got pinned; `/`, `/en`, `/zh` carry cookies and are
  bypassed.

Additional problems with the current state:

1. Coverage gap — most routes leak Next.js native ISR headers to the CDN.
2. Inconsistency — covered pages get `max-age=1`, uncovered pages leak a 1-year
   SWR.
3. `/feed` has two header sources (next.config `headers()` and the route
   handler), which conflict.
4. ISR `revalidate` and the CDN headers disagree on covered detail pages.
5. Cache directives are scattered across `next.config.mjs`, route handlers, and
   `og-renderer.tsx` with no single source of truth.

## Goals

- **Near-realtime pages**: every HTML page receives a short, explicit
  `CDN-Cache-Control` (~1s). Only feeds, OG images, and static assets are
  cached long.
- **Centralized policy**: one registry module is the single source of truth for
  cache header *values*.
- Plug the coverage gap so no route leaks Next.js native ISR headers to the CDN.

## Non-goals

- Route segment config (`revalidate`, `dynamic`, `fetchCache`) is left in place,
  untouched.
- Solving the `Set-Cookie` -> CF `BYPASS` behavior — irrelevant under the
  near-realtime policy, since pages target ~1s regardless.
- Tag-based on-publish revalidation.

## Design

### Content classes

Every response belongs to one class. Each class is a `{ browser, cdn }` pair;
`toHeaders()` expands it into four headers: `Cache-Control` = `browser`;
`CDN-Cache-Control`, `Vercel-CDN-Cache-Control`, `Cloudflare-CDN-Cache-Control`
= `cdn` (all three the same value, including `stale-while-revalidate`).

| Class     | `Cache-Control` (browser)                                  | CDN headers                         |
| --------- | ---------------------------------------------------------- | ----------------------------------- |
| `page`    | `public, max-age=0, must-revalidate`                       | `max-age=1`                         |
| `api`     | `public, max-age=0, must-revalidate, stale-while-revalidate=10` | `max-age=10, stale-while-revalidate=60` |
| `noStore` | `no-store`                                                 | `no-store`                          |
| `feed`    | `public, max-age=300, stale-while-revalidate=3600`         | `max-age=600, stale-while-revalidate=86400` |

OG image header-sets (consumed directly by route handlers, not by `headers()`):

| Set          | value (browser = cdn)                                |
| ------------ | ---------------------------------------------------- |
| `og.primary` | `public, max-age=86400, stale-while-revalidate=604800` |
| `og.fallback`| `public, max-age=60, stale-while-revalidate=300`     |
| `og.home`    | `public, max-age=3600, stale-while-revalidate=600`   |

Untouched: `/_next/*`, `/public` static files, and `/robots.txt` keep their
Next.js native headers — the registry must not override them.

### Registry module

`apps/web/src/lib/cache-policy.mjs` — plain ESM, JSDoc-typed. Imported by
`next.config.mjs` (relative path) and by the OG route handlers
(`~/lib/cache-policy`). It must be `.mjs` so the ESM `next.config.mjs` can
import it directly.

Exports:

- `cachePolicy` — the named header-sets: `page`, `api`, `noStore`, `feed`, and
  `og` (`og.primary` / `og.fallback` / `og.home`).
- `toHeaders(set)` — expands a `{ browser, cdn }` set into the four-header array
  `[{ key, value }, ...]`.
- `buildHeadersConfig()` — returns the full `next.config.mjs` `headers()` array.

### `headers()` source strategy

Next.js `headers()` applies the **last matching entry's** value for a duplicate
header key (confirmed in the Next.js `headers` docs). The source list therefore
runs the catch-all first and specific overrides after:

| Order | `source`                                                                                                          | Class     |
| ----- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| 1     | page catch-all (see below)                                                                                        | `page`    |
| 2     | `/feed`, `/atom.xml`, `/feed.xml`, `/sitemap`, `/sitemap.xml`, `/thinking/feed`, `/:locale/thinking/feed`, `/says/feed`, `/:locale/says/feed` | `feed`    |
| 3     | `/api/:path*`                                                                                                     | `api`     |
| 4     | `/api/webhook/:path*`, `/api/healthz`                                                                             | `noStore` |

`feed`, `api`, and `noStore` come after the catch-all and override it via
last-wins; they need no exclusion from the catch-all.

**Page catch-all** must exclude only routes that have no later corrective
entry: `/_next/*`, OG paths (`/og/*`, `/:locale/og/*`, `/home-og`), and any path
containing a `.` (static files, `*.xml`). Everything else (`/`, `/ja`,
`/posts/*`, `/ja/thinking`, page slugs, ...) is `page`.

Candidate `source` (path-to-regexp with negative lookahead — verify against the
curl matrix during implementation):

```
/:path((?!_next/)(?!(?:[a-z]{2}(?:-[a-zA-Z]+)?/)?og/)(?!home-og)(?!.*\.).*)
```

### OG handling

OG image cache TTL is per-request (primary vs fallback-translated content) — a
static `headers()` source cannot express it. So:

- OG paths are excluded from `headers()` (and from the page catch-all).
- `og-renderer.tsx` keeps its primary/fallback branch; instead of hardcoded
  strings it reads `cachePolicy.og.primary` / `cachePolicy.og.fallback` and
  applies `toHeaders()` to the `ImageResponse`.
- `home-og/route.tsx` uses `cachePolicy.og.home` the same way.

The registry stays the single source of cache *values*; OG route handlers own
only the *branch selection*.

### Route handler changes

| File                                  | Change                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `next.config.mjs`                     | Remove `browserPage/Api/Feed` constants and `pageHeaders/apiHeaders/feedHeaders`; `headers()` returns `buildHeadersConfig()` |
| `feed/route.tsx`                      | Remove the manually-set cache headers; `headers()` `feed` class governs                      |
| `[locale]/thinking/feed/route.tsx`    | Remove the manually-set cache headers                                                        |
| `[locale]/says/feed/route.tsx`        | Remove the manually-set cache headers                                                        |
| `sitemap/route.tsx`                   | No change — gains `feed` class via `headers()`                                               |
| `home-og/route.tsx`                   | Replace hardcoded header strings with `cachePolicy.og.home` + `toHeaders()`                  |
| `lib/og-renderer.tsx`                 | Replace hardcoded `cacheControl` strings with `cachePolicy.og.primary` / `og.fallback`; keep the branch |
| `robots.ts`                           | No change                                                                                    |

## Verification

Single PR: registry module + `next.config.mjs` + route handler cleanup.

Local: production build, start the server, curl the matrix and assert the
response headers:

- `/`, `/ja`, `/posts/x/y`, `/ja/thinking` -> `page` class
  (`CDN-Cache-Control: max-age=1`) — the leak is plugged.
- `/_next/static/...` -> still Next.js native `immutable`, not overridden.
- `/og/x`, `/ja/og/x`, `/home-og` -> OG route handler values, not `page` class.
- `/favicon.ico` -> native, not `page` class.
- `/feed`, `/atom.xml`, `/sitemap` -> `feed` class; `/api/healthz` -> `no-store`;
  `/api/foo` -> `api`.

The curl matrix is the sole verification of the page catch-all regex (no unit
test).

Post-deploy:

- curl production `/ja` etc. to confirm `CDN-Cache-Control: max-age=1` is sent
  and the native `s-maxage=600` leak is gone.
- **One-time Cloudflare cache purge** of the affected paths (`/ja`, other locale
  homes, `/thinking`, etc.). The previously-pinned copies carry `swr ~= 1 year`
  and will not evict on their own — purge via the Cloudflare dashboard or
  `POST /zones/:id/purge_cache`.

## Known edges (recorded, not addressed here)

- `innei_lane` cookie has no source in `apps/web/src` and there is no
  middleware — it appears to be injected at the infrastructure layer
  (Cloudflare Worker / Vercel edge). The near-realtime policy does not depend on
  it; worth a separate investigation.
- If a route ever serves per-user private content without a `Set-Cookie`, the
  `page` class `CDN-Cache-Control: max-age=1` risks 1-second cross-user leakage.
  All current pages are public content. Any such route must be moved to
  `noStore`.
