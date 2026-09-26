# MX V3 API Client — Progressive Migration

**Status**: planning · **Owner**: TBD · **Target**: post-mx-core PR #2729 merge

mx-core now ships `API_VERSION = 3`; this document tracks Yohaku's migration from V2 (current, behind the legacy adapter) to V3 (envelope + snake_case wire).

## Background

mx-core (the headless CMS backend) has finished its V2 → V3 response shape refactor (PR #2729). The wire format is now:

- Success envelope: `{ data, meta? }` (snake_case keys)
- Error envelope: `{ error: { code, message, details? } }`
- Pagination lives in `meta.pagination = { page, size, total, total_pages }`
- Translation lives in `meta.translation` (per-id `{ article: { is_translated, source_lang, ... }, fields? }`)
- Interaction (`is_liked` etc.) lives in `meta.interaction`
- Enrichments live in `meta.enrichments` keyed by URL

Yohaku currently consumes the old V2 wire via `@mx-space/api-client@5.0.2-next.3` + the legacy response adapter (`createLegacyApiClient` from `@mx-space/api-client/legacy`). The adapter unwraps the V3 envelope, flattens `meta` back onto each item (e.g. `data.translationMeta`, `data.isLiked`), and remaps `meta.pagination` to V2 `{ currentPage, totalPage, hasNextPage, hasPrevPage }`.

The legacy adapter is the right shim for an instant green build, but it's lossy (e.g. multi-id `meta.translation` records collapse onto items), hides the V3 design from feature code, and blocks adoption of features that only exist on V3 (e.g. `meta.insights.has_in_locale`, named views, structured error codes).

This document is the **progressive plan** to drop the legacy adapter and consume V3 natively across `apps/web/src`. **Do not** treat this as a single PR — each Phase B feature ships its own PR.

## Inventory (today)

- **api-client wire entry**: `apps/web/src/lib/fetch/shared.ts` → `createLegacyApiClient(fetchAdapter)(API_URL, { controllers, transformResponse: camelcaseKeysWithUrlSkip, ... })`.
- **error helper**: `apps/web/src/lib/request.shared.ts` reads `fetchError.response._data?.message` — V3 puts it at `_data?.error?.message`.
- **Files importing `@mx-space/api-client`**: ~82 files.
- **Files using `apiClient.<controller>.*`**: ~70 files.
- **`.proxy.*` raw path-style calls** (bypass typed controllers): `aggregate.proxy.site_info|sitemap|feed`, `shorthand.proxy.post`, `proxy.auth.session|providers`, `proxy.polls`, `proxy.fn.shiro.status`, `serverless.proxy.*`, `note.proxy.list/topics/recent-update`, `recently.proxy.*`. These still target real mx-core endpoints — most return shaped models that need V3 envelope handling.
- **V2-shape consumption hot spots** (grep findings):
  - `data.translationMeta` / `data.sourceLang` / `data.isTranslated` — `posts/(post-detail)/[category]/[slug]/*` and `notes/(note-detail)/*`.
  - `pagination.currentPage|totalPage|hasNextPage` — `notes/(topic-detail)/series/[slug]/page.tsx`, paginated lists.
  - `apiClient.aggregate.proxy.site_info.get<{...}>()` and similar `proxy.*` calls — `Hero.tsx`, `DropdownContents.tsx`.

## Migration strategy

Three phases, optimized for "always green":

1. **Phase A — Foundations** (one PR). Set up V3-native client side-by-side with the legacy one. Add error helper that understands the new envelope. Add a thin mapping layer for the V2 → V3 shape diffs we know about. Land a CI lint that flags new `createLegacyApiClient` usage. **No feature code changes.**

2. **Phase B — Per-feature migration** (many small PRs, parallelizable). For each feature, switch its api-client calls from the legacy instance to the V3-native one, update field reads to V3 shapes, and remove the bespoke V2 helpers it relied on.

3. **Phase C — Cleanup** (one PR). Once Phase B is complete, delete `createLegacyApiClient` setup, drop `camelcaseKeysWithUrlSkip`, prune any remaining V2 type aliases, bump `@mx-space/api-client` to the stable V3 release.

Order Phase B by **blast radius × dependency depth**: smallest, leaf-most pages first, so each PR is reviewable and a revert is cheap.

---

## Phase A — Foundations

- [ ] **A1. Add V3 native client factory.**
  - File: `apps/web/src/lib/fetch/shared.ts`.
  - Add `createApiClientV3(fetchAdapter)` that returns `createClient(allControllers)(fetchAdapter)(API_URL, { ... })` WITHOUT `createLegacyApiClient` wrapping.
  - Keep `transformResponse: camelcaseKeysWithUrlSkip` only at the wire-key level (the field-flattening logic the legacy adapter does, we drop). Verify that pagination/meta shapes survive camelCase conversion — `meta.pagination.total_pages` becomes `meta.pagination.totalPages`, which is fine for JS consumers.
  - Export both `apiClient` (legacy, unchanged) and `apiClientV3`. Feature code starts importing `apiClientV3` per migration.

- [ ] **A2. Update error helper for V3 envelope.**
  - File: `apps/web/src/lib/request.shared.ts`.
  - Read `_data?.error?.message` first, fall back to `_data?.message` (so it still works for legacy paths during the transition).
  - Optionally expose `_data?.error?.code` for callers that want to branch on a specific `AppErrorCode` (e.g. show a "draft" UI for `DRAFT_NOT_FOUND`).

- [ ] **A3. Add typed V3 envelope helpers.**
  - New file: `apps/web/src/lib/api/envelope.ts`.
  - Export `type V3Envelope<T> = { data: T; meta?: V3Meta }`, `type V3Meta = { pagination?: { page; size; total; totalPages }; translation?: ...; interaction?: ...; enrichments?: ... }`.
  - Export `pickArticleTranslation(meta, id)` helper that pulls `meta.translation[id]?.article` (or the flat `meta.translation.article` form for single-resource endpoints), so feature code reads one consistent shape.
  - Export `flattenInteraction(meta, id)` similarly.

- [ ] **A4. CI guard: forbid new legacy-adapter use in changed files.**
  - Add an ESLint rule (or a small `scripts/check-legacy-client.ts` ran in CI) that fails if a NEW file imports `createLegacyApiClient` or reads `data.translationMeta` / `pagination.currentPage`. Existing usages are allowed-listed; the list shrinks PR by PR.

- [ ] **A5. Smoke contract**: an integration test that boots the V3 native client against a recorded mx-core fixture and asserts at least one endpoint per controller returns the expected envelope shape. Catches breakage if mx-core bumps and meta keys change.

---

## Phase B — Per-feature migration

Each task is its own PR. Owner picks one, runs the foundation helpers, verifies the page renders + tests pass, and ships.

### Tier 1 — Leaf pages (low risk, ~1 hour each)

- [ ] **B1. Feeds and sitemap.**
  - `apps/web/src/app/feed/route.tsx`, `app/sitemap/route.tsx`, `app/[locale]/says/feed/route.tsx`, `app/[locale]/thinking/feed/route.tsx`.
  - These use `apiClient.aggregate.proxy.{feed,sitemap}.toString(true)` and `.get<RSSProps>()`. Switch to `apiClientV3` — the raw `proxy.*` API is unchanged. Verify the response body matches the expected RSS/XML/JSON shape (these endpoints are `@RawResponse` on mx-core; no envelope to unwrap).

- [ ] **B2. Sitemap-style aggregate proxy reads.**
  - `Hero.tsx`, `DropdownContents.tsx` — `apiClient.aggregate.proxy.site_info.get<{...}>()`. Read the V3 envelope: `res.data` is the typed payload.

- [ ] **B3. Subscribe page.**
  - `apps/web/src/app/[locale]/(other)/subscribe/*` — `apiClient.subscribe.{check,subscribe}`. Inspect the call sites, switch to `apiClientV3`, confirm `meta` is unused.

- [ ] **B4. Friends/Links page.**
  - `apps/web/src/app/[locale]/friends/page.tsx` — `apiClient.link.getAll`, `canApplyLink`. Switch client, update typing.

- [ ] **B5. Projects page.**
  - `apiClient.project.getAll`. Same shape.

- [ ] **B6. Search.**
  - `apiClient.search.searchAll`. Verify the wire envelope.

- [ ] **B7. Preview page.**
  - `apps/web/src/app/[locale]/preview/page.tsx`. Self-contained, low risk.

### Tier 2 — Mid-blast pages

- [ ] **B8. Says / Recently / Thinking list and items.**
  - `apps/web/src/app/[locale]/thinking/{post-box,item}.tsx`, `app/[locale]/says/page.tsx`, `(home)/components/BottomSection.tsx`.
  - `apiClient.recently.getList` / `getById`, `apiClient.shorthand.getList` / `.proxy.post`, `apiClient.say.getAllPaginated`.
  - Pagination shape change: `currentPage` → `page`, `totalPage` → `totalPages`. Update `useInfiniteQuery` / `useQuery` mappers.

- [ ] **B9. Categories and tags.**
  - `apps/web/src/app/[locale]/posts/tag/[name]/page.tsx`, `posts/(post-detail)/[category]/page.tsx`.
  - `apiClient.category.{getAllCategories,getAllTags,getCategoryByIdOrSlug,getTagByName}`. Should be straightforward — these are scalar/array responses.

- [ ] **B10. Home aggregate.**
  - `apps/web/src/app/[locale]/(home)/{useHomeQueryData.ts,components/*}`.
  - `apiClient.aggregate.{getAggregateData,getTop}`. The "top" payload now has its model under `data` and translation/enrichment under `meta`. Update `RecentWriting.tsx`, `BottomSection.tsx` accordingly.

- [ ] **B11. Comments.**
  - `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/*`, `notes/(note-detail)/*`, `app/[locale]/comments/*`.
  - `apiClient.comment.{getByRefId,getThreadReplies,uploadImage,getUploadConfig,proxy}`. Comments now hand back nested replies + `meta.pagination`; thread replies use a cursor. Update the infinite-query reducer to use the V3 cursor shape.

### Tier 3 — High-blast detail pages

- [ ] **B12. Note detail (slug-date and nid).**
  - `apps/web/src/app/[locale]/notes/(note-detail)/{slug-api.ts,detail-page.tsx,NoteDetailClient.tsx,[id]/pageExtra.tsx,[id]/api.tsx}`.
  - These currently read `data.translationMeta`, `data.isLiked`, `data.isTranslated`, `data.sourceLang` — all flattened by the legacy adapter. Replace each with the `pickArticleTranslation(meta, id)` / `flattenInteraction(meta, id)` helpers from A3.
  - Also read `meta.insights.has_in_locale` for the "has insights in this locale" badge (new in V3, currently dropped by the legacy adapter — this is a *gain* from migrating).

- [ ] **B13. Note list, topic, timeline.**
  - `app/[locale]/notes/page.tsx`, `(note-topic)/notes/(topic-detail)/series/[slug]/page.tsx`, `components/modules/note/NoteTimeline.tsx`.
  - Same pattern: switch to V3 pagination shape, use `meta.translation` map for the list-level translations.

- [ ] **B14. Post detail.**
  - `app/[locale]/posts/(post-detail)/[category]/[slug]/{api.tsx,pageExtra.tsx,PostDetailClient.tsx,PostLexicalRenderer.tsx,page.tsx}`.
  - Heaviest hot spot for `translationMeta` (12+ references in `pageExtra.tsx` alone). Plan: extract a `usePostTranslation(data, meta)` hook that returns the shape the renderers expect, so the renderers themselves don't change.

- [ ] **B15. Post list and full URL.**
  - `app/[locale]/posts/page.tsx`, `posts/(post-detail)/[category]/page.tsx`.
  - `apiClient.post.{getList,getPost,getFullUrl}`. Pagination shape change; update query keys if needed to avoid cache collisions during rollout.

- [ ] **B16. Page detail.**
  - `app/[locale]/(page-detail)/[slug]/pageExtra.tsx`, `app/[locale]/pages/page.tsx`.
  - `apiClient.page.{getBySlug,getList}`. Similar to post but lighter.

### Tier 4 — Cross-cutting

- [ ] **B17. Reader/auth atoms.**
  - `apps/web/src/atoms/hooks/reader.ts`, `providers/root/auth-session-provider.ts`, `queries/hooks/authjs.tsx`.
  - `apiClient.proxy.auth.{session,providers}`, `apiClient.owner.logout`, `apiClient.ack.read`. These power global state — coordinate the swap with a single PR rather than per-call.

- [ ] **B18. Activity, presence, likes.**
  - `apiClient.activity.{getLastYearPublication,getPresence,getRecentActivities,getRoomsInfo,likeIt,updatePresence}`. Several consumers; sweep them in one PR.

- [ ] **B19. AI insights and summary.**
  - `apiClient.ai.{getInsights,getSummary}`. New in V3; verify the consumers (insights popover, summary line) read from the envelope correctly.

- [ ] **B20. Polls, serverless functions, shiro status.**
  - `apiClient.proxy.polls`, `apiClient.serverless.proxy.shiro.status`, `apiClient.proxy.fn.shiro.status`. Raw proxy endpoints — should just work, verify.

- [ ] **B21. Topic detail.**
  - `apiClient.topic.{getAll,getTopicBySlug}`. Lower priority — fewer consumers.

---

## Phase C — Cleanup

- [ ] **C1. Drop `createLegacyApiClient`.**
  - Once every Phase B task is completed, delete the legacy factory in `apps/web/src/lib/fetch/shared.ts`, rename `apiClientV3` → `apiClient`, drop the dual export.

- [ ] **C2. Drop `camelcaseKeysWithUrlSkip`.**
  - Decide between two endpoints: (a) keep the global camelcaseKeys transform — V3 wire is snake_case, JS prefers camelCase, this transform stays useful, just rename the import; or (b) consume snake_case directly in feature code (more work but more honest). Recommended: (a). Rename to `camelcaseResponseKeys` and document its purpose.

- [ ] **C3. Audit and remove V2 type aliases.**
  - Search the codebase for `currentPage`, `totalPage`, `hasNextPage`, `hasPrevPage`, `translationMeta`, `sourceLang` (as a top-level field, not the new `meta.translation.article.source_lang` form). Any remaining references are dead — delete.

- [ ] **C4. Bump `@mx-space/api-client`.**
  - From `5.0.2-next.X` to the stable V3 release that ships alongside the mx-core merge.

- [ ] **C5. Update Yohaku CHANGELOG**: note the V3 migration, breaking field changes for any external integrations (RSS, plugins, etc.).

---

## Risks and notes

- **The legacy adapter is lossy for multi-id translations.** A list endpoint that returns 20 posts with translations puts them in `meta.translation = { "<post_id>": { article: { ... } } }`. The legacy adapter collapses this onto each item only if it can find a matching `id` field. If Yohaku ever shows a translation badge on a list page (today: yes, on the home aggregate), the legacy path may silently miss some. **Tier 2 / Tier 3 migrations recover this fidelity** — call it out as a perceived "fix" in the PR description, not a regression.

- **Cache key collisions during rollout.** TanStack Query keys derived from `pagination.currentPage` need a bump when the field name changes; otherwise stale entries linger across the cutover. Recommend appending `'v2'` to query keys touched during Phase B.

- **Error UX preservation.** The legacy V2 error sometimes carried domain-specific messages in `_data.message`. V3 sends `_data.error.message` plus a stable `code` (`POST_NOT_FOUND`, etc.). Feature code that switched on substrings of the legacy message must move to switching on `error.code` — see A2.

- **`.proxy.*` raw endpoints.** These bypass typed controllers and just hit the mx-core path directly. They should still work post-V3 because mx-core's `@RawResponse` decorator opts those endpoints out of the envelope. Spot-check during each tier — if a `.proxy.*` call's payload changes shape, fix at the call site.

- **Test coverage.** Add a Playwright smoke test for each Tier 3 page during its migration — these pages are the most likely to silently regress on field-name typos.

## Done definition

- [ ] No file in `apps/web/src` (other than the legacy-adapter test page, if any) imports `@mx-space/api-client/legacy`.
- [ ] `grep` for `translationMeta`, `currentPage`, `totalPage`, `hasNextPage`, `hasPrevPage` across `apps/web/src` returns zero matches.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` green.
- [ ] `@mx-space/api-client` pinned to a stable V3 release.
