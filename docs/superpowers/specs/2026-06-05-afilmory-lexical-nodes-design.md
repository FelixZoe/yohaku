# Afilmory Lexical Nodes — Design

Status: Phase A implemented; Phase C (editor picker) pending brainstorm.
Date: 2026-06-05
Codebase: apps/web (Yohaku); external integration target: https://innei.afilmory.art (and other afilmory deployments)

## Goal

Allow Yohaku authors to embed photos from any afilmory deployment in lexical rich content, either as a single photo or as a collection (handpicked list or dynamic filter). Render with afilmory brand attribution and link back to the source gallery so readers can explore further.

## Non-goals

- Hosting or proxying photo metadata in mx-core. The renderer talks to afilmory's public API directly.
- Persisting per-photo snapshots in the node. Schema is API-driven; the manifest fetch is the source of truth.
- Authoring UX (picker, slash command, drag-drop). Tracked separately as Phase C.

## Architecture summary

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│ Yohaku lexical doc          │         │ afilmory deployment          │
│ (post / note / page body)   │         │ e.g. innei.afilmory.art      │
│                             │         │                              │
│  afilmory-photo node        │ fetch   │  GET /api/manifest           │
│  { id, baseUrl, ... }       │────────▶│  → { version, data: [...] }  │
│                             │ TanStack│                              │
│  afilmory-collection node   │ Query   │  (CORS open, cf-cache DYNAMIC│
│  { baseUrl, source, ... }   │ 6h stale│   ~360KB ungzipped)          │
└─────────────────────────────┘         │                              │
                                        │  detail: /photos/:id         │
            "View on afilmory ↗"        │  filter URL (bidirectional): │
            ──────────────────────────▶ │  /?tags=…&cameras=…&tag_mode=│
                                        │      union|intersection      │
                                        │      &from=…&to=…&lenses=…   │
                                        └──────────────────────────────┘
```

Key decisions and their rationale:

1. **No mx-core binding table.** Earlier draft proposed an `Integration` table to centrally manage gallery configs; dropped because: (a) the node already snapshots `baseUrl`, so the renderer never needs to look up a binding, and (b) for a single-owner blog the binding list is realistically one entry. YAGNI — a `site.config.afilmory.galleries` array was also rejected as premature. The editor picker (Phase C) will let the author paste a `baseUrl` and remember the last one in `localStorage`; the node stores the resolved `baseUrl` verbatim.

2. **API-driven schema, not metadata snapshot.** The node stores only the photo `id` and `baseUrl`. Width, height, EXIF, thumbnail URL all come from afilmory at render time. Pros: zero drift when the author re-edits a photo on afilmory; one fetch is shared across every afilmory node on the page via TanStack Query cache. Cons: requires a network round-trip on first render (cached 6h, retained 12h). Two endpoints are used depending on the node:
   - Single photo → `GET /api/manifest/photos/:id` (added upstream — see "Upstream endpoint" below). Returns one `PhotoManifestItem`. Cheap per-render even before query cache warms up.
   - Collection (both `list` and `filter` sources) → `GET /api/manifest` (full payload, ~360KB un-gzipped / ~60-80KB gzipped). Filter source needs the full set to evaluate client-side; list source could batch by id but for now shares the manifest query so 6h cache works across the page.

3. **Two node types, not one.** Single photo (`afilmory-photo`) gets a polaroid card; collection (`afilmory-collection`) gets a gallery frame with grid/masonry/carousel layouts. Merging them under one node would force the renderer to branch on `photoIds.length === 1`, blur the schema, and complicate the picker. Keeping them split costs one extra Lexical type but keeps each renderer focused.

4. **Filter URL contract aligned with afilmory.** Collection's "View All ↗" deep-links to afilmory's gallery view using the same query-param schema afilmory uses to drive its own URL-synced filters (`tags`, `cameras`, `lenses`, `tag_mode`, `from`, `to`). This makes the cross-app handoff lossless. Verified against `afilmory/apps/web/src/pages/(main)/layout.sync.tsx` (URL is the source of truth for gallery filters).

5. **`cameras` and `lenses` filter values use afilmory's display-name convention** — `${Make} ${Model}` for cameras, `${LensMake} ${LensModel}` (or just `${LensModel}` if no make) for lenses. This matches `afilmory/apps/web/src/hooks/usePhotoViewer.ts:53`. The yohaku-side matcher (`matchesFilter`) uses the same display string so demo-page filter hits and afilmory cross-link hits stay consistent.

## Data contracts

### `afilmory-photo` (single)

```ts
type SerializedAfilmoryPhotoNode = {
  type: 'afilmory-photo'
  version: 1
  id: string              // photo id, e.g. 'DSCF6094'
  baseUrl: string         // gallery origin, e.g. 'https://innei.afilmory.art'
  caption?: string        // author override; falls back to photo.description
  alt?: string            // author override; falls back to caption / title / id
  accent?: string         // optional --afilmory-accent CSS var
}
```

### `afilmory-collection` (multi)

```ts
type AfilmoryCollectionFilter = {
  tags?: string[]                              // matched against photo.tags
  cameras?: string[]                           // "Make Model" display names
  lenses?: string[]                            // "LensMake LensModel" display names
  dateFrom?: string                            // ISO date inclusive lower bound
  dateTo?: string                              // ISO date inclusive upper bound
  search?: string                              // case-insensitive substring on title+description
  tagMode?: 'union' | 'intersection'           // default 'union'
}

type AfilmoryCollectionSource =
  | { kind: 'list'; ids: string[] }
  | { kind: 'filter'; filter: AfilmoryCollectionFilter }

type SerializedAfilmoryCollectionNode = {
  type: 'afilmory-collection'
  version: 1
  baseUrl: string
  source: AfilmoryCollectionSource
  layout?: 'grid' | 'masonry' | 'carousel'     // default 'grid'
  limit?: number                               // default 24 for list, 12 for filter
  title?: string                               // shown in header
  caption?: string                             // shown as figcaption below body
  accent?: string
}
```

`source.kind` is mutually exclusive: a node is either a curated `list` (frozen order, never grows) or a dynamic `filter` (re-evaluated against the manifest on every render — afilmory adds matching photos and they appear automatically).

## Renderer behavior

### Polaroid (single photo)

- Centered card, `max-w-[440px]`, white in light mode (`bg-white`), `bg-neutral-2` in dark.
- Padding `12px 12px 52px` reserves space at the bottom for the static caption + watermark.
- Hover: lifts `-3px` and tilts `-0.4deg`; shadow elevates. Transition uses `transition-[translate,rotate,box-shadow]` because Tailwind v4 promotes `translate` / `rotate` to standalone properties, not composed into `transform`.
- `<a target="_blank">` wraps the whole card; click navigates to `${baseUrl}/photos/${id}`.
- Hover overlay on the image area: top corner AFILMORY badge (solid `rgba(0,0,0,0.55)` background, **no backdrop-filter** — flicker bug under parent `transform` in Chromium) + `View ↗`; bottom two lines of EXIF (camera + lens, then focal/aperture/shutter/iso).
- Static bottom: `{id} · {model} @ {focal}` mono + watermark "AFILMORY" mono micro.
- Photo image rendered with `borderRadius: 0` inline style — overrides haklex foundation's `.r8uj4t2 img { border-radius: var(--rc-radius-md) }` global.
- Aspect ratio comes from manifest `width / height` directly (already post-orientation in afilmory's manifest); do NOT also apply `exif.Orientation` swap.

### Collection

- Frame: `bg-neutral-1` / `dark:bg-neutral-2`, `rounded-xl`, `overflow-hidden`, `ring-1 ring-border`.
- Header (variant B — single-row): left column with `title` (`text-sm font-semibold`) and `summary` (`font-mono text-[10px] text-neutral-6`, e.g. `12 photos · #日本 · 📷 X-T5`); right cluster with `AFILMORY` chip (glyph + mono micro) + `1px × 12px` separator + `VIEW ALL ↗` (mono uppercase, hover→accent).
- Body:
  - `grid`: CSS columns 2/3/4 (sm/md), gap 1.5; tiles use **natural aspect** from manifest; tiles are direct-`<a>` to detail page with hover scale + EXIF id overlay.
  - `masonry`: CSS columns 2/3/4, gap 1; same tile component as grid (grid and masonry differ only in gap density).
  - `carousel`: horizontal flex row, each tile fixed `220px` height, width derived from natural aspect, `overflow-x-auto`.
- All tile images have `borderRadius: 0` inline override.
- Skeleton: mixed heights (180/240/200/280/160/220) to mimic masonry feel; carousel skeleton uses fixed `220×300` placeholders.
- Empty state: "No photos matched" in mono micro centered inside `min-h-[120px]` body area.
- Error state: surface `error.message` from the failed manifest fetch.

### Filter / select algorithm

```ts
selectPhotos(manifest, source, limit):
  if source.kind === 'list':
    photos = source.ids.map(id => find by id).filter(present)   // preserve author order
  else:
    photos = manifest.data.filter(matchesFilter).sort(by dateTaken desc)
  return photos.slice(0, limit ?? defaults)

matchesFilter(p, f):
  tags:    photoTags ∩ f.tags ≠ ∅  (union)  OR  f.tags ⊆ photoTags  (intersection)
  cameras: `${Make} ${Model}` ∈ f.cameras
  lenses:  `${LensMake} ${LensModel}` ∈ f.lenses (fallback to LensModel)
  date:    dateFrom ≤ dateTaken ≤ dateTo
  search:  lowercase substring on `title + ' ' + description`
```

Defaults: `limit ?? 24` for `list`, `limit ?? 12` for `filter`.

## File inventory

New files (all under `apps/web/src/components/ui/rich-content/afilmory/`):

```
afilmory-augment.ts          - Module augmentation for haklex's RendererConfig
                               (slot keys: 'AfilmoryPhoto', 'AfilmoryCollection')
afilmory-photo-node.ts       - DecoratorNode subclass for single photo
afilmory-collection-node.ts  - DecoratorNode subclass for collection
AfilmoryPhotoRenderer.tsx    - Polaroid renderer (client-only)
AfilmoryCollectionRenderer.tsx - Header + grid/masonry/carousel body
use-afilmory-manifest.ts     - TanStack Query hook: useAfilmoryManifest,
                               useAfilmoryPhoto; types AfilmoryManifest*
_shared.tsx                  - resolveAssetUrl, buildPhotoDetailHref,
                               buildFilterHref, AfilmoryGlyph (camera + film SVG)
yohaku-afilmory-module.ts    - Exports yohakuAfilmoryModule (RichRendererModule)
                               registering both nodes + both renderers
```

Modified files:

```
apps/web/src/components/ui/rich-content/LexicalContent.tsx
  - Import + register yohakuAfilmoryModule in composeRenderer's modules

apps/web/src/app/[locale]/(dev)/lexical/_fixtures/helpers.ts
  - Add afilmoryPhoto({ id, baseUrl, ... }) and afilmoryCollection({ ... }) builders

apps/web/src/app/[locale]/(dev)/lexical/_fixtures/node-cases.ts
  - Add single 'afilmory-photo' case under 'media' (cross-link to /afilmory page)
```

New demo page:

```
apps/web/src/app/[locale]/(dev)/lexical/afilmory/page.tsx
apps/web/src/app/[locale]/(dev)/lexical/afilmory/_fixtures.ts
  - 10 cases grouped: single (bare, captioned), list (handpicked, titled),
    filter (tag-union, tag-intersection, camera, combined),
    layout (masonry, carousel)
```

## Upstream endpoints

Added in `afilmory/be/apps/core/src/modules/content/manifest/`:

- `manifest.service.ts`
  - `getPhoto(photoId)` — single. `where(tenantId, photoId)` row lookup; secure-access URL transform; returns `PhotoManifestItem | null`; in-place migration via `persistManifestUpgrades` when version drift detected.
  - `getPhotosByIds(photoIds)` — batch. `where(tenantId, photoId IN (...))` row lookup; preserves input order; drops missing ids silently.
  - `searchPhotos(query)` — server filter mirroring `afilmory/apps/web/src/hooks/usePhotoViewer.ts:21-117`: tags union/intersection (`tagMode`), cameras (display name `${Make} ${Model}`), lenses (`${LensMake} ${LensModel}` with fallback), `rating >= threshold`, date range (UTC parsing of `dateTaken / exif.DateTimeOriginal / lastModified`), sort asc/desc by date, `limit + offset` pagination. Returns `{ data: PhotoManifestItem[], total: number }`. Internally loads the full manifest then filters in JS — acceptable for current scale (single-tenant, few-thousand photos); SQL-level filter is a future optimization.
  - Private helpers `resolveSecureAccessEnabled()` and `applySecureAccessTransform(item, storageProvider, secureAccessEnabled)` extracted to DRY the three callsites.

- `manifest.public.controller.ts`
  - `@Get('photos')` → `getPhotosByIds(query.ids)`, query param `ids=a,b,c` (zod-validated, comma-separated, ≥1 id).
  - `@Post('photos/search')` → `searchPhotos(body)`. POST with JSON body — avoids the URL-length cap when an author selects many tags/cameras at once and keeps the params as a real object (no comma-split / type coercion). Body shape mirrors `AfilmorySearchQuery` (camelCase `tagMode`, etc.); zod validates `tags`/`cameras`/`lenses` as `string[]`, `from`/`to` as `YYYY-MM-DD`, `rating` 1–5, `limit` ≤100.
  - `@Get('photos/:id')` → `getPhoto(id)`, throws `BizException(ErrorCode.COMMON_NOT_FOUND)` on miss.

Routes (all public, tenant-scoped via host/header resolution):

- `GET /api/manifest` — full manifest (existing, unchanged)
- `GET /api/manifest/photos?ids=…` — batch by ids → `PhotoManifestItem[]`
- `POST /api/manifest/photos/search` — JSON body filter → `{ data, total }`
- `GET /api/manifest/photos/:id` — single → `PhotoManifestItem` (404 on miss)

Yohaku-side hooks (`apps/web/src/components/ui/rich-content/afilmory/use-afilmory-manifest.ts`):

- `useAfilmoryPhotoDirect(baseUrl, id)` — single photo via `/photos/:id`. Query key `['afilmory-photo', baseUrl, photoId]`.
- `useAfilmoryPhotosByIds(baseUrl, ids)` — batch via `/photos?ids=…`. Query key `['afilmory-photos-by-ids', baseUrl, ids]`. Disabled when `ids.length === 0`.
- `useAfilmoryPhotosSearch(baseUrl, params)` — filter via `POST /photos/search`. `AfilmorySearchParams` shape mirrors the backend body (`tags`, `tagMode`, `cameras`, `lenses`, `rating`, `dateFrom`, `dateTo`, `sort`, `limit`, `offset`). `toRequestBody` maps the client-side `dateFrom`/`dateTo` to backend `from`/`to` and drops undefined keys.
- All hooks share same cache profile: `staleTime 6h`, `gcTime 12h`, `refetchOnWindowFocus false`, `retry 1`.

Renderer integration is **deferred** until the upstream backend is deployed. Once `innei.afilmory.art` (or whatever target gallery) has the new routes:

- `AfilmoryPhotoRenderer` switches from `useAfilmoryPhoto` to `useAfilmoryPhotoDirect`.
- `AfilmoryCollectionRenderer` switches: `source.kind === 'list'` → `useAfilmoryPhotosByIds`; `source.kind === 'filter'` → `useAfilmoryPhotosSearch`. The client-side `selectPhotos` / `matchesFilter` helpers become unused and can be deleted.

All swaps are surface-level — the returned shape is `PhotoManifestItem` / `PhotoManifestItem[]` in both worlds, so no schema change reaches the node serialization.

Future upstream work (not in this round):

- `GET /api/manifest?lite=1` — manifest variant that drops `exif` detail / `toneAnalysis` / `thumbHash` for picker-thumb listing use case (saves on the one remaining bulk-manifest call: the editor picker's gallery browse mode).
- SQL-level filter for `searchPhotos` once tenant photo counts exceed the JS-filter sweet spot (~10K photos).

## Phase C — editor picker (TBD)

Not designed yet. Open questions to brainstorm:

- **Trigger**: toolbar button vs `/afilmory` slash command vs both. Slash is keyboard-fast; toolbar is discoverable.
- **Modal shape**: full grid picker vs split layout (filters left, results right) vs cmd-k style fuzzy list.
- **Filter UI inputs**: free-text tag chips, camera/lens dropdowns sourced from manifest aggregation, date range picker. Need to decide which filters are first-class in v1 vs deferred.
- **Insert mode**: single click inserts immediately, or multi-select then confirm. For collection: switch between "list source" (drag to reorder selected) and "filter source" (preview hit count live).
- **`baseUrl` source**: localStorage of last-used + text input on first open; or surface a small "(change gallery)" affordance even after first use.
- **Picker host**: build inside `@haklex/rich-editor` as a plugin, or build in `@yohaku/web` and dispatch a custom command into the editor.

These should be brainstormed before writing the implementation plan for Phase C.

## Out of scope (deliberate)

- Static rendering / SSR prefetch of the manifest. The current behavior — first paint shows a skeleton, content arrives on hydration — is acceptable for blog posts. Server-side prefetching is a future optimization that would need a `dehydrate(queryClient)` boundary at the post page level.
- thumbHash blur placeholder. The manifest provides `thumbHash` for each photo; not decoded by the renderer yet. Could be added with a small client-side decoder for nicer LCP.
- Single photo's `originalUrl` is not used because afilmory frequently serves it in HIF/HEIF formats that browsers cannot decode without the afilmory webgl viewer; clicks open the detail page in a new tab instead.
- Layout `auto` (responsive: collection chooses masonry vs grid based on photo count) — kept explicit for predictability.
