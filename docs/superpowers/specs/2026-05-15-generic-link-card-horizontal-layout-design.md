# Generic Link Card — Horizontal Layout

**Date:** 2026-05-15
**Status:** Approved (brainstorming)
**Scope:** `apps/web` (`FallbackCard`) + `mx-core` (`open-graph` enrichment provider)

## Overview

The "Generic Link" card (`FallbackCard`) is the last-resort link-card variant
for any URL no specialized provider claims (`category: 'web'`, sourced from
mx-core's `open-graph` provider). Today it renders a **stacked** layout: the OG
image bleeds edge-to-edge across the top, the title / description / meta sit
below. With a standard 1.91:1 OG image at the card's `max-w-[36rem]` width the
image alone is ~280px tall, producing a ~380px card that reads as empty and
wastes horizontal space.

This redesign switches `FallbackCard` to a **horizontal** layout: text on the
left, a fixed-width rounded thumbnail on the right. Card height follows the
text, the image becomes a compact accent, and the card uses its width instead
of its height.

## Goals

- `FallbackCard` with a real OG image renders horizontally: text left, rounded
  thumbnail right, height driven by text.
- `FallbackCard` with no usable image degrades to a clean text-only horizontal
  card — same shell, no thumbnail slot.
- A favicon anchors the meta row (the card "footer") in **both** states, so the
  no-image card does not read as a degraded variant.
- The meta row never wraps.
- A favicon (an `apple-touch-icon` / `icon`) is never mistaken for an OG image
  and never lands in the thumbnail slot.

## Non-goals

- `HoverLinkCard` (the hover popover) keeps its stacked layout — it is a narrow
  360px popover where stacking is correct. Untouched.
- No changes to other card variants (`PosterCard`, `RepoCard`, etc.).
- No server-side image fetching/decoding to derive dimensions or blurhash for
  OG images. Dimensions come only from advertised `og:image:width/height` meta.

## Current State

- `apps/web/src/components/ui/link-card/variants/FallbackCard.tsx` — renders
  `LinkCardShell vertical` + `WideOgMedia` (edge-to-edge top image) + a body div.
- `apps/web/src/components/ui/link-card/variants/atoms/WideOgMedia.tsx` — wide
  edge-to-edge media block; `pickSource()` picks `image` vs `screenshot`. Used
  by both `FallbackCard` and `HoverLinkCard`.
- `apps/web/src/components/ui/link-card/variants/atoms/MetaRow.tsx` — dot-
  separated meta line, **`flex-wrap`** by default.
- mx-core `apps/core/src/modules/enrichment/providers/open-graph/og-parser.ts` —
  `resolveImage()` returns og:image / twitter:image, **else falls back to
  `apple-touch-icon`, else the first `<link rel=icon>`**, all collapsed into a
  single `image: { url, alt }` with **no `width`/`height`** and no flag marking
  it as an icon. The frontend therefore cannot statically tell an OG image from
  a favicon.
- mx-core `open-graph.provider.ts` — captures a page screenshot only when
  `!result.image?.url` (and `screenshot.enabled`).

## Design — Part A: mx-core `open-graph` provider

The frontend's "favicon never enters the thumbnail" requirement is solved at
the source: `image` must hold **only** a real OG image.

### A1. `resolveImage()` — drop the icon fallback

`resolveImage()` returns only og:image / twitter:image candidates
(`og:image:secure_url`, `og:image:url`, `og:image`, `twitter:image:src`,
`twitter:image`). The `apple-touch-icon` / first-`icon` fallback branches are
removed. When a page advertises no OG/Twitter image, `result.image` is
`undefined`.

### A2. Record OG image dimensions

When the resolved image came from an `og:image:*` candidate, parse
`og:image:width` and `og:image:height` (available as `bag.og['image:width']` /
`bag.og['image:height']`), coerce to positive integers, and populate
`image.width` / `image.height`. When the meta tags are absent or unparseable,
leave the dimensions `undefined` — the image is still a valid OG image, just
without an advertised aspect. (`EnrichmentImage.width/height` are already
optional — no type change.)

### A3. Move icons into `links`

The `<link rel=icon|apple-touch-icon|...>` hrefs collected in `bag.icons` are
emitted into `result.links` as `{ rel, url }` entries (absolutized), so the
data is preserved rather than discarded. (`EnrichmentResult.links` already
exists — no type change.) This is hygiene; no consumer reads it today.

### A4. Consequence — screenshot fallback widens

`open-graph.provider.ts` screenshots a page when `!result.image?.url`. After A1,
favicon-only pages now have `image === undefined`, so (when `screenshot.enabled`)
they become eligible for a screenshot. This is **intended**: a screenshot is a
wide image and a valid thumbnail source. Pages with neither an OG image nor a
screenshot fall through to the text-only card. This widening must be called out
in the implementation plan and covered by the existing
`open-graph-screenshot.integration.spec.ts`.

## Design — Part B: apps/web `FallbackCard`

### B1. Layout

`FallbackCard` drops `LinkCardShell`'s `vertical` prop and uses the default
horizontal shell. Two render shapes share one shell:

- **With a thumbnail source** (real `image`, else `screenshot`): body column on
  the left (`flex-1 min-w-0`), `OgThumbnail` on the right (`shrink-0 self-start`).
- **Without** any thumbnail source: body column only, full width.

Body column (unchanged content, restyled): title (`line-clamp-2`), optional
description (`line-clamp-2`), `MetaRow`.

The shell's existing accent wiring (`--color-accent` from `data.color`, else
the screenshot palette dominant, feeding `InkWash`) is preserved as-is.

### B2. `OgThumbnail` atom

New atom `apps/web/src/components/ui/link-card/variants/atoms/OgThumbnail.tsx`:

- Props: a resolved media source (`url`, optional `width`/`height`/`blurhash`)
  and `alt`.
- Pinned width **140px** (`w-[8.75rem]`); height derived from the source
  aspect: `height = width / ratio`.
- `ratio = width / height` when both dimensions are known; otherwise default to
  the OG standard **1.91:1** (`1200 / 630`). Defensive clamp (reuse
  `WideOgMedia`'s bounds): a portrait ratio (`< 1`) falls back to the default;
  the ratio is capped at `3`.
- `rounded-lg overflow-hidden bg-neutral-2`, inner `<img>` `object-cover`,
  `loading="lazy"`.
- Renders the blurhash layer when `source.blurhash` is present (screenshots
  carry one; OG images will not — the layer is simply skipped).

### B3. Shared source picker

`WideOgMedia`'s `pickSource()` + `MediaSource` type are extracted into a shared
module `variants/atoms/media-source.ts` and consumed by both `WideOgMedia`
(unchanged, still used by `HoverLinkCard`) and `OgThumbnail`. `FallbackCard`
uses it with `preferScreenshot: false` — cascade: `image` → `screenshot` →
`null`. When it returns `null`, the no-image branch renders.

### B4. Meta row — single line + favicon

`MetaRow` itself needs **no change**: it already merges a caller `className`,
and `tailwind-merge` lets `flex-nowrap` override its default `flex-wrap` (this
is exactly how `PosterCard` already gets a non-wrapping meta row). `FallbackCard`
passes `className="flex-nowrap overflow-hidden"`, so the meta row is a single
clipped line.

The favicon is rendered **inside the first meta item**, alongside
`primaryLabel`, as one `<span className="inline-flex items-center gap-1.5">`
node — so `MetaRow`'s `·` separators fall between that combined item and the
next, not between the favicon and the label. The favicon is the existing
`apps/web/src/components/ui/rich-link/Favicon.tsx` component with
`href={data.url}` — it derives the favicon from the URL itself and does **not**
depend on mx-core's image data. Shown in both the with-image and no-image
states.

Remaining meta items are unchanged in content (`primaryLabel` = site name or
host, `author`, `year`, `readingTime`) but get single-line treatment:
fixed-content items are `whitespace-nowrap shrink-0`; the `author` item is
`min-w-0 truncate` so it absorbs overflow with an ellipsis while year and
reading-time stay visible. Any residual overflow is clipped by the row's
`overflow-hidden`.

### B5. Data flow

```
EnrichmentResult (category: 'web')
  │
  ├─ image?  (post-A1: present ⇒ a real OG image, dims may be present)
  │     └─ yes → OgThumbnail source = image
  ├─ else screenshot? → OgThumbnail source = screenshot
  └─ else → no thumbnail, text-only card

MetaRow: <Favicon href={url}/> · primaryLabel · author · year · readingTime
```

## Edge Cases

- **OG image without advertised dimensions** — `image` present, `width/height`
  undefined. Valid (post-A1, `image` only ever holds a real OG image). Thumbnail
  uses the default 1.91:1 aspect.
- **Square / portrait OG image** — handled by the clamp: `< 1` ratios fall back
  to the default, ratios are capped at 3.
- **No description** — body is title + meta only; card is short. Acceptable.
- **Long author / long site name** — `author` truncates with an ellipsis; the
  row never wraps and never grows the card height.
- **mx-core not yet updated** — see Sequencing. Until Part A ships, `image` may
  still carry a favicon; Part B would render it in the thumbnail. Therefore
  Part A is a hard prerequisite for Part B.

## Sequencing

1. **Part A (mx-core)** ships first. It is self-contained and only affects the
   `open-graph` provider (→ `category: 'web'` results).
2. **Part B (apps/web)** ships after A. Until A is deployed, the favicon-discard
   guarantee does not hold, so B must not ship first.

## Testing

**mx-core:**
- `og-parser` unit tests: `image` is `undefined` when only icons are present;
  `image.width/height` populated from `og:image:width/height`; icons surface in
  `result.links`.
- `open-graph-screenshot.integration.spec.ts`: verify the widened screenshot
  eligibility (favicon-only pages → screenshot when enabled).

**apps/web:**
- `FallbackCard.test.tsx` — rewrite for the horizontal layout: thumbnail present
  with an `image`; thumbnail uses screenshot when `image` absent; text-only when
  neither; favicon present in the meta row in both states; meta row carries the
  `flex-nowrap overflow-hidden` classes. Remove assertions tied to the old
  `WideOgMedia` top-image markup.
- `OgThumbnail` — new test: pinned width, aspect from dims, default aspect when
  dims absent, clamp behavior, blurhash layer presence/absence.
- `WideOgMedia.test.tsx` / `HoverLinkCard.test.tsx` — confirm still green after
  `pickSource` extraction; behavior unchanged.

## Files Affected

**mx-core:**
- `apps/core/src/modules/enrichment/providers/open-graph/og-parser.ts` — A1–A3.
- `apps/core/src/modules/enrichment/providers/open-graph/*.spec.ts` (and
  `apps/core/test/.../open-graph-screenshot.integration.spec.ts`) — tests.

**apps/web:**
- `src/components/ui/link-card/variants/FallbackCard.tsx` — horizontal layout.
- `src/components/ui/link-card/variants/atoms/OgThumbnail.tsx` — **new** atom.
- `src/components/ui/link-card/variants/atoms/media-source.ts` — **new**,
  extracted `pickSource` + `MediaSource`.
- `src/components/ui/link-card/variants/atoms/WideOgMedia.tsx` — import shared
  `pickSource`.
- `src/components/ui/link-card/variants/atoms/index.ts` — export `OgThumbnail`.
- `src/components/ui/link-card/variants/FallbackCard.test.tsx` — rewrite.
- `src/app/[locale]/(dev)/link-cards/page.tsx` — update fallback fixtures
  (`fallbackArticle` / `fallbackOEmbedVideo` get realistic wide images with
  `width`/`height`; `fallbackFaviconOnly`'s `image` becomes `undefined`); refresh
  the now-stale "right-side stamp" section copy.

## Open Questions

None.
