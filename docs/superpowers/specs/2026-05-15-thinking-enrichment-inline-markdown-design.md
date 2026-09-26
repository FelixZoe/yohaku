# Thinking Enrichment — Multi-URL, Rendered Inline in Markdown

**Date:** 2026-05-15
**Repos touched:** `mx-core`, `@mx-space/api-client`, `Yohaku/apps/web`, `admin-vue3`

## Problem

A "thinking" (recently / 碎语) entry currently carries **one** enrichment. The
backend resolves a single URL (from `metadata.url`) into one `EnrichmentResult`
stored against two columns (`enrichmentProvider`, `enrichmentExternalId`). The
web client renders that single card at the **item level**, below the markdown
body, and the markdown body itself is forced to suppress link cardification via
the `disableBlockLink` flag so the two paths do not compete.

After the inline-link enrichment work, this split is no longer worth its
complexity:

- An entry can reference more than one URL; only the first gets a card.
- The item-level card is divorced from where the URL actually appears in the
  text.
- `disableBlockLink` exists solely to keep the markdown body from rendering link
  cards — but the markdown renderer already has an enrichment-gated card path
  (`ArticleLinkCard`) that would do the right thing if it had the data.

## Goal

Thinking entries carry **multiple** enrichments, keyed by URL, exactly like
posts/notes/pages (`EnrichmentMap`). The web client renders enrichment cards
**inline in the markdown body** — a single-link paragraph whose URL has an
enrichment becomes a card in place; everything else stays a plain link. The
item-level card and the `disableBlockLink` suppression are removed.

Embeds (iframe-style: YouTube, Tweet, Bilibili, CodeSandbox, Gist, GitHub file,
nested thinking) are a **separate, universal** concern — they render for any
recognized URL regardless of enrichment, in both articles and thinking. Their
logic is extracted out of the article link-card renderer into a shared module.

## Architecture Decision — recently enrichment storage

**Chosen: no dedicated columns; attach at read time.**

The recently read path scans the entry's `content` body for URLs, batch-looks
them up in `enrichment_cache`, and attaches an `enrichments` map to the
response. This is the exact `attachEnrichments` pattern posts/notes/pages
already use. `enrichment_cache` stays the single source of truth — no
denormalized snapshot, so nothing can go stale.

Rejected alternative: a JSONB `enrichments` column holding a snapshot. Faster
reads, but requires write-time population and goes stale whenever the cache row
refreshes.

This makes recently **structurally identical to posts** for enrichment, and is
a net simplification — the bespoke single-ref columns and logic are deleted.

## Changes by repo

### 1. mx-core (backend) — the contract; do first

**DB schema** — `packages/db-schema/src/schema/content.ts`
- Drop `recentlies.enrichmentProvider` and `recentlies.enrichmentExternalId`
  (currently `varchar(64)` / `varchar(256)`, lines ~186-189).
- Add an `app-migration` under `apps/core/src/database/app-migrations/` that
  `ALTER TABLE ... DROP COLUMN` for both, mirroring the existing
  `AppMigration` pattern. Confirm the project's column-drop mechanism during
  planning (app-migration vs drizzle-kit).
- The existing `20260506-enrichment-backfill.ts` migration becomes obsolete
  (it backfills columns being dropped) — remove it or leave it as a historical
  no-op per the migration registry's conventions.

**Read path** — `apps/core/src/modules/recently/recently.service.ts`
- Replace the single-ref `attachEnrichment()` (lines ~356-391) and the
  `resolveUrlForDisplay`-style logic (lines ~393-411) with the
  `attachEnrichments` pattern: feed each entry's markdown `content` through
  `UrlExtractorService` and `enrichmentService.hydrateUrls()` to produce
  `enrichments: EnrichmentMap` (`Record<url, EnrichmentResult>`).
- Reuse `enrichmentService.attachEnrichments()` if it can accept recently rows
  directly; recently content is always markdown, so pass a markdown content
  format (or add a thin markdown entry point to `UrlExtractorService`). Decide
  the exact reuse seam during planning.
- Apply on list (`findRecent`), single (`findById`), and any pagination
  neighbors, matching how note/post controllers call it.

**Write path** — `recently.service.ts` create (lines ~210-242) / update
(lines ~260-284), `recently.repository.ts` create (lines ~113-130) / update
(lines ~132-162)
- Stop resolving a single `metadata.url`. On create/update, scan the `content`
  body for **all** URLs and `enrichmentService.schedulePrefetchUrls(allUrls)`
  so the cache is warm by first read.
- Remove writes to `enrichmentProvider` / `enrichmentExternalId`.
- Remove `findWithoutEnrichment()` and any backfill-only repository surface
  that exists purely for the dropped columns.

**Entry `type`** — derive `RecentlyTypeEnum.Link` vs `Text` **server-side**
from whether the scanned `content` contains any URL. Clients no longer send
`type`.

### 2. @mx-space/api-client — the type contract

- `RecentlyModel`: remove `enrichment`, `enrichmentExternalId`,
  `enrichmentProvider`; add `enrichments?: EnrichmentMap`.
- `RecentlyCreateMetadata`: `url` is no longer required for enrichment; keep the
  field (the index signature stays) but it is unused by the enrichment flow.
- Bump and publish a new api-client version. **This is the prerequisite
  contract for `Yohaku/apps/web`** (admin-vue3 has its own local types).

### 3. Yohaku/apps/web

**Extract the embed module** (the "article link-card fix")
- Pull the embed branch out of `BlockLinkRenderer`
  (`src/components/ui/markdown/renderers/LinkRenderer.tsx`, the `Inner` `useMemo`
  at lines ~76-170: Tweet, YouTube, CodeSandbox, self-thinking, Bilibili, Gist,
  GitHub file preview) into a standalone, universal `LinkEmbed` module under
  `src/components/ui/link-embed/` (or similar).
- Shape: a `LinkEmbed`-style unit that, given an `href`, renders the embed when
  the URL matches a known embed provider, or yields nothing on no match — so a
  caller can fall through to the next renderer. Exact component/hook signature
  is an implementation choice; it must have **no enrichment dependency**.
- `BlockLinkRenderer` is refactored to compose: try `LinkEmbed` first → if it
  matched, render the embed; otherwise render `ArticleLinkCard`
  (enrichment-gated, reads `EnrichmentMap` via `useLinkCardEnrichment`). This
  cleanly separates embed (universal) from OG card (enrichment-driven).
- `w-screen` on the Bilibili embed is left as-is; constrained hosts (thinking
  rows) clamp it with an outer `max-w-full`.

**Thinking item** — `src/app/[locale]/thinking/item.tsx`
- Drop `disableBlockLink` from the `<Markdown>` call (keep `forceBlock` and
  `variant`).
- Wrap the `<Markdown>` for `item.content` in
  `<EnrichmentMapProvider value={item.enrichments}>` so the markdown's
  `BlockLinkRenderer` → `ArticleLinkCard` path resolves cards inline.
- Remove the item-level `<LinkCardVariant data={item.enrichment}>` block and the
  `preview_unavailable` placeholder block (lines ~103-112).
- Remove now-unused imports (`LinkCardVariant`, the `tThinking` placeholder key
  may also become unused — confirm).
- Add `max-w-full` / overflow clamping on the thinking markdown container so a
  `w-screen` Bilibili embed cannot break the narrow paper card.

**Markdown plumbing** — `src/components/ui/markdown/Markdown.tsx`,
`renderers/paragraph.tsx`
- `disableBlockLink` was used **only** by the thinking item. Remove the prop,
  the `MParagraphNoBlockLink` variant, and the `ParagraphRenderer` branch.
  `MParagraph` always promotes single-link paragraphs to `BlockLinkRenderer`.

**Composer** — `src/app/[locale]/thinking/post-box.tsx`
- Detect **all** URLs in the content (not just `firstUrl`).
- Resolve each via `resolveEnrichmentFromUrl` and preview a stacked list of
  `<LinkCardVariant>` cards, one per resolved URL.
- Stop sending `metadata.url` and `type` in the create payload — the backend
  derives `type` and scans the body itself. Payload becomes `{ content }`.

**Behavior notes**
- A URL mid-sentence (not its own paragraph) is not promoted to a block card;
  it stays an inline anchor. `InlineLinkAnchor`'s hover card reads the same
  `EnrichmentMapProvider`, so it still gets a hover preview.
- A single-link paragraph whose URL is neither an embed nor in `enrichments`
  falls through to a plain markdown anchor — no skeleton, no client fetch, no
  "unavailable" message (consistent with posts).
- SSR: `enrichments` ships with each `RecentlyModel`, so `EnrichmentMapProvider`
  has data on the server render — cards render server-side with no hydration
  flash.

### 4. admin-vue3

- `apps/admin/src/models/recently.ts`: remove `enrichmentProvider`,
  `enrichmentExternalId`, `enrichment`; add
  `enrichments?: Record<string, EnrichmentResult>`.
- Composer — `apps/admin/src/components/shorthand/index.tsx` (URL detection +
  preview, lines ~135-163): detect all URLs, resolve each, preview multiple
  `EnrichmentCard`s. Simplify `buildPayload` (lines ~50-60) to `{ content }`.
- List item — `apps/admin/src/views/shorthand/index.tsx` (lines ~106-117):
  iterate the `enrichments` map and render one `EnrichmentCard` per URL.
- Retry: change from "retry one `(provider, externalId)`" to "re-resolve a URL"
  (force-refresh via the enrichment resolve API), per URL.

## Edge cases

- **Multiple URLs in one entry** — each standalone-link paragraph resolves
  independently; each becomes its own card or embed.
- **No URL** — `type` resolves to `Text`; no enrichment work.
- **Embed URL** — renders the embed regardless of `enrichments`, in both
  articles and thinking.
- **Enrichment cache miss at read time** — URL falls through to a plain anchor;
  `schedulePrefetchUrls` on write keeps misses rare.
- **Bilibili `w-screen` in a narrow card** — clamped by the host's `max-w-full`.

## Testing

- **mx-core** — recently read path attaches `enrichments`; multi-URL body scan
  produces a map keyed by URL; `type` is derived from URL presence; migration
  drops the two columns.
- **Yohaku web** — `LinkEmbed` unit tests per provider (matched vs no match);
  thinking item renders an inline card only for URLs present in `enrichments`;
  non-enriched single-link paragraph stays a plain anchor; embed inside the
  thinking card does not overflow. Existing `use-inline-link-enrichment` tests
  still pass.
- **admin-vue3** — composer previews multiple cards; list item renders all
  enrichment cards.

## Sequencing

1. **mx-core + api-client** — backend schema/service/migration and the
   `RecentlyModel` type bump. This is the contract.
2. In parallel after (1):
   - **Yohaku/apps/web** — bump the api-client dependency, extract `LinkEmbed`
     (independent of the backend and can start earlier), apply the thinking +
     markdown changes.
   - **admin-vue3** — update local types, composer, list, retry.

## Addendum — 2026-05-15: typed recently entries removed

During implementation the `book` / `media` / `music` / `github` / `academic` /
`code` recently entry types were confirmed deprecated and removed rather than
carried forward:

- `RecentlyTypeEnum` collapses to `Text` and `Link` (server-derived from URL
  presence). The per-type metadata zod schemas and the discriminated-union
  input DTO are deleted; the create/update DTO is now `{ content, ref?,
  refType? }`.
- The home "Now reading / listening / watching" block (`NowStatus` in
  `BottomSection.tsx`) was the only consumer of typed entries' enrichment. It
  is removed along with its `second_now` / `second_reading` /
  `second_listening` / `second_watching` i18n keys.
- Existing DB rows carrying a legacy typed `type` are left as-is; they render
  as ordinary entries in the thinking feed. No data migration is performed.
