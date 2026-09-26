# GPS Track Export Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing GPS track MP4 export with a fixed-duration cinematic export flow with an export dialog, distance-based route reveal, and an auto-follow camera that returns to overview.

**Architecture:** Add a pure timeline module for distance, route slicing, stop reveal, phase resolution, and camera intent calculation. Update the existing offscreen MapLibre/Mediabunny exporter to consume those pure results, then wrap export settings and progress in a focused `MapExportDialog` opened from `MapBlock`.

**Tech Stack:** React 19, Next.js app frontend, MapLibre GL, Mediabunny, WebCodecs, Vitest, Tailwind utility classes, `motion/react`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/src/components/ui/map-block/map-block-video-timeline.ts` | Pure geometry, distance, timeline, stop reveal, and camera calculations |
| `apps/web/src/components/ui/map-block/map-block-video-timeline.test.ts` | Behavior-oriented tests for fixed timeline and camera semantics |
| `apps/web/src/components/ui/map-block/map-block-export.ts` | Offscreen MapLibre renderer, MP4 frame loop, progress, cancellation, and runtime export options |
| `apps/web/src/components/ui/map-block/MapExportDialog.tsx` | Settings dialog, rendering state, cancellation, and download handoff |
| `apps/web/src/components/ui/map-block/MapBlock.tsx` | Replace direct export button with dialog entry and dialog state |

## Task 1: Pure Timeline and Camera Module

**Files:**
- Create: `apps/web/src/components/ui/map-block/map-block-video-timeline.ts`
- Create: `apps/web/src/components/ui/map-block/map-block-video-timeline.test.ts`

- [ ] **Step 1: Add behavior tests**

Create tests covering cumulative distance, route slicing, stop reveal, phase resolution, and camera mode semantics.

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm exec vitest run src/components/ui/map-block/map-block-video-timeline.test.ts
```

- [ ] **Step 3: Implement the pure module**

Implement `buildDistanceTable`, `totalDistanceOf`, `sliceRouteAtDistance`, `stopsBeforeDistance`, `resolveTimelinePhase`, and `resolveVideoCameraBounds`.

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm exec vitest run src/components/ui/map-block/map-block-video-timeline.test.ts
```

## Task 2: Update MP4 Exporter

**Files:**
- Modify: `apps/web/src/components/ui/map-block/map-block-export.ts`

- [ ] **Step 1: Add export option types and cancellation signal**

Add `TrackVideoExportOptions`, `TrackVideoLabelMode`, `TrackVideoThemeMode`, and an optional `AbortSignal`.

- [ ] **Step 2: Replace point-count frame loop**

Use fixed frame counts from `durationSec * EXPORT_FPS`, resolve timeline phase per frame, and draw `sliceRouteAtDistance`.

- [ ] **Step 3: Add camera movement**

Resolve camera bounds per frame, fit the offscreen map without animation, and keep overview mode static.

- [ ] **Step 4: Preserve label setting**

Keep POI pins for all modes. Hide POI labels for `minimal`; show them for `stops-and-pois`.

## Task 3: Export Dialog and MapBlock Integration

**Files:**
- Create: `apps/web/src/components/ui/map-block/MapExportDialog.tsx`
- Modify: `apps/web/src/components/ui/map-block/MapBlock.tsx`

- [ ] **Step 1: Create the dialog component**

The dialog manages `durationSec`, `cameraMode`, `labelMode`, `themeMode`, progress, rendering state, and cancellation.

- [ ] **Step 2: Replace direct export state in MapBlock**

Replace direct `handleExport` with `setExportDialogOpen(true)`, keep error display under the figure, and change the action label to `Export Video`.

- [ ] **Step 3: Wire download from dialog**

After `exportTrackToMp4` resolves, create an object URL, click a temporary download link, revoke it, and close the dialog.

- [ ] **Step 4: Add accessible dialog behavior**

Use `role="dialog"`, `aria-modal="true"`, Escape to close when not rendering, and a fixed overlay portal.

## Task 4: Verification

**Files:**
- Verify only; edit failures if discovered.

- [ ] **Step 1: Run focused tests**

```bash
pnpm exec vitest run src/components/ui/map-block/map-block-video-timeline.test.ts
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @yohaku/web exec tsc --noEmit --pretty false
```

- [ ] **Step 3: Run focused lint**

```bash
pnpm exec eslint --fix src/components/ui/map-block/MapBlock.tsx src/components/ui/map-block/MapExportDialog.tsx src/components/ui/map-block/map-block-export.ts src/components/ui/map-block/map-block-video-timeline.ts src/components/ui/map-block/map-block-video-timeline.test.ts
```

- [ ] **Step 4: Run a local dev server and inspect `/gps-track`**

```bash
pnpm --filter @yohaku/web dev
```

- [ ] **Step 5: Commit implementation**

```bash
git add apps/web/src/components/ui/map-block docs/superpowers/plans/2026-06-09-gps-track-export-video-implementation.md
git commit --no-verify -m "feat(web): add cinematic gps track video export"
```

## Self-review

- Spec coverage: the plan covers dialog entry, fixed duration, distance reveal, auto-follow camera, return to overview, errors, tests, and unchanged schema.
- Placeholder scan: no unresolved implementation placeholders remain.
- Type consistency: `TrackVideoExportOptions`, `TrackVideoCameraMode`, `ExportPhase`, and `LayerColors` names match the planned file boundaries.
