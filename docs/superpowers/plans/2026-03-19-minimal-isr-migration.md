# Minimal ISR Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Shiroi's public web pages from request-coupled SSR toward safe Next.js ISR without regressing user-authenticated behavior, locale handling, or password-protected content.

**Architecture:** Split server data access into two lanes: a public cacheable lane with no per-request cookies/UA/IP coupling, and a request-bound lane that preserves current behavior for logged-in or sensitive flows. Migrate aggregation and public detail fetchers to `unstable_cache` plus cache tags first, then wire webhook invalidation, and only after that remove `force-dynamic` from eligible routes.

**Tech Stack:** Next.js 16 App Router, `next/cache`, `next-intl`, `ofetch`, `@mx-space/api-client`, pnpm

---

## Scope

This plan intentionally excludes the large structural rewrites bundled in `/Users/innei/Downloads/refactor-isr.patch`:

- `preview/page-client.tsx`
- `projects/page-client.tsx`
- friends/thinking/timeline client-shell refactors
- dashboard/build compatibility edits unrelated to caching

Those can be evaluated later. The goal here is the smallest safe ISR path for public content.

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/lib/cache.ts` | Create | Central cache tags and revalidation helpers |
| `apps/web/src/lib/fetch/static.server.ts` | Create | Public no-cookie fetch client for cacheable server calls |
| `apps/web/src/app/[locale]/api.tsx` | Modify | Aggregate/site data caching by locale |
| `apps/web/src/app/[locale]/(page-detail)/[slug]/api.ts` | Modify | Public page detail cache |
| `apps/web/src/app/[locale]/notes/(note-detail)/[id]/api.tsx` | Modify | Note detail cache with `noStore()` escape hatch for passworded requests |
| `apps/web/src/app/[locale]/notes/(note-detail)/slug-api.ts` | Modify | Slug-date note cache with `noStore()` escape hatch |
| `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/api.tsx` | Modify | Post detail cache keyed by locale/category/slug |
| `apps/web/src/app/api/webhook/route.ts` | Modify | Trigger tag/path invalidation on content events |
| `apps/web/src/app/api/webhook/revalidate-aggregate.ts` | Modify | Keep path invalidation aligned with ISR coverage |
| `apps/web/src/app/feed/route.tsx` | Modify | Remove request-coupled API client usage from feed generation |
| `apps/web/src/app/sitemap/route.tsx` | Modify | Replace query-client SSR fetch with cacheable fetch |
| `apps/web/src/app/[locale]/says/feed/route.tsx` | Modify | Use static client and remove unnecessary `force-dynamic` |
| `apps/web/src/app/[locale]/thinking/feed/route.tsx` | Modify | Use static client and remove unnecessary `force-dynamic` |
| `apps/web/src/app/[locale]/layout.tsx` | Modify later | Remove request-bound auth fetch before enabling ISR |
| `apps/web/src/components/layout/root/Root.tsx` | Modify later | Pass locale only if layout changes require it |
| `apps/web/src/components/layout/footer/Footer.tsx` | Modify later | Locale-safe aggregate fetch if layout becomes static |
| `apps/web/src/components/layout/footer/FooterInfo.tsx` | Modify later | Locale-safe aggregate fetch if layout becomes static |
| `apps/web/src/providers/root/script-inject-provider.tsx` | Modify later | Locale-safe aggregate fetch if layout becomes static |
| `apps/web/src/proxy.ts` | Modify optional | Preserve `.html` legacy article routes through intl middleware |

## Dependency Order

```text
public fetch lane
   |
   v
cache tags + cached fetchers
   |
   v
webhook invalidation
   |
   v
feed/sitemap cleanup
   |
   v
route-level ISR flags
```

## Chunk 1: Public Fetch Lane And Cache Primitives

### Task 1: Introduce Public Cache Helpers

**Files:**
- Create: `apps/web/src/lib/cache.ts`
- Create: `apps/web/src/lib/fetch/static.server.ts`
- Modify: `apps/web/src/app/api/webhook/revalidate-aggregate.ts`

- [ ] **Step 1: Create cache tags and helper functions**

Add `apps/web/src/lib/cache.ts` with:

- `AGGREGATION_CACHE_TAG`
- `PUBLIC_CONTENT_CACHE_TAG`
- locale-aware helper for `revalidatePath`
- `revalidatePublicSite()` that invalidates:
  - locale layout/home shell paths that are actually made static
  - `/feed`
  - `/sitemap`
  - locale feed/timeline paths if they later move to ISR

- [ ] **Step 2: Create a public static API client**

Add `apps/web/src/lib/fetch/static.server.ts` that builds an API client from bare `ofetch` instead of `apps/web/src/lib/fetch/fetch.server.ts`.

Requirements:

- no `cookies()`
- no `headers()`
- no automatic request `no-store`
- still server-only

- [ ] **Step 3: Align existing path revalidation helper with the new helper**

Update `apps/web/src/app/api/webhook/revalidate-aggregate.ts` to:

- keep current locale-path invalidation behavior
- avoid duplicating path lists in multiple places
- optionally delegate to helpers from `lib/cache.ts`

- [ ] **Step 4: Verify the new helper files type-check logically**

Run:

```bash
pnpm -C apps/web exec tsc --noEmit
```

Expected:

- no import cycle
- no `server-only` misuse

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/cache.ts apps/web/src/lib/fetch/static.server.ts apps/web/src/app/api/webhook/revalidate-aggregate.ts
git commit -m "feat(web): add public cache primitives"
```

## Chunk 2: Cache Public Content Fetchers

### Task 2: Cache Aggregation Data By Locale

**Files:**
- Modify: `apps/web/src/app/[locale]/api.tsx`
- Reference: `apps/web/src/lib/server-api-fetch.ts`
- Reference: `apps/web/src/app.static.config.ts`

- [ ] **Step 1: Replace ad hoc `fetch(..., next.revalidate)` with `unstable_cache`**

Update `apps/web/src/app/[locale]/api.tsx` so that:

- cache key includes locale
- response is tagged with `AGGREGATION_CACHE_TAG` and `PUBLIC_CONTENT_CACHE_TAG`
- current theme merge behavior is preserved
- current locale resolution logic stays intact

Do not regress:

- `resolveLocaleOverride(...)`
- optional `revalidate` override support unless clearly unused
- `categories` / `pageMeta` compatibility shaping

- [ ] **Step 2: Keep public aggregate fetches off the request-bound client**

Prefer:

- `fetchServerApiJson(...)` if it can remain request-agnostic for this path, or
- `staticApiClient` if that results in clearer separation

Do not use the current request-bound `apiClient` path if it would inherit cookies or request headers.

- [ ] **Step 3: Verify aggregate caching still returns the same payload shape**

Run:

```bash
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web build:ci
```

Expected:

- metadata consumers still type-check
- no static generation error from locale aggregate fetches

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/api.tsx
git commit -m "feat(web): cache aggregation data for isr"
```

### Task 3: Cache Public Page, Note, And Post Detail Fetchers

**Files:**
- Modify: `apps/web/src/app/[locale]/(page-detail)/[slug]/api.ts`
- Modify: `apps/web/src/app/[locale]/notes/(note-detail)/[id]/api.tsx`
- Modify: `apps/web/src/app/[locale]/notes/(note-detail)/slug-api.ts`
- Modify: `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/api.tsx`

- [ ] **Step 1: Convert page detail fetch to `unstable_cache`**

For `apps/web/src/app/[locale]/(page-detail)/[slug]/api.ts`:

- remove `attachServerFetch()`
- replace React `cache()` with `unstable_cache`
- tag with `PUBLIC_CONTENT_CACHE_TAG`
- use `appStaticConfig.cache.ttl.aggregation` as revalidate window

- [ ] **Step 2: Convert note detail fetchers, with explicit private-content escape hatches**

For note-by-id and note-by-slug fetchers:

- cache only when no password is supplied
- call `unstable_noStore()` when password is present
- keep `lang=original` behavior
- preserve `requestErrorHandler`

- [ ] **Step 3: Convert post detail fetcher**

For post detail:

- cache by `category`, `slug`, and resolved language
- preserve current translated/original behavior
- if the upstream API can 404 on translated lookups, keep a fallback path to untranslated fetch if needed

- [ ] **Step 4: Build-check all public detail pages**

Run:

```bash
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web build:ci
```

Expected:

- post/page/note metadata functions still compile
- no use of dynamic request headers in newly cached fetchers

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/(page-detail)/[slug]/api.ts apps/web/src/app/[locale]/notes/(note-detail)/[id]/api.tsx apps/web/src/app/[locale]/notes/(note-detail)/slug-api.ts apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/api.tsx
git commit -m "feat(web): cache public detail fetchers"
```

## Chunk 3: Wire Revalidation To Real Content Events

### Task 4: Invalidate Cache Tags From Webhook Events

**Files:**
- Modify: `apps/web/src/app/api/webhook/route.ts`
- Reference: `apps/web/src/lib/cache.ts`

- [ ] **Step 1: Extend webhook invalidation to tag-based cache**

Update `apps/web/src/app/api/webhook/route.ts` so content mutations call `revalidatePublicSite()`.

Event coverage:

- `NOTE_CREATE`, `NOTE_UPDATE`, `NOTE_DELETE`
- `POST_CREATE`, `POST_UPDATE`, `POST_DELETE`
- `PAGE_CREATE`, `PAGE_UPDATE`, `PAGE_DELETE`
- `SAY_CREATE`, `SAY_UPDATE`, `SAY_DELETE`

- [ ] **Step 2: Preserve current JSON response shape for operational visibility**

Do not regress:

- signature validation
- `health_check`
- current success response detail from path invalidation

- [ ] **Step 3: Verify webhook module still builds**

Run:

```bash
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web build:ci
```

Expected:

- no server action/runtime import errors from `next/cache`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/webhook/route.ts
git commit -m "feat(web): revalidate public isr cache from webhook"
```

## Chunk 4: Remove Request-Coupled Fetches From Feed And Sitemap Routes

### Task 5: Switch Feed And Sitemap Routes To Public Fetching

**Files:**
- Modify: `apps/web/src/app/feed/route.tsx`
- Modify: `apps/web/src/app/sitemap/route.tsx`
- Modify: `apps/web/src/app/[locale]/says/feed/route.tsx`
- Modify: `apps/web/src/app/[locale]/thinking/feed/route.tsx`

- [ ] **Step 1: Replace request-bound `apiClient` usage with the public fetch lane**

For feed routes:

- prefer `staticApiClient`
- keep current revalidate values
- remove `dynamic = 'force-dynamic'` where the route no longer reads request-bound state

For sitemap:

- remove `getQueryClient()` usage
- fetch sitemap JSON directly with `fetch(..., { next: { revalidate: 3600 } })`

- [ ] **Step 2: Preserve current XML payload semantics**

Do not change:

- feed titles
- locale-specific language mapping
- cache-control headers
- sitemap alternate-language link generation

- [ ] **Step 3: Verify route handlers build in production**

Run:

```bash
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web build:ci
```

Expected:

- no dynamic rendering warning for these routes
- feed/sitemap route handlers still compile under App Router

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/feed/route.tsx apps/web/src/app/sitemap/route.tsx apps/web/src/app/[locale]/says/feed/route.tsx apps/web/src/app/[locale]/thinking/feed/route.tsx
git commit -m "feat(web): make public feed and sitemap routes cacheable"
```

## Chunk 5: Enable Route-Level ISR Safely

### Task 6: Decouple Root Layout From Logged-In Request State

**Files:**
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Modify: `apps/web/src/providers/root/hydrate-user-auth-provider.tsx`
- Modify: `apps/web/src/components/layout/root/Root.tsx`
- Modify: `apps/web/src/components/layout/footer/Footer.tsx`
- Modify: `apps/web/src/components/layout/footer/FooterInfo.tsx`
- Modify: `apps/web/src/providers/root/script-inject-provider.tsx`

- [ ] **Step 1: Remove direct cookie-based auth fetch from root layout**

Current blocker:

- `apps/web/src/app/[locale]/layout.tsx` reads `cookies()` and calls owner auth check.

This makes the entire locale tree dynamic.

Refactor goal:

- move logged-in status hydration to a client-driven or separately dynamic path
- keep public theme/aggregation rendering on the server

- [ ] **Step 2: Make locale-specific aggregate consumers explicit**

If layout becomes static, update downstream aggregate readers so they take `locale` explicitly instead of relying on ambient request state.

Candidates:

- footer
- script injection provider
- any root component reading aggregate data during render

- [ ] **Step 3: After the request-bound auth work is gone, flip eligible routes**

Change only after a successful build proves no hidden request coupling remains:

- `apps/web/src/app/[locale]/layout.tsx`: from `force-dynamic` to `revalidate = 3600`
- `apps/web/src/app/[locale]/(home)/layout.tsx`: remove `force-dynamic`, or set `force-static` if safe
- `apps/web/src/app/[locale]/(page-detail)/[slug]/layout.tsx`: replace `force-dynamic`
- `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx`: replace `force-dynamic`
- `apps/web/src/app/[locale]/notes/(note-detail)/[...path]/page.tsx`: replace `force-dynamic`
- `apps/web/src/app/[locale]/categories/[slug]/layout.tsx`: replace `force-dynamic`
- `apps/web/src/app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/layout.tsx`: replace `force-dynamic`

- [ ] **Step 4: Build and manually smoke-check**

Run:

```bash
pnpm -C apps/web build:ci
pnpm -C apps/web dev
```

Manual checks:

- home page renders in all locales
- one post page
- one page-detail page
- one note page without password
- one note page with password remains uncached/private
- logged-out shell still works

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/layout.tsx apps/web/src/providers/root/hydrate-user-auth-provider.tsx apps/web/src/components/layout/root/Root.tsx apps/web/src/components/layout/footer/Footer.tsx apps/web/src/components/layout/footer/FooterInfo.tsx apps/web/src/providers/root/script-inject-provider.tsx apps/web/src/app/[locale]/(home)/layout.tsx apps/web/src/app/[locale]/(page-detail)/[slug]/layout.tsx apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx apps/web/src/app/[locale]/notes/(note-detail)/[...path]/page.tsx apps/web/src/app/[locale]/categories/[slug]/layout.tsx apps/web/src/app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/layout.tsx
git commit -m "feat(web): enable isr for public locale routes"
```

## Chunk 6: Optional Compatibility Cleanup

### Task 7: Preserve Legacy `.html` Locale Routing

**Files:**
- Modify: `apps/web/src/proxy.ts`

- [ ] **Step 1: Stop treating `.html` content paths as static assets**

Update `shouldSkipIntl()` so legacy `.html` article/note routes still pass through the intl middleware.

Keep other asset paths skipped.

- [ ] **Step 2: Verify no static asset regressions**

Run:

```bash
pnpm -C apps/web build:ci
```

Manual checks:

- `/foo.html` content route resolves correctly if such URLs are supported
- `/favicon.ico`, `/_next/...`, and other asset routes remain skipped

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/proxy.ts
git commit -m "fix(web): preserve locale handling for legacy html routes"
```

## Acceptance Matrix

| Area | Must Hold |
|---|---|
| Aggregation data | Cacheable by locale and invalidated by webhook |
| Public detail pages | Cacheable when public, uncached when password/token is present |
| Root layout | Must not read cookies before being switched off `force-dynamic` |
| Feed/Sitemap | Must build without request-bound `apiClient` |
| Webhook | Must invalidate both tag cache and covered paths |
| Locale behavior | Must preserve current locale-specific output |

## Non-Goals

| Item | Reason |
|---|---|
| Massive page-client splits | Not required for the minimum ISR win |
| Admin/dashboard fixes from the patch | Unrelated to ISR |
| Full public-page preloading for friends/timeline/thinking | Useful later, but not required to prove the cache model |

## Recommended Execution Order

| Order | Task | Why |
|---|---|---|
| 1 | Task 1 | Establish safe primitives |
| 2 | Task 2 | Aggregate data is the shared dependency for most public pages |
| 3 | Task 3 | Public detail pages get the biggest ISR value |
| 4 | Task 4 | Make cache invalidation operational |
| 5 | Task 5 | Clean up route handlers that should already be cacheable |
| 6 | Task 6 | Only now remove `force-dynamic` from route segments |
| 7 | Task 7 | Optional compatibility polish |

Plan complete and saved to `docs/superpowers/plans/2026-03-19-minimal-isr-migration.md`. Ready to execute?
