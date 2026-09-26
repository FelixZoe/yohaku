# Cache Components Migration Design

**Date:** 2026-08-04
**Scope:** `apps/web` (@yohaku/web), Next.js 16.3.0
**Goal:** Enable `cacheComponents: true` + `partialPrefetching: true` so every route serves an instantly-prefetchable static shell (Instant Navigations), while content rendering stays request-time dynamic — identical freshness behavior to today.

## Decisions (confirmed with owner)

1. **Build environment can reach mx-core** — build-time shell prerendering with real aggregate data is acceptable.
2. **Shell-only caching** — only the layout shell (aggregate site data) is cached. Post/note lists and details remain request-time dynamic, streamed under Suspense. No content tagging, no webhook redesign.
3. **One-shot migration** — flags, blockers, and all missing Suspense boundaries land together.

## Background facts (from codebase inventory)

- Only 4 segment configs exist on pages/layouts; zero `cookies()`/`draftMode()`/`connection()` calls; the only `headers()` call is dead code (`lib/attach-fetch.ts:29`, `attachServerFetchDynamic` is never called).
- `app/[locale]/api.tsx` already caches the aggregate fetch via `next: withCacheTag('aggregate', { revalidate: 600 })`; the webhook already calls `revalidateTag('aggregate', 'max')`. The migration re-expresses this as `'use cache'`; freshness semantics do not change.
- `generateStaticParams` on `[locale]/layout.tsx` currently returns `[]`; under cacheComponents root params must have ≥1 value.
- `definePrerenderPage` (`lib/request.server.ts`) awaits params/searchParams/data before returning JSX across 12 routes and injects `fetchedAt: new Date()`. All of this sits inside a dynamic hole once boundaries exist, so it stays as-is.
- pm2 runs `instances: 1`; the default in-memory `'use cache'` store is coherent for a single process.

## Section 1 — Foundation (config + i18n + shell cache)

### next.config.mjs

- Add `cacheComponents: true` and `partialPrefetching: true`.
- Define a named cache profile: `cacheLife: { aggregate: { stale: 300, revalidate: 600, expire: 86400 } }` (preserves today's 600s TTL).
- Leave `experimental.globalNotFound`, turbopack rules, and the rest untouched. `webpackBuildWorker` is inert under Turbopack; keep.

### i18n → next/root-params pattern

- `i18n/request.ts`: replace `await requestLocale` with `rootParams.locale()` (stable in Next 16.3). Invalid/absent locale falls back to the existing `defaultReturn` (zh) — preserves lenient behavior and covers paths outside `[locale]` such as `global-not-found`.
- After this, no next-intl API reads request headers: `getTranslations`/`getMessages`/`Link` become prerender-safe, including the 5 bare `getTranslations(ns)` call sites.
- Remove both `setRequestLocale` calls (`[locale]/layout.tsx`, `global-not-found.tsx`).
- `[locale]/layout.tsx` `generateStaticParams`: return all 5 locales (`zh, zh-TW, en, ja, ko`) → build prerenders 5 shells.

### Shell caching

- Extract the core of `fetchAggregationData` (`app/[locale]/api.tsx`) into a `'use cache'` function keyed by locale (argument = cache key), with `cacheTag('aggregate')` + `cacheLife('aggregate')`. Drop the fetch-level `next: withCacheTag(...)` option.
- Same treatment for `getSiteMetadata` in `lib/helper.server.ts` (feeds `getOgUrl`/`getSkillOgUrl`). The 12 layout `generateMetadata` implementations go through `buildPageMetadata` → `fetchAggregationData` and are covered by the conversion above.
- `[locale]/layout.tsx`: remove `export const revalidate = 600`; keep the `PreRenderError` catch as the runtime degradation path.
- Webhook (`app/api/webhook/**`): unchanged. `revalidateTag('aggregate', 'max')` already matches the new API; `revalidatePath` semantics are unchanged.
- Delete dead `attachServerFetchDynamic` (`lib/attach-fetch.ts`) and its `headers()` import.

## Section 2 — Route layer (content pages + route handlers)

### Segment config removal (4)

| File | Config | Action |
|---|---|---|
| `app/[locale]/layout.tsx` | `revalidate = 600` | remove (Section 1) |
| `app/[locale]/posts/(post-list)/page.tsx` | `dynamic = 'force-dynamic'` | remove; dynamism follows from `searchParams` |
| `app/[locale]/notes/(note-list)/page.tsx` | `dynamic = 'force-dynamic'` | remove; same |
| `app/[locale]/auth/social-callback/page.tsx` | `dynamic = 'force-static'` | remove; pure client component |

Also delete both `unstable_noStore()` calls (`notes/(note-detail)/[id]/api.tsx`, `notes/(note-detail)/slug-api.ts`) — content is uncached anyway.

### Suspense boundaries

- Existing 11 `loading.tsx` files are the route-level boundaries; unchanged.
- Add `loading.tsx` (one-liner `FullPageLoading`, same idiom) to: `posts/(post-list)`, `notes/(note-list)`, `posts/tag/[name]`, `skills/[name]`, `thinking/[id]`, `search`.
- Data-rendering layouts sit above any `loading.tsx` boundary, so they get an inner `<Suspense fallback={<FullPageLoading />}>` around their data-dependent subtree instead: `(home)/layout.tsx` (top-5 aggregate), `(page-detail)/[slug]/layout.tsx` (page data + providers + comment area), `(note-topic)/notes/(topic-detail)/series/[slug]/layout.tsx` (topic query + hydration). Their redirect logic stays inside the suspended subtree (redirects work from streamed content).

### Pure guard layouts (sink into pages)

`posts/(post-detail)/[category]/[slug]/layout.tsx` and `notes/(note-detail)/[...path]/layout.tsx` fetch data only to decide `notFound()`/`permanentRedirect()` and return `children` untouched. Fetching above the boundary would block the shell, so move the guard logic into the corresponding pages (which already fetch the same data — this also removes the duplicate fetch) and delete the layouts. The note guard's 403/password special case merges into the page's existing password flow. Neither guard layout has `generateMetadata`; the pages keep theirs, and since detail pages are dynamic, that metadata streams — which is allowed.

### `definePrerenderPage` — no changes

Awaiting params/searchParams and `fetchedAt: new Date()` occur inside a dynamic hole; legal under cacheComponents. All 12 consumers untouched.

### Route handlers (mechanical migration)

For `feed`, `sitemap`, `llms.txt`, `says/feed`, `thinking/feed`, `home-og`, all 7 `og/**` routes, `api/bilibili/check_live`, `skills/[name]/[...path]`:

- Delete segment `revalidate` / `dynamic` exports.
- Extract data access into `'use cache'` helpers with `cacheLife` matching current values (10s / 60s / 300s / 1h / 24h).
- Aggregate-derived handlers (`robots.ts`, `llms.txt`) reuse the cached `getSiteMetadata` from Section 1.
- `home-og`: change `runtime = 'edge'` to nodejs (edge segment config is incompatible; peer og routes are already nodejs).
- `lib/skill.server.ts` fetch with `next: { revalidate: 300 }` → `'use cache'` helper.

`posts/action.ts` (`revalidatePostList` via `revalidatePath`) stays — unchanged semantics, harmless.

## Section 3 — Risks, verification, rollback

### Risks

1. **next-intl has no official cacheComponents support** ([#1493](https://github.com/amannn/next-intl/issues/1493)). We rely on the community-proven root-params pattern (works on 16.2+). If `next-intl@4.13.4` still has a `Link`-reads-headers path ([#2229](https://github.com/amannn/next-intl/issues/2229)), it surfaces immediately in dev; fallback is disabling the flags.
2. **Build requires mx-core availability (hard).** Confirmed during implementation: when the API is down, `[locale]/layout.tsx` takes its `PreRenderError` early-return, which skips `children` — content pages then contribute no dynamic hole, and the instant-navigation validation fails the build on every route whose `generateMetadata` reads an unenumerated param ("metadata is the only dynamic part of an otherwise fully prerenderable route"). Consequence (accepted by owner): builds hard-fail when the API is unreachable instead of baking error shells. This replaces the previously planned post-build smoke check — the build itself is now the gate against bad shells.
3. **`localePrefix: 'as-needed'`**: zh is unprefixed; the root param value relies on the `proxy.ts` rewrite. Dev verification must cover both unprefixed (`/`, `/posts`) and prefixed (`/en/...`) paths.
4. **Single-process in-memory cache**: fine with `instances: 1`. If pm2 ever moves to cluster mode, a shared cache handler becomes mandatory (documented constraint, no work now).

### Verification

- `next build` green — cacheComponents validation runs at build; stray uncached IO fails there.
- Existing vitest suites green (route helpers, locale override, message-usage).
- Manual dev pass: home, post/note detail, list pagination, password-protected note, locale switching, shell update after webhook `AGGREGATE_UPDATE`. Use DevTools Instant Insights to spot slow navigations.
- Lint scoped to changed files only.
- `@next/playwright` `instant()` regression tests: deferred (YAGNI).

### Rollback

Single commit carries the flags; revert restores the old model. No data migration, nothing irreversible.
