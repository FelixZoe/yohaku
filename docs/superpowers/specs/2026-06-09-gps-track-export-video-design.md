# GPS Track Export Video Design

**Date:** 2026-06-09
**Status:** Draft for review
**Scope:** Yohaku `MapBlock` GPS track video export
**Supersedes:** The export behavior described in
`docs/superpowers/specs/2026-06-05-map-node-design.md` §6.9

## 1. Summary

The GPS track export should produce a short, shareable route video rather than a
literal replay of GPS samples. The exported video uses a fixed cinematic
timeline, reveals the route by geographic distance, follows the active route
segment for long routes, then returns to a full route overview before the final
hold frame.

This design keeps the existing `MapBlock` data model, offscreen MapLibre
renderer, and Mediabunny MP4 output. It replaces the current point-count-based
timeline with an explicit video timeline and a camera choreography model.

```text
┌──────────────┐
│ Export Video │
└──────┬───────┘
       ▼
┌──────────────────────────┐
│ Preview export settings  │
└──────┬───────────────────┘
       ▼
┌──────────────────────────┐
│ Render cinematic timeline│
└──────┬───────────────────┘
       ▼
┌──────────────────────────┐
│ Download MP4             │
└──────────────────────────┘
```

## 2. Goals

- Produce a visually legible short video for social sharing or article
  presentation.
- Keep export duration independent of raw GPS point count.
- Make long routes readable by following the active segment during reveal.
- End every export on a full route overview so the viewer understands the whole
  journey.
- Preserve existing `MapBlock` rendering semantics for route, stops, POIs, dark
  mode, and title metadata.

## 3. Non-goals

- Faithful real-time GPS replay.
- Audio, captions, voice-over, or music.
- Full video editing controls.
- Server-side rendering or queued export jobs.
- Persisted export presets in the map node schema.
- POI-only video export. The v1 export remains available only when a track has
  at least two valid coordinates.

## 4. Product Interaction

### 4.1 Entry Point

The figcaption action remains a single primary action:

```text
Custom Title                                  [Export Video]
Date · 3.6 km · 450 pts · 8 stops
```

Clicking `Export Video` opens an export dialog. It should not immediately start
encoding, because export can take several seconds, can fail due to browser
support, and benefits from an explicit preview of the chosen timeline.

### 4.2 Export Dialog

```text
┌── Export Video ─────────────────────────────┐
│                                             │
│  ┌─ Preview ─────────────────────────────┐  │
│  │  16:9 route animation preview          │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  Duration       [4s] [6s] [10s]             │
│  Camera         [Auto follow] [Overview]    │
│                                             │
│  More                                       │
│    Theme        Current / Light / Dark      │
│    Labels       Minimal / Stops + POIs      │
│                                             │
│                         [Cancel] [Export]   │
└─────────────────────────────────────────────┘
```

Default settings:

| Setting | Default | Rationale |
| --- | --- | --- |
| Duration | `6s` | Short enough for sharing; long enough for a readable reveal |
| Camera | `Auto follow` | Handles short and long routes without requiring author judgment |
| Theme | `Current` | Matches the rendered article context |
| Labels | `Stops + POIs` | Preserves author intent and existing map annotations |

The dialog preview should use the same timeline model as the final export, but
it does not need to encode frames. A low-cost MapLibre preview is sufficient.

### 4.3 Rendering State

After the author confirms export, the dialog enters a rendering state:

```text
┌── Export Video ─────────────────────────────┐
│ Rendering 42%                               │
│                                             │
│ [Cancel]                                    │
└─────────────────────────────────────────────┘
```

If cancellation is implemented, it cancels future frame generation, finalizes no
file, removes the offscreen map, and returns to the settings state.

## 5. Video Timeline

The export timeline is fixed by duration and frame rate, not by point count.
The default output remains `1920x1080`, `30fps`, MP4/H.264 through WebCodecs and
Mediabunny.

### 5.1 Default 6s Timeline

| Phase | Time | Visual state | Camera |
| --- | ---: | --- | --- |
| Establish | 0.0s-0.6s | Empty or faint route context | Full route bounds |
| Reveal | 0.6s-4.6s | Route draws by distance | Sliding route window |
| Return | 4.6s-5.4s | Route fully drawn | Ease back to full route bounds |
| Hold | 5.4s-6.0s | Full route, stops, POIs | Full route bounds |

For 4s and 10s presets, establish and hold remain short while reveal receives
most of the additional or removed time.

### 5.2 Route Progress

Route progress is distance-based:

1. Convert coordinates to a cumulative distance table.
2. For each frame, compute normalized timeline progress.
3. Convert reveal progress to a target distance.
4. Interpolate the route head coordinate at that distance.
5. Draw all complete segments before the head plus the interpolated head point.

This prevents dense GPS sampling from visually slowing down one part of the
route while sparse sampling accelerates another.

```text
┌──────────────┐
│ Coordinates  │
└──────┬───────┘
       ▼
┌──────────────────────┐
│ Cumulative distances │
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ Time → distance      │
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ Revealed route head  │
└──────────────────────┘
```

### 5.3 Stop and POI Reveal

Stops use their nearest route distance. A stop becomes visible when the route
head reaches or passes that distance.

POIs remain part of the map data throughout the export. The `Labels` setting
controls whether label layers are rendered. V1 does not need independent POI
fade timing; the camera movement and final overview provide sufficient context.

## 6. Camera Choreography

### 6.1 Camera Modes

| Mode | Behavior |
| --- | --- |
| Auto follow | Establish full route, follow a sliding route segment during reveal, return to overview |
| Overview | Keep full route bounds for the entire export |

`Auto follow` is the default. `Overview` exists for short routes, presentation
consistency, or cases where camera motion is undesirable.

### 6.2 Full Overview Camera

The overview camera fits the union of:

- all route coordinates;
- all stops;
- all POIs.

It uses the same conceptual bounds as the rendered map's `unionBounds`, with
export-specific padding for a 16:9 canvas.

### 6.3 Sliding Window Camera

During reveal, the camera fits a moving route window around the current route
head. The window is defined by distance, not by point count.

Recommended initial rule:

```ts
windowDistance = clamp(totalDistance * 0.12, 3_000, 120_000)
```

The visible window includes route coordinates from:

```text
currentDistance - windowDistance * 0.45
to
currentDistance + windowDistance * 0.55
```

The slight forward bias gives the viewer more context in the direction of
travel.

### 6.4 Camera Smoothing

The export renderer should not call `fitBounds` abruptly for every frame.
Instead, it should compute a target camera for the current phase and interpolate
from the previous frame's camera.

| Property | Interpolation |
| --- | --- |
| Center | Linear interpolation in longitude/latitude |
| Zoom | Linear interpolation |
| Bearing | Fixed at `0` in v1 |
| Pitch | Fixed at `0` in v1 |

The return phase interpolates from the final follow camera to the overview
camera while the full route remains visible.

```text
┌──────────────┐
│ Overview     │
└──────┬───────┘
       ▼
┌──────────────┐
│ Follow route │
└──────┬───────┘
       ▼
┌──────────────┐
│ Overview     │
└──────────────┘
```

## 7. Export Renderer Changes

### 7.1 Current Behavior to Replace

The current export uses:

```ts
totalFrames = coordinates.length
```

This produces duration drift:

| Track | Points | Duration at 30fps |
| --- | ---: | ---: |
| Compressed sample | 450 | 15s |
| Full sample | 3,259 | 108.6s |

This behavior must be replaced by fixed-duration frame generation.

### 7.2 New Export Options

```ts
interface TrackVideoExportOptions {
  cameraMode: 'auto-follow' | 'overview'
  durationSec: 4 | 6 | 10
  labelMode: 'minimal' | 'stops-and-pois'
  themeMode: 'current' | 'light' | 'dark'
}
```

These options are runtime-only in v1. They do not change `SerializedMapNode`.

### 7.3 Frame Loop

```text
for each frame:
  time = frame / fps
  phase = resolveTimelinePhase(time, duration)
  revealDistance = resolveRevealDistance(phase, totalDistance)
  route = sliceRouteAtDistance(coordinates, revealDistance)
  stops = stopsBeforeDistance(revealDistance)
  camera = resolveCamera(phase, cameraMode, revealDistance)
  set map camera
  set route/stops/POI data
  wait for render
  add canvas frame
```

Progress reported to the dialog is based on frame count plus finalization:

| Stage | Progress allocation |
| --- | ---: |
| Preparing map and tiles | 0-10% |
| Rendering frames | 10-90% |
| Finalizing MP4 | 90-100% |

## 8. Error Handling

| Condition | Behavior |
| --- | --- |
| WebCodecs unsupported | Disable export and show browser support text |
| No track or fewer than 2 coordinates | Hide `Export Video` |
| Tile load timeout before first frame | Show export error; do not encode a blank video |
| Frame render failure | Abort export, remove offscreen map, show error |
| Empty MP4 buffer | Treat as export failure |
| User cancels | Remove offscreen map and return to settings |

Tile preparation should use an explicit timeout. A failed export is preferable
to silently downloading a partially blank video.

## 9. Accessibility and Copy

Primary labels:

| Key | English copy |
| --- | --- |
| `map.export.action` | Export Video |
| `map.export.title` | Export Video |
| `map.export.duration` | Duration |
| `map.export.camera` | Camera |
| `map.export.cameraAuto` | Auto follow |
| `map.export.cameraOverview` | Overview |
| `map.export.labels` | Labels |
| `map.export.theme` | Theme |
| `map.export.rendering` | Rendering {progress}% |
| `map.export.cancel` | Cancel |
| `map.export.confirm` | Export |

The dialog must be keyboard accessible, trap focus while open, and return focus
to the figcaption action after close.

## 10. Implementation Notes

Likely file boundaries:

| File | Responsibility |
| --- | --- |
| `MapBlock.tsx` | Open dialog, pass track data and current colors/theme |
| `MapExportDialog.tsx` | Settings, preview, rendering state, cancellation |
| `map-block-export.ts` | MP4 generation and offscreen MapLibre renderer |
| `map-block-video-timeline.ts` | Pure timeline, distance, stop reveal, camera calculations |
| `map-block-layers.ts` | Existing route/stops/POI source and layer helpers |

Timeline and camera calculations should be pure functions so they can be tested
without MapLibre or WebCodecs.

## 11. Testing Strategy

Behavior-oriented tests:

- distance-based progress produces equal geographic progress despite uneven
  point density;
- `sliceRouteAtDistance` includes an interpolated head point;
- stops reveal only after their nearest route distance is reached;
- `auto-follow` returns to overview in the return and hold phases;
- `overview` mode uses full bounds for all phases;
- duration presets produce the expected frame counts.

Browser verification:

- compressed Tokyo sample exports a short video;
- full Tokyo sample exports approximately the same duration as the compressed
  sample;
- synthetic long route crosses a large geographic span and visibly follows the
  active segment;
- final frame shows the complete route;
- unsupported-browser state is reachable by feature mocking.

Avoid snapshot tests that merely restate static option tables or internal
constant maps. The tests should validate externally meaningful video-timeline
behavior.

## 12. Acceptance Criteria

- `Export Video` opens an export dialog instead of immediately downloading a
  file.
- The default export is `6s`, `Auto follow`, `Current` theme, and `Stops + POIs`.
- Export duration is fixed by preset and does not scale with point count.
- Route reveal is based on cumulative distance, not point index.
- Long routes use a sliding route-window camera during reveal.
- The camera eases back to full route overview after reveal.
- The final hold frame shows the complete route, stops, and POIs.
- Export errors are visible and do not leave orphaned offscreen maps.
- The existing map node schema remains unchanged.
