# Cache Components Migration Plan

Spec: `docs/superpowers/specs/2026-08-04-cache-components-migration-design.md` (read it for rationale; this plan is the execution order).

Repo: pnpm monorepo, app lives in `apps/web`. All paths below are relative to `apps/web/src` unless prefixed with `apps/web/`.

## Global Constraints

- **Zero code comments, zero JSDoc.** Only exceptions: a workaround for a specific external bug, or a hidden invariant a future reader would otherwise reverse. Delete any comment that merely describes what code does.
- **Commit only the files your task touches.** Never commit `apps/web/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.agents/`, or `apps/web/AGENTS.md` — they carry unrelated pre-existing changes. Stage files explicitly by path; never `git add -A` or `git add .`.
- Tasks 1–4 must keep the app valid under the CURRENT model (cacheComponents not yet enabled). The flag flips only in Task 5.
- Verification per task: `pnpm --filter @yohaku/web exec vitest run` plus `pnpm --filter @yohaku/web exec eslint --fix <touched files>`. Task 5 additionally runs `pnpm --filter @yohaku/web exec tsc --noEmit` and `pnpm --filter @yohaku/web build`.
- Wire identifiers (`shiro` slugs, socket event names, `aggregate` cache tag) must not change.
- `next/root-params` exports are typegen'd; if `locale` import from `next/root-params` lacks types, run `pnpm --filter @yohaku/web exec next typegen` first.
- Follow existing import styles (`~/` alias) and file conventions (`.server.ts` suffix).

## Task 1: Sink pure guard layouts into their pages

Two layouts fetch data only to decide `notFound()`/`permanentRedirect()` and return `children`. Move that guard logic into the corresponding pages and delete the layouts.

Files:

- `app/[locale]/posts/(post-detail)/[category]/[slug]/layout.tsx` — DELETE. Its logic (fetch via `getData(params)`, translation check via `getContentLocaleRedirect`, canonical-path `permanentRedirect` via `getContentRedirectPath`) moves into `app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx`, inside the `definePrerenderPage` `Component` (or its `fetcher`) so it runs after the page's own data fetch. The page already calls the same `getData` — reuse the single fetch result; do not fetch twice.
- `app/[locale]/notes/(note-detail)/[...path]/layout.tsx` — DELETE. Same treatment into `app/[locale]/notes/(note-detail)/[...path]/page.tsx`. Preserve exact behaviors: `unstable_rethrow`, the 403/`RequestError` pass-through (page already has a password flow — the guard's 403 branch merges into it, not duplicated), `buildNotePath`/`buildNoteSeoPath` canonical redirect including the `params.path.length === 1` SEO-path case.
- Check `app/[locale]/(page-detail)/[slug]/layout.tsx` is NOT touched here (it renders UI; Task 2 handles it).

Redirect/notFound semantics must be byte-identical: same target paths, same conditions. Existing vitest suites cover route helpers — run them.

## Task 2: Add Suspense boundaries

Part A — new `loading.tsx` files, each the same one-liner used by the existing 11 (copy the idiom from `app/[locale]/friends/loading.tsx`):

- `app/[locale]/posts/(post-list)/loading.tsx`
- `app/[locale]/notes/(note-list)/loading.tsx`
- `app/[locale]/posts/tag/[name]/loading.tsx`
- `app/[locale]/skills/[name]/loading.tsx`
- `app/[locale]/thinking/[id]/loading.tsx`
- `app/[locale]/search/loading.tsx`

Part B — data-rendering layouts get an inner `<Suspense fallback={<FullPageLoading />}>` (import from `~/components/ui/loading`) around their data-dependent subtree, because they sit above any `loading.tsx` boundary:

- `app/[locale]/(home)/layout.tsx`
- `app/[locale]/(page-detail)/[slug]/layout.tsx`
- `app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/layout.tsx`

Pattern: the layout component itself stops awaiting data; extract the awaiting part into a local `async` child component rendered inside the Suspense boundary, with `children` passed through. `definePrerenderPage` stays the wrapper of the extracted child where it is already used. Redirect logic inside the subtree is fine (redirects work from streamed content).

## Task 3: Remove segment configs, noStore, and dead code

Pure deletions; behavior under the current model is unchanged because these pages are dynamic by other means (searchParams/uncached fetches):

- `app/[locale]/posts/(post-list)/page.tsx` — delete `export const dynamic = 'force-dynamic'`
- `app/[locale]/notes/(note-list)/page.tsx` — delete `export const dynamic = 'force-dynamic'`
- `app/[locale]/auth/social-callback/page.tsx` — delete `export const dynamic = 'force-static'`
- `app/[locale]/notes/(note-detail)/[id]/api.tsx` — delete the `unstable_noStore()` call and its import
- `app/[locale]/notes/(note-detail)/slug-api.ts` — same
- `lib/attach-fetch.ts` — delete the unused `attachServerFetchDynamic` function and the `next/headers` import (verify no references first)
- `components/modules/comment/CommentRoot.tsx` — delete the commented-out `headers()` remnant lines

## Task 4: i18n via next/root-params

**Prerequisite — delete `app/layout.tsx`.** Next collects root params from layouts that have no ancestor layout (`next/dist/esm/server/lib/router-utils/route-types-utils.js` → `collectRootParamsFromLayouts`). A layout at `/` makes itself the only root layout, so `[locale]` is not a root param and `next typegen` writes "No root params detected". The existing `app/layout.tsx` is a pass-through (`return children`) that only carries `import '../styles/index.css'` and `generateViewport`; deleting it promotes `app/[locale]/layout.tsx` and `app/dev-demos/layout.tsx` (both already render their own `<html>`/`<body>`) to root layouts. Consequences:

- Extract the viewport object to `lib/seo/viewport.ts` (`DEFAULT_VIEWPORT`, same idiom as `lib/seo/robots.ts`) and re-export it as `export const viewport` from both root layouts.
- Add `import '../../styles/index.css'` to both root layouts — neither imported it before.
- Two root layouts means `locale()` is typed `Promise<string | undefined>`, which the `defaultReturn` fallback already handles.
- Route handlers outside `[locale]` (`app/feed`, `app/og/**`, `app/sitemap`, `app/llms.txt`, `app/robots.ts`, `app/api/**`) need no layout. `global-error.tsx` / `global-not-found.tsx` render their own `<html>` and are unaffected.
- Run `pnpm --filter @yohaku/web exec next typegen` afterwards and confirm `.next/types/root-params.d.ts` declares `locale()`. Typegen rewrites `next-env.d.ts` to point at `.next/types` instead of `.next/dev/types`; a subsequent `next dev` restores it — do not commit that churn.

Then:

- `i18n/request.ts`: in `getRequestConfig`, replace `await requestLocale` with the root-param getter: `import { locale as rootLocale } from 'next/root-params'`. Resolution order: use the callback's explicit `locale` when provided; else `await rootLocale()`; validate against `routing.locales`; on absent/invalid fall back to the existing `defaultReturn` (zh) — do NOT `notFound()`. Keep message-loader structure as is. The explicit-first order is load-bearing: `next/root-params` throws in Route Handlers, and `app/[locale]/{says,thinking}/feed/route.tsx` reach next-intl only via `getTranslations({ locale })`, which short-circuits the getter.
- `app/[locale]/layout.tsx`: remove the `setRequestLocale` call and import. Change `generateStaticParams` from `() => []` to return all five locales from `~/i18n/config` (`locales.map((locale) => ({ locale }))`).
- `app/global-not-found.tsx`: remove its `setRequestLocale` call and import.
- `app/[locale]/skills/[name]/page.tsx`: remove its `setRequestLocale` call and import, and drop the now-unused `locale` destructure from `await params` (`generateMetadata` in the same file still uses it).
- Verify no other `setRequestLocale` call sites remain (`rg setRequestLocale`).
- Run the full vitest suite (locale-override and message-usage tests are the sentinels) and start `next dev` briefly to confirm `/` (zh, unprefixed) and `/en` both render with correct messages.

## Task 5: Flip the flags, cache the shell, migrate route handlers

Single atomic task: the app must build green under `cacheComponents: true` at the end.

Config (`apps/web/next.config.mjs`):

- Add top-level `cacheComponents: true` and `partialPrefetching: true`.
- Add `cacheLife: { aggregate: { stale: 300, revalidate: 600, expire: 86400 } }`.
- Remove nothing else.

Shell cache:

- `app/[locale]/api.tsx` (`fetchAggregationData`): extract the fetch core into a `'use cache'` async function taking `locale` as argument, with `cacheTag('aggregate')` and `cacheLife('aggregate')` (imports from `next/cache`). Drop the `next: withCacheTag(...)` fetch option. Public signature and return type unchanged.
- `lib/helper.server.ts` (`getSiteMetadata` / `fetchSiteWebUrl`): same conversion.
- `lib/skill.server.ts`: replace `next: { revalidate: 300 }` fetch option with a `'use cache'` helper + `cacheLife` 300s (inline profile `cacheLife({ stale: 60, revalidate: 300, expire: 3600 })` or reuse a named profile).
- `app/[locale]/layout.tsx`: delete `export const revalidate = 600`.
- `app/robots.ts`, `app/llms.txt/route.ts`: replace their own tagged aggregate fetch options by calling the now-cached helpers; delete `export const dynamic` / `export const revalidate` from `llms.txt`.
- `lib/cache-tags.ts`: keep `AGGREGATE_CACHE_TAG`; `withCacheTag` may be deleted if no callers remain.

Route handlers — delete segment `revalidate`/`dynamic`/`runtime` exports and move cacheable data access into `'use cache'` helpers with `cacheLife` preserving current TTLs:

- `app/feed/route.tsx` (60s), `app/sitemap/route.tsx` (1h), `app/[locale]/says/feed/route.tsx` (24h), `app/[locale]/thinking/feed/route.tsx` (24h)
- `app/home-og/route.tsx` (24h; also change `runtime = 'edge'` to remove — nodejs default)
- all OG routes: `app/og/skill/[name]/route.tsx`, `app/og/note/[nid]/route.tsx`, `app/og/post/[category]/[slug]/route.tsx`, `app/og/page/[slug]/route.tsx`, `app/[locale]/og/note/[nid]/route.tsx`, `app/[locale]/og/post/[category]/[slug]/route.tsx`, `app/[locale]/og/page/[slug]/route.tsx` (24h each)
- `app/api/bilibili/check_live/route.ts` (10s)
- `app/skills/[name]/[...path]/route.ts` (300s)

`app/[locale]/posts/action.ts` (`revalidatePath`) and `app/api/webhook/**` stay untouched.

Verification: `tsc --noEmit`, full vitest, then `pnpm --filter @yohaku/web build` must pass. Build-time cacheComponents validation errors (uncached IO outside Suspense) are the acceptance gate. If the mx-core API is unreachable from this machine, the aggregate falls to the `PreRenderError` catch — the build should still pass; note in the report whether shells contain real data or the error fallback.

## Task 6: Post-flip verification sweep

- Re-run full vitest + `tsc --noEmit`.
- Inspect the build output: confirm the 5 locale shells exist and report whether prerendered HTML contains the site shell (not the `PreRenderError` copy) — grep `.next` prerender output for the error i18n key `api_fetchError` as the negative check.
- `rg` sweeps proving completeness: no `setRequestLocale`, no `unstable_noStore`, no `export const dynamic`/`revalidate` under `app/[locale]` pages/layouts, no `next: { revalidate` / `withCacheTag(` fetch options outside `app/api/webhook`.
- Start `next dev`, request `/`, `/en`, `/posts`, one post detail, one note detail; confirm 200s and no cacheComponents runtime errors in the log. Backend unavailability is acceptable (PreRenderError path) but must be reported.
- Fix anything these sweeps surface (within this task's scope: leftovers of Tasks 1–5 only).
