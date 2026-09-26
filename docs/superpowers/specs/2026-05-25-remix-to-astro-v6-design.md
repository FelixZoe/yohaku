# Migration Spec — React Router 7 → Astro v6

**Date:** 2026-05-25
**Scope:** `apps/web` (`@yohaku/web`)
**Status:** Proposed
**Approach:** B — Astro pages + persistent React islands

## 1. Goal & Non-Goals

### Goal

Replace the React Router 7 Framework Mode SSR app at `apps/web` with an Astro v6
app that:

1. Server-renders all static chrome (HTML head, meta, JSON-LD, fonts, footer
   markup) directly in Astro — no React for non-interactive surfaces.
2. Mounts React islands only where interactivity is required (page bodies,
   global runtime, editors, drawers).
3. Preserves the current product UX: SPA-like navigation (View Transitions +
   ClientRouter), persistent socket connection, per-locale routing, all current
   resource routes (sitemap, feed, og, webhook, healthz, robots).
4. Reuses the existing component library and `data/content.server.ts` loaders
   with minimal surgery.

### Non-Goals

- Visual or UX changes. This is a framework migration, not a redesign.
- Replacing TanStack Query / Jotai / Socket.IO / Lexical / Excalidraw.
- Splitting `apps/web` into multiple apps.
- Changing the API surface (`@mx-space/api-client`, gateway, webhook contract).
- Switching the deployment model (still Node SSR via PM2 / Docker, port 2323).
- Rewriting `packages/design-system`. Tokens stay where they are.

## 2. Current Architecture (baseline)

- React Router 7 Framework Mode, `ssr: true`, `appDirectory: 'src'`,
  `routeDiscovery: 'initial'`, `v8_middleware: true`.
- `src/root.tsx` owns `<html>`, fonts, JSON-LD, shell loader (aggregate fetch),
  global runtime (socket, hydration detector, chunk-error guard).
- Convention-based routes scanned from `src/routes/(site)/**` and
  `src/routes/(resources)/**` (see `route-conventions.ts` + `route-scanner.ts`).
- 53 route entries (page.tsx / route.ts / layout.tsx) + 867 ts/tsx files in
  `src/`.
- `data/content.server.ts` (4266 lines) — single server-only data module.
- Locale strategy: `zh` default, prefixed locales `en | ja | ko | zh-TW`.
- Resource routes: sitemap, feed, robots.txt, favicon.ico, home-og, webhook,
  healthz, bilibili check-live, per-content OG endpoints, per-locale feed.
- Real-time: Socket.IO with `useRevalidator` + `useNavigate` driving route
  revalidation on backend events.
- Client state: Jotai atoms, TanStack Query with dehydrate/hydrate per page,
  context providers for current note/post.

## 3. Target Architecture

```
apps/web/                              (replaces existing in place; new branch)
├── astro.config.ts
├── src/
│   ├── pages/                         Astro pages (.astro)
│   │   ├── index.astro                home shell
│   │   ├── posts/index.astro
│   │   ├── posts/[category]/[slug].astro
│   │   ├── notes/[...path].astro
│   │   ├── [...path].astro            page-detail catch-all
│   │   ├── [lang]/...                 mirror tree for prefixed locales
│   │   ├── api/                       API endpoints (former resource routes)
│   │   │   ├── sitemap.xml.ts
│   │   │   ├── feed.xml.ts
│   │   │   ├── robots.txt.ts
│   │   │   ├── healthz.ts
│   │   │   ├── webhook.ts
│   │   │   ├── home-og.png.ts
│   │   │   ├── og/note/[nid].png.ts
│   │   │   ├── og/page/[slug].png.ts
│   │   │   └── og/post/[category]/[slug].png.ts
│   │   └── ...
│   ├── layouts/
│   │   ├── RootLayout.astro           <html>, fonts, ClientRouter, shell injection
│   │   └── SiteLayout.astro           header + footer scaffold + slot
│   ├── islands/                       React entry points for islands
│   │   ├── GlobalRuntime.tsx          persistent — socket, jotai, query, providers
│   │   ├── SiteHeader.tsx             persistent — header chrome with interactivity
│   │   ├── PageDetailIsland.tsx       page-level islands
│   │   ├── PostDetailIsland.tsx
│   │   ├── NoteDetailIsland.tsx
│   │   └── ...
│   ├── middleware.ts                  Astro middleware — i18n + shell + headers
│   ├── components/                    unchanged React components (reused)
│   ├── data/                          unchanged — content.server.ts + friends
│   ├── seo/                           meta helpers, ported to plain TS
│   ├── i18n/                          config + messages (react-i18next stays
│   │                                  inside islands; remix-i18next removed)
│   ├── styles/                        unchanged
│   └── env.d.ts                       Astro types
└── package.json
```

### 3.1 Rendering Model

| Surface | Renderer | Why |
|---|---|---|
| `<html>`, `<head>`, meta, JSON-LD, fonts, theme color | Astro | Pure static / server data; no React needed |
| Global runtime (socket, jotai store, query client, theme provider, i18next instance, toaster) | React island, `client:load`, `transition:persist="global-runtime"` | One persistent React tree spans navigations; owns all cross-page client state |
| Header (theme switch, locale switch, command-palette trigger, sticky behaviors) | React island, `client:load`, `transition:persist="site-header"` | Needs DOM event handlers + animation, persistent through nav |
| Footer scaffold | Astro slot | Mostly static; small interactive bits hydrate inside |
| Page body (post / note / page / thinking / says / search / projects / friends / timeline / categories / tag / series) | React island, `client:load`, **not** persistent (re-mounts on nav) | Each page owns its own React tree; receives loader data via island props |
| Resource routes (sitemap, feed, og, webhook, healthz) | Astro API endpoints | One-to-one map from existing `route.ts` loaders |

### 3.2 Why one persistent global island

The current app's client state crosses every page: socket connection, jotai
atoms (owner status, scroll, drawer, theme), TanStack Query cache, react-i18next
instance, sonner toaster portal, modal stack, command palette. If each page
island were independent, every nav would tear down and re-establish these.
Instead, a single `<GlobalRuntime client:load transition:persist="global-runtime">`
lives in the root layout. View Transitions + `transition:persist` keep that
island alive across page swaps, so cross-page client state survives.

The persistent island renders **no visible content** — it owns `<Toaster/>`,
mounts socket effects, runs revalidators, exposes context providers to page
islands via a small bridge. Each page island then uses the same global stores
because they share the module-level singletons (jotai store, query client) that
the global runtime initialized.

### 3.3 Cross-island state

React islands can't share a React tree, but they can share module-level
singletons because they all import from the same bundle.

- **Jotai:** export a singleton store from `src/lib/jotai-store.ts`; every
  island wraps with `<Provider store={...}>` pointing at it. Reads/writes hit
  the same store.
- **TanStack Query:** export a singleton `queryClient` from
  `src/lib/query-client.ts`; every island wraps with
  `<QueryClientProvider client={queryClient}>`. Per-page dehydrated state is
  passed as an island prop and rehydrated on mount via `HydrationBoundary`.
- **i18next:** export a singleton instance from `src/i18n/instance.ts`; every
  island wraps with `<I18nextProvider i18n={instance}>`. Locale + initial
  resources injected by Astro middleware via `Astro.locals`.
- **Modal / drawer stack:** lives entirely in the global runtime island via
  React Portal into a fixed slot in `RootLayout.astro`. Pages dispatch via
  jotai atoms.

### 3.4 Navigation

- View Transitions: `<ClientRouter />` in `RootLayout.astro` `<head>`.
- This gives SPA-like nav with no full reload, View Transitions animations
  where supported, falls back to standard nav otherwise.
- `transition:persist="global-runtime"` and `transition:persist="site-header"`
  keep those islands mounted across navs.
- Current `useNavigate` calls in page components stay valid: a thin shim in
  `src/lib/navigation.ts` calls `astro:transitions/client`'s `navigate()`
  function. Same shim re-exports `useLocation` as a wrapper around
  `astro:before-preparation` / `astro:after-swap` events feeding a jotai atom.
- Current `useRevalidator` calls (e.g. socket-triggered revalidation) are
  rewired to call `navigate(location.href, { history: 'replace' })` which
  Astro re-runs server-side data fetching for and swaps the body.

### 3.5 Data flow per page

```
   Request
      │
      ▼
Astro middleware
  - resolve locale from URL prefix (or default 'zh')
  - run i18next init with detected locale, attach to Astro.locals.i18n
  - run loadSiteShell(locale) once per request, attach to Astro.locals.shell
  - apply cache headers
      │
      ▼
Astro page (.astro)
  - frontmatter: const data = await loadPostList({ ...Astro.params, ...searchParams, locale })
  - reads shell from Astro.locals
  - renders <head> meta with buildYohakuMeta(...)
  - renders persistent islands once (root layout)
  - renders page island with data prop + dehydrated query state prop
      │
      ▼
HTML response + page island hydrates on client:load
```

### 3.6 Resource routes (1:1 map)

| Current (`route.ts`) | New (Astro API) |
|---|---|
| `(resources)/sitemap/route.ts` | `pages/api/sitemap.xml.ts` returning `new Response(xml, { headers })` from `GET` |
| `(resources)/feed/route.ts` | `pages/api/feed.xml.ts` |
| `(resources)/robots.txt/route.ts` | `pages/api/robots.txt.ts` |
| `(resources)/favicon.ico/route.ts` | `pages/api/favicon.ico.ts` |
| `(resources)/home-og/route.ts` | `pages/api/home-og.png.ts` (returns @vercel/og response) |
| `(resources)/api/healthz/route.ts` | `pages/api/healthz.ts` |
| `(resources)/api/webhook/route.ts` | `pages/api/webhook.ts` (POST handler) |
| `(resources)/api/bilibili/check_live/route.ts` | `pages/api/bilibili/check_live.ts` |
| `(site)/(resources)/og/post/[category]/[slug]/route.ts` | `pages/api/og/post/[category]/[slug].png.ts` |
| `(site)/(resources)/og/note/[nid]/route.ts` | `pages/api/og/note/[nid].png.ts` |
| `(site)/(resources)/og/page/[slug]/route.ts` | `pages/api/og/page/[slug].png.ts` |
| `(site)/(resources)/thinking/feed/route.ts` | `pages/api/thinking/feed.xml.ts` |
| `(site)/(resources)/says/feed/route.ts` | `pages/api/says/feed.xml.ts` |

Astro API endpoints export `GET`, `POST`, etc. as named functions. They return
`Response` objects identically to the current loaders, so handler bodies move
across nearly verbatim (only the function signature changes).

### 3.7 i18n

- Astro built-in i18n with:
  ```ts
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja', 'ko', 'zh-TW'],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: true },
  }
  ```
- This replaces both the `discoverRoutes` per-locale duplication and the
  `default-locale.tsx` redirect route — Astro handles `/zh/foo` →
  `/foo` redirects natively.
- `remix-i18next` is removed. `react-i18next` stays for client rendering.
- Server-side translation: Astro middleware creates an i18next instance per
  request, loads messages for the detected locale, and stashes both
  `instance.getResource` results and the locale on `Astro.locals.i18n`.
- The persistent global-runtime island receives `{ locale, resources }` props
  and hydrates a singleton `react-i18next` instance from that.
- All existing `useTranslation` calls inside React components keep working.

### 3.8 Convention routing

The current `route-scanner.ts` / `route-conventions.ts` is deleted. Astro's
file-system routing replaces it:

- `routes/(site)/(content)/posts/page.tsx` → `pages/posts/index.astro`
- `routes/(site)/(content)/[slug]/page.tsx` → `pages/[slug].astro` (with
  rest-spec ambiguity check: see 5.1)
- `routes/(site)/(content)/notes/[...path]/page.tsx` →
  `pages/notes/[...path].astro`
- `routes/(site)/(content)/posts/[category]/[slug]/page.tsx` →
  `pages/posts/[category]/[slug].astro`

`route.aliases.json` sidecars become Astro `redirects` config entries in
`astro.config.ts`.

### 3.9 Build pipeline

- `pnpm dev` → `astro dev --port 2323`
- `pnpm build` → `astro build` (outputs `dist/server` + `dist/client`)
- `pnpm start` → `node ./dist/server/entry.mjs` (Astro Node adapter,
  `mode: 'standalone'`)
- Docker: `Dockerfile` swap CMD to run Astro standalone server
- PM2: `ecosystem.config.js` point at Astro standalone entry
- Turbo: `turbo.json` task graph unchanged (still `build`/`dev`/`lint`)
- Tailwind v4: `@tailwindcss/vite` works under Astro's Vite; tokens stay in
  `packages/design-system`

## 4. Out of Scope / Deferred

- **Per-page islands optimization** (splitting page island into smaller
  sub-islands for ship-less-JS). Phase 2 work after baseline parity.
- **Static prerendering** (`prerender = true` per page). Some pages (about,
  friends list cached, OG endpoints) could be static; deferred until parity.
- **Edge runtime**. Astro supports it; not pursued because current deploy is
  Node + PM2.
- **MDX content collections**. Stays on remote API; no file-based content.
- **Tests**. `routes-baseline.test.ts` becomes irrelevant and is deleted.

## 5. Migration Plan

### 5.1 Phase 0 — Scaffold (no behavior change)

- Branch `refactor/astro` off `refactor/remix`.
- Add `apps/web-astro` workspace package, copy `src/components`,
  `src/data`, `src/styles`, `src/i18n` (config + messages only), `src/atoms`,
  `src/queries`, `src/lib`, `src/seo`, `src/models`, `src/socket`,
  `src/providers`, `src/constants`, `src/events`, `src/hooks`, `src/types`.
- Set up `astro.config.ts` with `@astrojs/react`, `@astrojs/node` (standalone),
  Tailwind v4, alias `~` → `./src`, i18n config.
- Build a minimal `RootLayout.astro` + `index.astro` that renders
  `<GlobalRuntime />` + a placeholder. Confirm SSR + hydrate works.
- Done when: `astro dev` boots, `astro build` succeeds, an empty home page
  loads with global runtime island hydrated.

### 5.2 Phase 1 — Resource routes

- Port all 13 resource routes (sitemap, feed, og, webhook, healthz, etc.) to
  `pages/api/**`. These are leaf-isolated; do them first to flush out the
  server-side dependency surface.
- Wire `loadSiteShell`, `loadSitemapXml`, `loadFeedXml`, OG renderers without
  any React.

### 5.3 Phase 2 — Middleware + shell

- Implement `src/middleware.ts`: locale resolution, i18next bootstrapping,
  shell data loading, cache headers, `Astro.locals` typing.
- Implement `RootLayout.astro` with full `<head>`: fonts, meta, JSON-LD, theme
  color, custom CSS/JS injection, persistent islands.
- Implement `GlobalRuntime` island: socket runtime, jotai store provider,
  query client provider, i18next provider, sonner Toaster, modal/drawer host,
  command palette host.
- Implement `SiteHeader` persistent island.
- Page islands not yet wired — pages render placeholders.

### 5.4 Phase 3 — Page migration (route-by-route)

Order roughly by lift-and-shift complexity (simple → complex):

1. Static pages: `auth/social-callback`, `common/deleted`, `(dev)/*`
2. List pages: `friends`, `says`, `thinking`, `timeline`, `notes`,
   `notes/series`, `posts`, `categories/[slug]`, `posts/tag/[name]`,
   `posts/[category]`
3. Detail pages: `[slug]`, `posts/[category]/[slug]`, `notes/[slug]`,
   `notes/[...path]`, `thinking/[id]`, `notes/series/[slug]`
4. Home page + projects (composite layouts)
5. Search page (interactive, query-heavy)

Each page: convert `loader` body → Astro frontmatter `await load*(...)`,
convert `meta` → `<head>` rendering inline, mount page island with same
component as before, pass `loaderData` + `queryState` as props. Existing
ErrorBoundary becomes `<ErrorBoundary />` React boundary inside the island
plus a top-level `try/catch` in frontmatter for 404/500 fallback rendering.

**Ambiguity check (5.1 → `pages/[slug].astro`):** The current
`(content)/[slug]/page.tsx` matches any single-segment URL not consumed by
sibling literal routes (`posts`, `notes`, `thinking`, ...). Astro's file
router resolves literals before dynamic segments, so `pages/[slug].astro`
should match the same shape. Verified by listing the literal-named pages in
`pages/` and ensuring `[slug].astro` is the only single-segment dynamic.

### 5.5 Phase 4 — Replace `apps/web`

- Delete React Router `apps/web/`, rename `apps/web-astro` → `apps/web`.
- Update `package.json` workspaces, `turbo.json`, Dockerfile,
  `ecosystem.config.js`, GitHub Actions.
- Update `CLAUDE.md` Architecture section to reflect Astro.
- Drop `routes-baseline.test.ts` and `check-structure.mjs` (or rewrite for
  the new layout).

### 5.6 Phase 5 — Cleanup

- Remove unused deps: `react-router`, `react-router-dom`, `@react-router/*`,
  `remix-i18next`, `isbot` (Astro handles bot detection differently if
  needed), `@fastify/*` if `start:fastify` is dropped.
- Add: `astro`, `@astrojs/react`, `@astrojs/node`, `@astrojs/tailwind` (or
  keep `@tailwindcss/vite`).

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `transition:persist` islands lose state if Astro can't match the persist key (e.g. on hard reload) | Socket reconnects, modals close on nav | Test thoroughly in Phase 2; accept hard-reload reset as acceptable |
| TanStack Query dehydrate/hydrate per page needs care to avoid double-fetch | Wasted requests | Use `HydrationBoundary` inside each page island, query keys match server |
| View Transitions browser support varies | Falls back to plain nav | Acceptable; Astro handles gracefully |
| `react-router` hooks (`useNavigate`, `useLocation`, `useRevalidator`, `useParams`, `useSearchParams`, `useFetcher`) called inside components | Compile error after migration | Search-and-replace with shim in `src/lib/navigation.ts`; `grep` first to scope (only 9 files touched per current count, but many more from `react-router-dom` package) |
| `useRouteLoaderData('root')` callsites | Need a replacement | Provide `useSiteShell()` hook reading from a jotai atom seeded by `GlobalRuntime` from props |
| Lexical / Excalidraw SSR breakage in Astro | Bundle errors | Mark these islands `client:only="react"` so they never SSR |
| Markdown rendering currently runs through `markdown-to-jsx` (React) inside SSR — works in Astro because it runs inside the page island during SSR | Should be OK | Verify Phase 3 |
| Custom CSS / JS injection from `ThemeCustomHead` (script tag with `dangerouslySetInnerHTML`) | Need Astro equivalent (`set:html`) | Trivial port |
| Cache headers (`resolveRouteCacheHeaders` from middleware) | Re-implement in Astro middleware | Direct port; same Request/Response shape |
| Webhook signature verification + bilibili check-live use Node-only APIs | Need adapter mode 'standalone' with Node adapter | Default Astro Node adapter supports this |
| Per-locale routing currently builds separate route configs with id-prefixed entries | Astro `prefixDefaultLocale: false` + `redirectToDefaultLocale: true` handles this differently | Verify in Phase 2 that `/zh/foo` → `/foo` redirect works as expected, and `/en/foo` resolves to the same page tree |

## 7. Open Questions (deferred to implementation)

1. Should the page island be a single `client:load` per page, or split into
   sub-islands (Phase 2 optimization)? **Defer to post-parity.**
2. Should we keep the Fastify start script (`start:fastify`) or rely on
   Astro's Node adapter exclusively? **Default to Astro adapter only.**
3. Do we want `prerender = true` for any pages (about, deleted, dev pages)?
   **Defer to post-parity.**
4. Drop `code-inspector-plugin` Vite plugin? **Keep behind Astro's Vite
   config if compatible; drop otherwise.**

## 8. Acceptance Criteria

- `pnpm dev` boots Astro dev server on port 2323.
- `pnpm build` produces a standalone Node server bundle.
- All current URLs (root, locale-prefixed, content, resources) return
  byte-equivalent (or visually identical) responses.
- Socket-driven revalidation triggers a page swap with the latest content.
- Locale switch (header) navigates between `/posts` ↔ `/en/posts` etc.
- All current resource endpoints return identical content-type + body shape.
- Lighthouse score on home page ≥ current baseline (no regression).
- No `react-router` imports remain anywhere in the source tree.

## 9. Reference Mapping (RR7 → Astro v6)

| RR7 concept | Astro v6 equivalent |
|---|---|
| `root.tsx` `Layout` | `layouts/RootLayout.astro` |
| `root.tsx` `meta` | inline `<head>` in `RootLayout.astro` + per-page `<Fragment slot="head">` |
| Route `loader` | Astro frontmatter `await ...` |
| Route `meta` | inline `<head>` in the `.astro` page (or per-island helper) |
| Route `middleware` | `src/middleware.ts` |
| `useRouteLoaderData('root')` | `useSiteShell()` hook reading jotai atom seeded by `GlobalRuntime` |
| `useLoaderData()` | island prop |
| `useNavigate()` | `navigate()` from `astro:transitions/client` (via `~/lib/navigation`) |
| `useLocation()` | jotai atom updated by `astro:before-preparation` listeners |
| `useRevalidator()` | `navigate(location.href, { history: 'replace' })` shim |
| `useParams()` | island prop (Astro reads from `Astro.params` and passes through) |
| `useSearchParams()` | island prop initial + window.location.search on client |
| `ErrorBoundary` (route export) | per-island React `<ErrorBoundary>` + Astro `try/catch` in frontmatter |
| `route.ts` (resource) | `pages/api/...ts` with `GET`/`POST` named exports |
| `route.aliases.json` | `redirects` entry in `astro.config.ts` |
| `routes.ts` + `route-conventions.ts` | (deleted — Astro file routing) |
| `shouldRevalidate` | Astro re-runs frontmatter on nav; no analog needed |
| `Future.v8_middleware` | Astro middleware (always available) |

## 10. Fallback Plan

If Phase 2 (persistent island + cross-island state) proves unworkable, fall
back to **Approach A** (single root React island containing the original
React Router app). This is a strictly-larger superset of code reuse and can be
done by deleting `pages/*.astro` and mounting one big `<App />` from
`RootLayout.astro`. Phase 1 (resource routes) and Phase 0 (scaffold) are
preserved either way.
