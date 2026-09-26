# Map Track Legs — Several Journeys in One Map Node

**Date:** 2026-09-23
**Author:** Innei
**Status:** Approved
**Scope:** mx-core (`packages/editor` types, `apps/admin` map extension) + Yohaku web (`map-block`)
**Builds on:** `2026-06-05-map-node-design.md`

## 1. Problem

A multi-day trip written as one `map` node per day stacks N × ~576 px
(460 map + 68 caption + 48 margin) of maps into the article. Five days cost
~2,900 px of scroll. Authors need to put several journeys into one map.

## 2. Decision

Group journeys **inside the track JSON**, not on the Lexical node.

- `SerializedMapNode` is unchanged: `{ type: 'map', version: 1, title, track: { url }, pois?, view? }`.
- The track JSON at `track.url` gains an optional `legs` index over its
  existing `segments` array.
- Admin insert dialog accepts several GPX files and merges them into one
  track JSON.
- Yohaku web renders leg chips under the map when `legs.length > 1`.

Rejected: `tracks: [{ url }]` on the node (schema drift across 4 copies,
N fetches); render-time auto-merge of adjacent map nodes (surprising for
authors); compact per-node strips (still N blocks; can be added later
independently).

## 3. Track JSON (v1, additive)

```ts
interface MapTrackLeg {
  title: string
  segments: [from: number, to: number]
  startTimeMs?: number
  endTimeMs?: number
  distanceMeters?: number
}

interface MapTrackData {
  // …existing v1 fields (bounds, distanceMeters, points, stops, …)
  segments?: MapTrackPointTuple[][]
  legs?: MapTrackLeg[]
}
```

Rules:

1. `legs[i].segments` is a half-open range `[from, to)` into `segments`.
   Ranges are ordered, non-overlapping, and cover `segments` exactly.
2. `points` stays present and equals `segments.flat()`, so readers that
   ignore `segments` still draw every route (with straight joins).
3. `legs` is written only when the author supplied more than one GPX file.
   Readers ignore `legs` when it has fewer than 2 valid entries.
4. Readers drop a leg whose range is not integer, empty, or out of bounds.
5. A stop belongs to a leg when its `time` lies in
   `[leg.startTimeMs, leg.endTimeMs]`. Stops without `time` show in every leg.
6. Top-level `distanceMeters` = sum of per-segment distances (no jumps
   between segments or legs). `startTimeMs` / `endTimeMs` span all legs.
   `timezoneOffsetMinutes` comes from the first leg that has one.

The spec's v1 rule ("readers must accept extra fields") makes this
backward compatible; `version` stays `1`.

## 4. Types

`packages/editor/src/core/nodes/map.ts` adds `MapTrackLeg`, and optional
`segments` / `legs` on `MapTrackData`. Type-only; no projection change.

Yohaku web consumes the published `@mx-space/editor`, so
`apps/web/src/components/ui/map-block/types.ts` keeps extending
`MapTrackData` locally (adds `legs` next to the existing `segments`) until
the editor package is bumped.

## 5. Admin (mx-core `apps/admin/.../extensions/map`)

### 5.1 `gps-compress.ts`

- Port `orderTrackPoints` and `splitTrackSegments` (30 min gap **and**
  3 km jump) from Yohaku `gpx-to-track.client.ts`.
- `buildTrackJson` emits `segments` for a single file too.
- New `buildLegsTrackJson(legs, title, options)` merges several parsed
  files: per leg → order → split → detect stops; concatenate segments,
  record ranges, sum distances, span times; `legs` only when > 1 input.

### 5.2 `InsertMapDialog.tsx`

- File input takes `multiple`. GPX picks **append** legs; new picks are
  sorted among themselves by first timestamp. A JSON pick replaces
  everything (single file, as today).
- Leg list (shown for ≥ 1 GPX): per row an editable title (defaults to
  the file name without extension), the leg's date and distance, move
  up / move down, remove. An "Add GPX" button appends more.
- Stop-detection controls apply to every leg.
- Preview renders the merged JSON through the existing blob-URL path.
- Editing an existing map still starts from its URL; changing legs
  means re-picking the GPX files. (Known limit — see §8.)

### 5.3 `MapBlock.tsx` / `map-layers.ts` (admin preview)

- Read `segments` (fallback `[points]`) and draw a `MultiLineString`, so
  gaps between legs are not bridged with straight lines.
- Reveal animation walks the flat index but never interpolates across a
  segment boundary.

## 6. Yohaku web (`apps/web/src/components/ui/map-block`)

### 6.1 Leg chips

New `MapLegChips.tsx`, rendered between the map and the figcaption when
there are ≥ 2 valid legs: an "All" chip plus one chip per leg
(title + short date). Horizontal scroll on overflow; `aria-pressed`
on the active chip.

### 6.2 Focus behaviour

- Selecting a leg: `fitBounds` to the leg's segments (600 ms), main route
  line dims (`line-opacity` 0.3), a focus route layer draws the leg's
  segments in the accent colour, stops filter to the leg (§3 rule 5).
- "All": restore opacity, clear the focus layer, fit to the whole track.
- Focus is re-applied inside `ensureLayers` so a theme `setStyle` keeps it.
- Popovers close on leg change.

### 6.3 Caption

With a leg active: title `"<node title> · <leg title>"`, secondary line
uses the leg's dates, distance and stop count. Changing labels go through
`SlotText`.

### 6.4 Unchanged

Video export (walks all segments already), node class, static renderer,
mobile native placeholder.

## 7. Verification

- Admin: unit test for `buildLegsTrackJson` (ranges cover segments,
  `points === segments.flat()`, distance sum, legs omitted for 1 input);
  manual insert of 3 GPX files, reorder, retitle, preview shows gaps.
- Web: dev demo `/dev-demos/gps-track` with a 3-leg track; chips switch
  camera, dim, caption; single-leg and legacy (`points`-only) tracks
  look as before.

## 8. Out of scope / later

- Re-editing leg titles or order of an already uploaded map without the
  source GPX files.
- Per-leg video export.
- Compact per-day strip nodes that point at one leg (`leg?: number` on
  the node) for articles that interleave prose between days.
