# Home Musings — Enrichment-aware rendering

## Context

The home page second section renders up to two recent "musings" via `Musings` in
`apps/web/src/app/[locale]/(home)/components/BottomSection.tsx`. Originally it
filtered `RecentlyModel` to `type === 'text'` and printed `「{musing.content}」`
verbatim, which meant a musing whose content was a URL (alone or paired with a
short description) just showed the raw URL in quotes — losing the cached
`enrichments` metadata that the API already provides.

This spec adds an enrichment-aware render path: when a musing's `content`
contains a URL (alone, or as a separate paragraph alongside a short
description) and the bulk `enrichments` map (`Record<url, EnrichmentResult>`)
already contains that URL's resolved entry, render the URL portion as
`<verb>「<title>」` with the title linking to `enrichment.url`. The description
portion (if any) renders as `「<desc>」` on its own row. No new fetch, no card.

The detection logic — single-URL identification, paragraph-level URL extraction,
verb mapping from `(category, subtype)` — is extracted into a reusable module at
`apps/web/src/lib/enrichment/recently.ts` because the same shape is expected to
recur (other surfaces that summarize a `RecentlyModel`).

## Goals

- Make link musings legible at a glance ("观看了「Title」" instead of a bare URL).
- Support the common pattern of a short description followed by a URL on its own line.
- Reuse the existing `enrichments` payload — zero new network calls in this view.
- Keep the `border-l + 「」` envelope; add at most one row beneath description.
- Extract reusable parsing/verb logic so future surfaces can compose it.

## Non-goals

- No fallback resolve via `/enrichment/resolve` — if the URL isn't in `enrichments`, we render the old quoted-URL form.
- No mini-card / poster preview on the home page (the existing `LinkCard` family is intentionally NOT reused here — too heavy for this section).
- No change to ordering, count (still up to 2), or any other surface.
- No change to the `/thinking` feed — that page already has its own `EnrichmentMapProvider` + `Markdown` rendering.
- No regex extraction of URLs embedded mid-prose. The rule is paragraph-granular.

## Scope of change

- `apps/web/src/lib/enrichment/recently.ts` *(new)*
  - Exports `parseRecentlyContent`, `pickRecentlyVerbKey`, and the `ParsedRecently` / `EnrichedRecentlyLink` / `RecentlyVerbKey` types.
- `apps/web/src/app/[locale]/(home)/components/BottomSection.tsx`
  - Drops inline helpers; imports `parseRecentlyContent`.
  - Drops the `i.type === 'text'` filter (type is not the discriminator).
  - Renders the three `ParsedRecently` branches inside the existing `border-l` block.
- `apps/web/src/messages/{en,zh,zh-TW,ja,ko}/home.json`
  - Five sibling keys under `musings_verb_*` (added in the initial pass; unchanged by the refactor).

## Module API — `lib/enrichment/recently.ts`

```ts
type RecentlyVerbKey =
  | 'musings_verb_watched'
  | 'musings_verb_read'
  | 'musings_verb_listened'
  | 'musings_verb_studied'
  | 'musings_verb_linked_to'

type EnrichedRecentlyLink = {
  verbKey: RecentlyVerbKey
  title: string
  url: string
}

type ParsedRecently =
  | { kind: 'plain'; content: string }
  | {
      kind: 'enriched'
      description: string | null
      link: EnrichedRecentlyLink
    }

pickRecentlyVerbKey(enrichment: EnrichmentResult): RecentlyVerbKey
parseRecentlyContent(content: string, enrichments?: EnrichmentMap): ParsedRecently
```

The module is pure (no React, no I/O) so consumers can run it server- or
client-side, and tests can drive it directly.

## Discrimination logic

`parseRecentlyContent(content, enrichments)` resolves in this order:

1. **Empty content** → `{ kind: 'plain', content: original }`.
2. **Whole-content URL**: `content.trim()` itself parses as a single http(s) URL via `new URL(...)` AND `enrichments[content.trim()]` has both `title` and `url` → `{ kind: 'enriched', description: null, link }`.
3. **Paragraph-split**: split `content.trim()` on blank-line boundaries (`/\n\s*\n/`), trim each segment, drop empties. If at least two paragraphs remain AND exactly one is the first to resolve to an enrichment-backed http(s) URL → `{ kind: 'enriched', description: <other paragraphs joined by \n\n>, link }`. The description is `null` if no other paragraphs survive.
4. **Otherwise** → `{ kind: 'plain', content: original }`.

Notes:
- Inside a paragraph, the segment must be exactly a URL after trimming. URLs embedded mid-sentence do not trigger the enriched branch.
- Multiple URL paragraphs: the first one that resolves to an enrichment wins; others are kept inside the description.
- Non-`http(s)` schemes (mailto:, magnet:, …) never trigger the enriched branch.

## Verb mapping

Resolved from `(enrichment.category, enrichment.subtype)`. The first match wins:

| category | subtype | verb key |
|---|---|---|
| `media` | `movie`, `tv` | `musings_verb_watched` |
| `media` | `book` | `musings_verb_read` |
| `media` | `music`, `album`, `song` | `musings_verb_listened` |
| `book` | * | `musings_verb_read` |
| `music` | * | `musings_verb_listened` |
| `academic` | * | `musings_verb_studied` |
| *(else)* | | `musings_verb_linked_to` |

Categories `github`, `code`, `self`, and any future unknown category fall through to the `linked_to` fallback — kept neutral so we don't claim "watched" for a repo bookmark.

## i18n strings

Under each locale's `home.json`:

| key | en | zh | zh-TW | ja | ko |
|-----|-----|-----|-----|-----|-----|
| `musings_verb_watched` | Watched | 观看了 | 觀看了 | 観た | 봤어요 |
| `musings_verb_read` | Read | 读了 | 讀了 | 読んだ | 읽었어요 |
| `musings_verb_listened` | Listened to | 听了 | 聽了 | 聴いた | 들었어요 |
| `musings_verb_studied` | Studied | 读了 | 讀了 | 読んだ | 읽었어요 |
| `musings_verb_linked_to` | Linked to | 链接到 | 連結到 | リンク | 링크 |

`studied` and `read` share the same Chinese / Japanese / Korean text; the keys are split so future locales (or refinement) can distinguish them without a data migration.

## Rendering

Inside the existing `text-copy-14 leading-[1.9] text-neutral-7` envelope, three branches:

**`plain`** — unchanged:

```tsx
「{parsed.content}」
```

**`enriched` (description = null)** — single row, same shape as the v1 commit:

```tsx
{t(parsed.link.verbKey)}{' 「'}
<a className="yohaku-link--underline transition-colors hover:text-accent"
   href={parsed.link.url}
   rel="noopener noreferrer"
   target="_blank">
  {parsed.link.title}
</a>
{'」'}
```

**`enriched` (description != null)** — two stacked rows inside the envelope:

```tsx
<div className="whitespace-pre-line">「{parsed.description}」</div>
<div className="mt-1">
  {t(parsed.link.verbKey)}{' 「'}
  <a …>{parsed.link.title}</a>
  {'」'}
</div>
```

- `whitespace-pre-line` preserves blank-line separators inside the description (rare, but possible if a musing has multiple description paragraphs around the URL).
- `mt-1` (4px) gives the link row a hair of breathing room without disturbing the surrounding `gap-5` cards.
- The `RelativeTime` row below is untouched.

## Edge cases

- **`content` is exactly a URL** — branch 2 (whole-content URL) → `description: null`. Same render as the v1 commit.
- **`content` is "desc\n\nURL"** — branch 3 → description = "desc", link = URL. Two-row render.
- **`content` is "URL\n\ndesc"** — branch 3 → description = "desc", link = URL. URL position within content does not affect rendering order; the URL row is always below.
- **`content` is "desc1\n\nURL\n\ndesc2"** — branch 3 → description = "desc1\n\ndesc2", link = URL.
- **Two URLs, only one enriched** — branch 3 picks the enriched one; the non-enriched URL stays inside the description text.
- **Two URLs, both enriched** — first one wins; second stays inside description as plain text.
- **No URL paragraphs / no enrichment** — falls to branch 4 (plain). Original behavior.
- **Enrichment present but `title` empty** — treated as not enriched.
- **Non-HTTP(S) protocols** — never enriched.
- **Mismatched key (server-stored URL form differs from `content.trim()`)** — lookup fails → plain branch (safe fallback).
- **i18n key missing in a locale** — `next-intl` returns the key as a string; the en fallback above prevents this in shipping locales.

## Testing

- Manual: in dev, fixture a `RecentlyModel` whose `content` is `https://www.themoviedb.org/tv/285838` with `enrichments` mapped to a `category: 'media'`, `subtype: 'tv'` entry — confirm "观看了「<title>」" renders and title link opens in a new tab.
- Manual: fixture a `RecentlyModel` whose `content` is `"<short desc>\n\n<url>"` with matching enrichment — confirm two-row render (`「<desc>」` then `<verb>「<title>」`).
- Manual: fixture a link-only musing with no enrichments — confirm it falls back to `「<url>」`.
- Manual: text musing (no URL) — confirm unchanged.
- No new automated tests are added in this pass; `parseRecentlyContent` is pure and small. If reuse grows, a `recently.test.ts` next to the module is the natural home.

## Out of scope / future

- A second pass could lazy-resolve missing enrichments via `resolveEnrichmentFromUrl` for the first 2 items; deferred until needed.
- If poster previews are wanted later, the section would need a layout rework (the `border-l` envelope is too narrow for `MovieCard`) — that is a separate design.
- Once a second surface starts calling `parseRecentlyContent`, factor out a thin renderer component or hook that returns the JSX directly.
