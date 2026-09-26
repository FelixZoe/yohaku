# Map Node — Lexical Editor Integration Design

**Date:** 2026-06-05
**Author:** Innei
**Status:** Approved (prototype validated)
**Scope:** Yohaku web + admin (mx-admin-next) + mx-core

## 1. Context and Goals

The dev page `/gps-track` already renders a working `GpsTrackMap` component
(MapLibre GL + OpenFreeMap vector tiles, accent-colored route line,
auto-detected dwell stops, entrance animation, MP4 export). The goal of this
design is to **lift that prototype into a first-class authoring primitive**:

1. Add a Lexical node so authors can insert a map into any post / note /
   thinking via the rich-text editor.
2. Generalize the renderer from "GPS track only" to a unified **Map** node
   that can carry a track, user-defined POIs, or both — providing room for
   future use cases (multi-pin travel map, single-POI "you are here") without
   another schema migration.
3. Restyle the figcaption: primary line shows an author-supplied title;
   secondary line surfaces the auto date plus existing summary metrics.
4. Reverse-geocode stops/POIs so popovers display human-readable
   neighborhoods, not just lat/lon.

**Non-goals (this iteration):** POI input UI, server-side address
pre-baking, custom map tile sets, embedding video, real-time location.

## 2. Architecture and Data Flow

**Code placement:** **D — duplicate across repos**, no new published
package. `mx-admin-next` and `Yohaku/apps/web` each carry their own copy of
`MapNode.ts`, `gps-compress.ts`, and `MapBlock.tsx`. The Lexical node `type`
string is fixed at `'map'` so serialized post bodies travel unchanged
between repos. Drift is contained by this spec, which freezes field names
and constraints.

The static renderer (`@haklex/rich-static-renderer`) extends through
TypeScript declaration merging — `RendererConfig.Map` is augmented in each
repo's `map-augment.ts` side-effect import. No `@haklex` package needs to
change.

```
admin (mx-admin-next)              mx-core               Yohaku web
─────────────────────              ───────              ──────────
[Slash /map or drop .gpx]
   │
   ▼
[Insert dialog]
   ├ choose GPX (File)
   ├ client-side parseGpx        ← gps-compress.ts (port of scripts/compress-gps-track.mjs)
   ├ title input
   ├ ☐ Lossless toggle
   └ <MapBlock track={preview}/> ← live preview, reveal animation
        │ Lossless toggled → RDP rerun → re-init MapBlock
        ▼
   FormData { file: <slug>.json }
   POST /files/upload?type=file
                              ┌────────────────────┐
                              │ file.controller    │
                              │  if S3 enabled →   │── S3 PUT
                              │  bucket/file/...   │
                              │  else local fs     │
                              └────────┬───────────┘
        ◄────────────────────────────  │ { url, name }
        ▼
   editor.dispatchCommand(INSERT_MAP_COMMAND, { url, title })
   editor state ⊃ { type: 'map', version: 1, title, track: { url } }
        │
        ▼ persist post
                              ┌────────────────────┐
                              │ post API           │
                              └────────┬───────────┘
        ◄────────────────────────────  │
                                       ▼
                                  Yohaku reader fetches post
                                       │
                                       ▼
                                  <LexicalContent>
                                    static renderer
                                    ↳ Map slot → <YohakuMapRenderer>
                                       ↳ <MapBlock src={track.url}/>
                                          ↳ render line + stops + pois
                                          ↳ click stop → popover (with address)
```

### Duplicated artifacts

| File | mx-admin-next path | Yohaku web path |
|---|---|---|
| Node class | `src/components/editor/rich/map/MapNode.ts` | `src/components/ui/rich-content/map/MapNode.ts` |
| Insert plugin | `src/components/editor/rich/map/MapPlugin.tsx` | n/a (read-only) |
| Insert dialog | `src/components/editor/rich/map/InsertMapDialog.tsx` | n/a |
| GPX parser + compressor | `src/components/editor/rich/map/gps-compress.ts` | `src/lib/gps-compress.ts` |
| Map renderer | `src/components/editor/rich/map/MapBlock.tsx` | `src/components/ui/map-block/MapBlock.tsx` |
| Renderer config augment | `src/components/editor/rich/map/map-augment.ts` | `src/components/ui/rich-content/map/map-augment.ts` |
| Static renderer module | n/a | `src/components/ui/rich-content/map/yohaku-map-module.ts` |

The two `MapBlock.tsx` copies share the same prop shape (`MapBlockProps`).
Theme inputs (`isDark`, `accentHex`, `casingColor`) are props, not
hook-derived, so the renderer is portable. Each repo wires the props from
its own theme system.

## 3. Node Schema

### 3.1 SerializedMapNode (Lexical state)

```ts
type SerializedMapNode = {
  type: 'map'         // fixed
  version: 1
  title: string       // empty string allowed; falls back at render time

  track?: {
    url: string       // https URL of compressed track JSON
  }
  pois?: Array<{
    lat: number       // -90..90
    lon: number       // -180..180
    title?: string    // max 40 chars
    description?: string  // max 200 chars
    icon?: 'pin'      // v1 only; reserved enum
  }>
  view?: {
    center?: [number, number]  // [lon, lat], GeoJSON order
    zoom?: number              // 0..20
  }
}
```

### 3.2 Constraints

- At least one of `track` or `pois` must be present.
- `track.url` must use `https://` or `/files/` (relative local path).
- `pois.length` ∈ [1, 50]. `lat`/`lon` are required numeric; other POI
  fields are optional.
- `view.zoom` is clamped to `[2, 20]` at render time.
- `title` max length 80; trimmed on insert; empty falls back at render.

### 3.3 Track JSON schema (`track.url` content)

```ts
type TrackJson = {
  version: 1
  title: string                // GPX filename, decoupled from node title
  bounds: { minLat, maxLat, minLon, maxLon, diagonalMeters }
  distanceMeters: number
  originalCount: number
  sampledCount: number
  points: Array<[lat, lon, ele|null]>
  stops?: Array<{
    lat: number
    lon: number
    durationSec: number
    time: string                // ISO-8601 UTC
    visits: number
  }>
  startTimeMs?: number           // first GPS sample UTC ms (new in this spec)
  endTimeMs?: number             // last GPS sample UTC ms (new)
  timezoneOffsetMinutes?: number // from mytracks:timezone if present (new)
}
```

`compress-gps-track.mjs` and the client-side `gps-compress.ts` both emit
this shape. The `startTimeMs`/`endTimeMs`/`timezoneOffsetMinutes` fields
power the figcaption secondary line.

### 3.4 Versioning

- Either schema's `version` increments only on a breaking change
  (e.g., reshaping `points` or removing a required key).
- v1 readers must accept extra fields (forward-compatible).
- `MapNode.importJSON` dispatches on `version` and supplies defaults for
  missing optional fields.

### 3.5 Render-time fallbacks

```
title              missing → t('map.untitled')
trackJson missing  load error → "Failed to load track: <reason>"
stops              missing → no stop dots
pois               missing → no pins
view               missing → fitBounds(track.bounds ∪ pois)
view (no track, single poi) → center=poi, zoom=16
```

## 4. Insert Flow and Dialog

### 4.1 Triggers

- **Slash menu:** typing `/map` dispatches `INSERT_MAP_COMMAND` and opens
  the dialog.
- **Drag and drop:** dropping a `.gpx` file (detected by extension or
  `application/gpx+xml` MIME) onto the editor opens the dialog with the
  file pre-selected.
- **Paste:** clipboard-pasted `.gpx` files route through the drop handler.

### 4.2 Dialog state machine

```
idle    ─ file received  → parsing
        ─ closed         → done
parsing ─ ok             → ready (preview live)
        ─ error          → error (stay open, retry possible)
ready   ─ Lossless toggled → compressing → ready (preview re-inits)
        ─ submit         → uploading
        ─ title edited   → ready (no side effect)
uploading ─ ok           → inserting → done
          ─ error        → error
error   ─ retry          → parsing | uploading
        ─ cancel         → closed
```

### 4.3 Dialog layout

```
┌── Insert Map ─────────────────────────────┐
│  ┌─ Drop GPX or click to browse ────────┐ │
│  │  filename · size · status              │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  Title:    [______________________________] │
│  ☐ Lossless (full resolution)              │
│                                             │
│  ┌─ Preview ──────────────────────────────┐ │
│  │                                        │ │
│  │  <MapBlock track={previewTrack} />     │ │
│  │  height ~280px, entrance animation    │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  3,259 → 450 pts · 3.6 km · 8 stops         │
│                                             │
│              [Cancel]      [Insert ▸]       │
└─────────────────────────────────────────────┘
```

### 4.4 Client-side GPX pipeline (`gps-compress.ts`)

Port of `scripts/compress-gps-track.mjs` to ES modules with no Node
dependencies. Pure functions, ~200 lines total:

```ts
parseGpx(text: string): GpxPoint[]
detectStops(points: GpxPoint[], options?): TrackStop[]
simplifyToTarget(points: GpxPoint[], target: number): GpxPoint[]
totalDistance(points: GpxPoint[]): number
getBounds(points: GpxPoint[]): Bounds
buildTrackJson(points: GpxPoint[], title, options): TrackJson
```

- **Stops are always detected on full points** regardless of the Lossless
  toggle. The toggle only affects whether `points` get RDP-simplified.
- Default RDP target is 450, matching the current script. Lossless keeps
  all points (typically ~3,000 for a day of recording).

### 4.5 Preview sync

The dialog holds full parsed points and stops in component state. Toggling
Lossless recomputes `previewTrack.points` (full or simplified) without
re-parsing. The `MapBlock` `useEffect` keyed on `coordinates` triggers map
re-init and replays the reveal animation, giving authors immediate visual
feedback for both modes.

### 4.6 Submit

```
1. Build finalTrackJson from current toggle state.
2. Blob: new Blob([JSON.stringify(finalTrackJson)], { type: 'application/json' })
3. File: new File([blob], `${slug(title)}-${YYYYMMDD-HHmmss}.json`)
4. POST /files/upload?type=file (FormData) → { url, name }
5. editor.dispatchCommand(INSERT_MAP_COMMAND, { url, title })
6. Close dialog.
```

### 4.7 Error states

| Cause | UI |
|---|---|
| File is not a GPX (zero `<trkpt>`) | Inline error "Invalid GPX file", reselect enabled |
| Parser throws | Same error with stack hidden, retry enabled |
| File > 50 MB | "Track too large, please split" |
| Points > 50,000 | Same as above |
| Upload network error | "Upload failed: <message>", Retry button |
| Upload 4xx (auth, size, type) | Error text from API, no auto-retry |

### 4.8 Constraints summary

- File size: 50 MB raw GPX max.
- Point count: 50,000 max.
- Title: 80 chars max, defaults to GPX filename without extension.

## 5. mx-core S3 Extension

### 5.1 Current state

`POST /files/upload?type=image|file` (`apps/core/src/modules/file/file.controller.ts`):

- `type=image` + `imageStorageOptions.enable === true` → S3.
- `type=image` + S3 disabled → local fs.
- `type=file` → **always local fs.**

`ImageStorageOptionsSchema` already exposes `endpoint`, `secretId`,
`secretKey`, `bucket`, `region`, `customDomain`, `prefix` (with placeholder
support: `{Y}/{m}/{d}/{type}` etc).

### 5.2 Change

Extend the `type=file` branch to honor `imageStorageOptions.enable`. When
true, upload to the same S3 bucket; otherwise fall through to the existing
local write.

Refactor the controller so the config fetch and S3 path become a shared
lambda used by both branches. Pseudocode:

```ts
const uploadConfig = await configsService.get('fileUploadOptions')
const s3Config = await configsService.get('imageStorageOptions')
const s3Enabled = s3Config?.enable === true && hasRequiredS3Fields(s3Config)

if (s3Enabled) {
  return uploadToS3(req, type, s3Config, uploadConfig)
}
return uploadToLocal(req, type, uploadConfig)
```

### 5.3 Path layout

`imageStorageOptions.prefix` placeholders apply unchanged. `{type}`
expands to `image` or `file`, so a prefix of `blog/{Y}/{m}/{type}` yields:

```
type=image → blog/2026/06/image/abc.jpg
type=file  → blog/2026/06/file/2026-06-04-tokyo.json
```

No sub-typing within `file/` for v1. Future `type=track` (separate config)
remains an option if S3 buckets need to diverge.

### 5.4 fileReference table

`type=file` + S3 upload now creates a pending reference, matching the
image branch. Orphan cleanup then includes track JSONs that lose their
parent post.

### 5.5 Errors

- Missing S3 fields when `enable=true` → throw
  `FILE_STORAGE_NOT_CONFIGURED` (existing constant).
- S3 PUT failure → catch, throw `FILE_UPLOAD_FAILED` with original message.
- No new error codes.

### 5.6 Config UI copy

Admin settings page (`Image storage`) section: keep the field, refresh
description to "Used for image uploads and file uploads (including
embedded GPS track JSONs)". No new toggle.

### 5.7 Tests

`apps/core/src/modules/file/file.controller.spec.ts`:

- `type=file` + S3 enabled → uploads to S3, returns S3 URL, creates
  reference.
- `type=file` + S3 disabled → writes local, returns local URL, no
  reference.
- `type=file` + S3 enabled but config incomplete → 503/error code.

## 6. Rendering, Figcaption, and Animation

### 6.1 Component rename

```
GpsTrackMap            → MapBlock
GpsTrackMapProps       → MapBlockProps
GpsTrackData           → MapTrackData  (track JSON shape; no pois/view)
GpsTrackStop           → MapTrackStop
src/components/ui/gps-track/  → src/components/ui/map-block/
```

A deprecated `export { MapBlock as GpsTrackMap }` re-export keeps the dev
page and any internal imports building during the rename window.

### 6.2 MapBlock props

```ts
interface MapBlockProps {
  className?: string
  height?: number

  src?: string                  // fetches TrackJson
  track?: MapTrackData          // inline data (used by preview / SSR)

  pois?: MapPoi[]               // optional pins
  view?: MapView                // explicit viewport; auto fitBounds when omitted
  title?: string                // overrides trackJson.title
  locale?: string               // for date formatting; defaults to 'en'
  interactive?: boolean         // default true; admin preview/export sets false
  stopPopoverMinDurationSec?: number  // default 600 (10 min)
}
```

### 6.3 Render layer z-order

```
1. base style (positron / dark)
2. ROUTE_CASING        line, casing color
3. ROUTE_LINE          line, accent
4. STOPS_HALO          circle, accent 0.16
5. STOPS_DOT           circle, accent + white stroke
6. POIS_HALO           circle, accent 0.20, larger
7. POIS_PIN            circle, accent + white stroke 2.4px
8. POIS_LABEL          symbol, text-field POI title
```

Stops use a soft halo + dot to read as ambient annotations. POIs are
larger and carry text labels because they represent explicit author intent.

### 6.4 fitBounds union

```ts
function unionBounds(track?: MapTrackData, pois?: MapPoi[]): LngLatBounds
```

Combines the track bounds (if present) with the lat/lon extent of all
POIs. If `view.center` and `view.zoom` are both set, fitBounds is skipped.

### 6.5 Figcaption (B layout)

```
┌─── map canvas ───────────────────────────────────────┐
└──────────────────────────────────────────────────────┘
  Custom Title                                  [Export MP4]
  Date · 3.6 km · 450 pts · 8 stops
```

Structure:

```tsx
<figcaption className="border-t ...">
  <div className="flex items-start justify-between gap-2">
    <div className="min-w-0 flex-1 space-y-1">
      <div className="truncate text-sm font-medium">{displayTitle}</div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
        {dateLabel}
        {distanceLabel && <><span>·</span><span>{distanceLabel}</span></>}
        {countLabel && <><span>·</span><span>{countLabel}</span></>}
        {stopsCount > 0 && <><span>·</span><span>{stopsCount} stops</span></>}
      </div>
    </div>
    {exportable && <ExportButton ... />}
  </div>
</figcaption>
```

- `displayTitle = node.title || trackJson.title || t('map.untitled')`
- `dateLabel` = locale-formatted start date from
  `trackJson.startTimeMs` + `timezoneOffsetMinutes`. When the track is
  absent, the secondary line shows `${pois.length} places` instead.
- `exportable = !!track && coordinates.length >= 2`

### 6.6 Date formatting

```ts
new Intl.DateTimeFormat(intlLocale[locale], {
  dateStyle: 'long',
  timeZone: tzNameFromOffset(timezoneOffsetMinutes),
}).format(new Date(startTimeMs))
```

| locale | example (`2026-06-04T04:25:23Z` + JST `+540`) |
|---|---|
| zh | 2026年6月4日 |
| en | June 4, 2026 |
| ja | 2026年6月4日 |
| ko | 2026년 6월 4일 |

### 6.7 i18n keys

New namespace `apps/web/src/messages/{zh,en,...}/map.json`:

```
map.untitled
map.places              { count }
map.poi.untitled
map.stop.label          { duration }
map.stop.visits         { count }
map.stop.startsAt       { time }
map.popover.resolving
map.popover.close
```

### 6.8 Entrance animation

The current `animateReveal` model stands:

- Line draws over `REVEAL_DURATION_MS` (2200 ms) with ease-out-cubic.
- Stops appear synchronized with the path tip via precomputed
  `nearestCoordIdx`.

For POIs (no track): stagger reveal each pin at 80 ms intervals after the
map's first idle. For track + POIs: POIs stagger after the line completes.

### 6.9 MP4 export

Unchanged from the current prototype: exports the same reveal at 1920×1080
@ 30 fps, with both track and POIs included. Only available when a track
exists.

### 6.10 Dev page

`/gps-track` gains a third comparison card to validate the POI-only
fixture:

- Compressed (450 pts) — existing
- Full (3,259 pts) — existing
- POI-only — fixture `{ pois: [东京塔, 晴空塔, 新宿御苑], view: undefined }`

## 7. Popover (Validated via Prototype)

### 7.1 Behavior

- Click on `STOPS_LAYER` opens a popover anchored to the clicked feature.
- Click on `POIS_PIN` opens a popover for the POI.
- Click anywhere else closes the popover.
- `ESC` closes the popover.
- Cursor changes to `pointer` on hover over clickable features.
- Only stops with `durationSec >= stopPopoverMinDurationSec` (default 600)
  are clickable. Shorter stops still render as dots but reject clicks.

### 7.2 Anchor strategy

The prototype validated a self-rendered overlay anchored via
`map.project(lngLat)`:

```ts
useEffect(() => {
  if (!active) return
  const update = () => {
    const pt = map.project(active.lngLat)
    setScreen({ x: pt.x, y: pt.y })
  }
  update()
  map.on('move', update)
  map.on('zoom', update)
  return () => { map.off('move', update); map.off('zoom', update) }
}, [active])
```

Base UI `Popover` is intentionally bypassed: its Floating UI integration
does not observe MapLibre's transform-based panning. The prototype's
plain absolute-positioned div re-positions at 60 fps with no jank. For
this iteration the prototype shape ships; a future task can revisit if
accessibility (focus trap, screen reader semantics) requires the full
Base UI integration.

### 7.3 Content

Stop popover:

```
┌─────────────────────────────┐
│ Stop · 90 min · 11×    [×]  │
│ Starts at Jun 4, 13:25      │
│ Tokyo Tower · Shibakoen     │  ← reverse-geocoded
│ ─────────────────────────── │
│ 35.6243, 139.8884            │
└─────────────────────────────┘
```

POI popover:

```
┌─────────────────────────────┐
│ Sushi Ichiro           [×]  │
│ "Owner is super friendly"   │
│ Ginza · Chuo                │  ← reverse-geocoded (optional)
│ ─────────────────────────── │
│ 35.6712, 139.7625            │
└─────────────────────────────┘
```

### 7.4 Address resolution

Reverse geocode via **OSM Nominatim**:

```
GET https://nominatim.openstreetmap.org/reverse
    ?format=jsonv2&lat={lat}&lon={lon}&zoom=18
    &accept-language={navigator.language}
```

- Module-level `Map<string, string>` cache keyed by
  `${lat.toFixed(4)},${lon.toFixed(4)}` (~11 m precision) prevents
  duplicate requests within a session.
- Three popover states: `loading` ("Resolving address…"), `ok` (address
  shown), `error` (silently omitted).
- Compose displayed line from `name + (suburb | neighbourhood | city)`,
  falling back to `display_name`.

### 7.5 Rate limit and ToS

Nominatim public service caps requests at **1 req/sec per IP** with a ToS
that prohibits "heavy use". Acceptable for a personal blog with infrequent
reader clicks. For higher traffic, the future work in §8 includes
server-side pre-baking of addresses into the track JSON.

### 7.6 Animation interaction

Popovers are disabled during the entrance animation
(`revealedRef.current === false`). Once the line and stops finish their
reveal, clicks are accepted.

## 8. Out of Scope (this iteration)

- POI input UI in the editor dialog (designed in §3 / reserved in
  `pois`, but the dialog only exposes the track flow in v1).
- Custom map styles (third-party tile providers, custom JSON styles).
- Heatmap / density layers.
- Real-time location updates.
- POI search via Nominatim's forward geocoder.
- Native Base UI Popover with full focus trap (revisit if a11y audit
  requires).
- Server-side pre-baking of addresses into track JSON (Nominatim run at
  upload time, results embedded). Documented as future work.
- A shared npm package for `MapBlock` — current decision is duplication;
  re-evaluate when a third consumer needs the component.

## 9. Open Questions

1. **Track JSON storage path.** Current decision uses
   `imageStorageOptions.prefix` placeholders so `{type}` resolves to
   `file`. If admins want a dedicated `tracks/` segment, a follow-up can
   introduce `type=track` or a per-type prefix override. Not blocking v1.
2. **Popover trigger (hover vs click).** This spec settles on click-only.
   If desktop testing reveals a need for hover previews, a future
   iteration can layer a hover state on top.
3. **Lossless default.** v1 ships with the toggle off (450-point
   compression). After authors use it for a few weeks, revisit whether
   the default should change.

## 10. Acceptance Criteria

- [ ] Author can type `/map` in admin's rich editor and open the Insert
      Map dialog.
- [ ] Author can drag a `.gpx` file into the editor and open the same
      dialog.
- [ ] The dialog parses the GPX client-side, shows a live `MapBlock`
      preview, and re-runs the reveal animation when the Lossless toggle
      flips.
- [ ] On Insert, the dialog uploads the JSON to `/files/upload?type=file`
      and, when S3 is enabled in mx-core, the file lands in the S3 bucket.
- [ ] The inserted node round-trips through Lexical serialization
      (`type: 'map', version: 1, title, track.url`).
- [ ] Yohaku web renders the node via the static renderer, showing the
      `MapBlock` with line, stops, and figcaption as designed.
- [ ] Figcaption shows the custom title on line 1; date + distance + pts
      + stops count on line 2.
- [ ] Clicking a qualifying stop opens a popover with duration, start
      time, reverse-geocoded address, and lat/lon. Pan/zoom keeps the
      popover anchored.
- [ ] Pressing ESC or clicking empty map closes the popover.
- [ ] Existing dev page comparison cards still render unchanged; new
      POI-only fixture renders correctly with auto fitBounds.
