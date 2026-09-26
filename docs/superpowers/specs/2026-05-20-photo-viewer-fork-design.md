# Replace react-photo-view with a forked TypeScript medium-zoom (`@yohaku/photo-viewer`)

- **Status**: Brainstorm approved — pending spec review
- **Date**: 2026-05-20
- **Affected**: `packages/` (new package), `apps/web`

## Problem

The web app currently runs two image-zoom libraries:

- `react-photo-view` (1.2.7) — used in 3 places:
  - `apps/web/src/components/ui/image/MobilePhotoView.tsx` — mobile single-image viewer
  - `apps/web/src/components/ui/markdown/renderers/image.tsx` (`GridMarkdownImages`) — multi-image grid
  - `apps/web/src/components/ui/gallery/Gallery.tsx` — multi-image carousel
- `medium-zoom` (1.1.0) — used desktop-side in `ZoomedImage.tsx`, `Mermaid.tsx`, `YohakuImage.tsx`

Maintaining two zoom libraries is the cost to remove. `medium-zoom` is a ~450-line vanilla single-image zoomer; it cannot replace `react-photo-view`'s multi-image slider and mobile gestures without extension.

## Decision

Fork `francoischalifour/medium-zoom` (MIT), rewrite it to TypeScript, extend it with multi-image navigation and touch gestures, and ship it as the `@yohaku/photo-viewer` workspace package. Migrate all `medium-zoom` and `react-photo-view` usage onto it. Delivered in two milestones.

## Constraints & Decisions

| Topic | Decision |
|---|---|
| Package location | `packages/photo-viewer` workspace package (`@yohaku/photo-viewer`) |
| API shape | Vanilla, command-style core only. React integration (multi-image collection) lives in `apps/web`. |
| Bundler | Vite, library mode |
| Styling | vanilla-extract (`*.css.ts`), zero-runtime |
| Feature set | TS rewrite; multi-image prev/next + keyboard; mobile gestures (pinch zoom, drag pan, swipe-to-close); desktop drag-to-close; thumbnail strip + counter |
| Explicitly out of scope | Wheel zoom; image rotation |
| Delivery | Two milestones (M1, M2) |

## Package Structure

```
packages/photo-viewer/
├── src/
│   ├── index.ts          # public API surface
│   ├── core.ts           # zoom engine (M1: TS port of medium-zoom)
│   ├── core.css.ts       # vanilla-extract styles (M1)
│   ├── album.ts          # multi-image group model (M2)
│   ├── gestures.ts       # touch / pointer gestures (M2)
│   ├── dom.ts            # overlay / thumbnail-strip DOM (M2)
│   ├── dom.css.ts        # vanilla-extract styles for M2 DOM
│   └── types.ts
├── vite.config.ts        # library mode + @vanilla-extract/vite-plugin
├── package.json          # @yohaku/photo-viewer, type: module
├── tsconfig.json
├── README.md
├── LICENSE               # MIT, original author attribution retained
└── NOTICE                # records the fork origin
```

- `package.json` `exports` points at `dist/`. Build output: JS + `photo-viewer.css`.
- `apps/web` consumes the build output, not `src`. Build ordering is handled by the pnpm workspace dependency graph (`@yohaku/web` depends on `@yohaku/photo-viewer`).
- Dev: `vite build --watch` on the package side, started in parallel by the root `dev` script. `apps/web`'s bundler never touches `.css.ts`.
- `apps/web` imports `@yohaku/photo-viewer/photo-viewer.css` once at a global entry point — vanilla-extract is zero-runtime, so a real CSS artifact exists and must be linked.
- Any single file exceeding 500 lines is split by responsibility (repo convention).

## Milestone 1 — Fork + TS rewrite + desktop swap

Behavior-identical migration. `react-photo-view` is untouched in M1.

1. **Create package** `packages/photo-viewer/` — `package.json`, `tsconfig.json`, `vite.config.ts`, `README.md`, `LICENSE` (MIT, original author retained), `NOTICE` (fork origin).
2. **Port** upstream `src/medium-zoom.js` (~450 lines) into `core.ts` as TypeScript. Preserve the full public API (`open`, `close`, `toggle`, `update`, `clone`, `attach`, `detach`, `on`, `off`, `getOptions`, `getImages`, `getZoomedImage`) and the options object (`margin`, `background`, `scrollOffset`, `container`, `template`); add types only — no behavior change. Default export = factory function, plus named exports. Port upstream `style.css` into `core.css.ts` (vanilla-extract).
3. **Wire `apps/web`** — add `"@yohaku/photo-viewer": "workspace:*"` to `apps/web/package.json`.
4. **Swap desktop call sites** — in `ZoomedImage.tsx`, `Mermaid.tsx`, `YohakuImage.tsx`, change the import from `medium-zoom` to `@yohaku/photo-viewer`; call signatures unchanged.
5. **Cleanup** — those three are the only `medium-zoom` consumers; remove `medium-zoom` from `apps/web/package.json`.

**M1 verification**: desktop image click-to-zoom, and close via re-click / Esc / scroll, with animation feel identical to the old build; lint + typecheck pass on changed files; `@yohaku/photo-viewer` has unit tests on key paths.

**M1 path & escape hatch**: M1's primary path is a direct TS port. If the port reveals that medium-zoom's command-style architecture (a) cannot be cleanly typed, or (b) clearly obstructs the M2 group/gesture extensions, then abandon the direct port and switch to a from-scratch redesign — using medium-zoom as reference, unifying single-image zoom and multi-image lightbox under one model. This decision is made during M1 implementation, not assumed up front.

**M1 exit**: `react-photo-view` still present (Mobile/Grid/Gallery unchanged); removed in M2.

## Milestone 2 — Multi-image + gestures + full migration

### M2-A — Core extensions

- **Group model** — `attach($img, { group?: string })`. Images sharing a `group` form a navigable sequence; opening any one enters "album mode" and tracks a current index. Images with no group keep medium-zoom single-image behavior.
- **Prev/next + keyboard** — in album mode, clickable left/right zones or buttons on the overlay; `ArrowLeft` / `ArrowRight` switch images, swapping the zoomed `src` and recomputing the transform.
- **Mobile gestures** (`gestures.ts`) — in zoomed state: two-finger pinch zoom; single-finger drag pan when zoomed in; single-finger pull-down swipe-to-close when not zoomed.
- **Desktop drag-to-close** — pointer drag downward closes the viewer (the desktop counterpart of mobile swipe-to-close). No wheel zoom and no pannable overflow on desktop, so this is the only desktop drag behavior.
- **Thumbnail strip / counter** (`dom.ts` + `dom.css.ts`) — in album mode, a thumbnail strip at the overlay bottom (current item highlighted, click to jump) plus a corner counter (`3 / 9`). Not shown in single-image mode.

### M2-B — apps/web integration

- **React wrapper** — `apps/web/src/components/ui/image/ZoomGroup.tsx`: a Context provider; child components register to the same `group` id (generated via `useId`) when they `attach`. This is the multi-image collection layer that lives app-side, per the vanilla-core / app-side-wrapper decision.
- **`GridMarkdownImages`** (`image.tsx`) and **`Gallery.tsx`** — drop `<PhotoProvider>` / `<PhotoView>`; wrap with `ZoomGroup` and attach within the group.
- **`ZoomedImage.tsx`** — since M2 core carries mobile gestures itself, the mobile/desktop branches merge: both `attach`. `MobilePhotoView.tsx` is deleted.
- Remove `react-photo-view` from `apps/web/package.json`.

**M2 verification**: core unit tests for group navigation and gesture logic; manual verification of Grid/Gallery multi-image switching, mobile gestures, and the thumbnail strip; lint + typecheck pass on changed files.

**M2 exit**: `react-photo-view` and `MobilePhotoView.tsx` removed; all three scenarios served by `@yohaku/photo-viewer`.

## Out of Scope

- Wheel zoom (desktop secondary zoom)
- Image rotation

## Open Items (resolve during planning)

- Exact mechanics of Vite library mode + vanilla-extract CSS artifact emission, and the corresponding `package.json` `exports` mapping.
- Whether `core.ts` exceeds the 500-line limit after the TS port; if so, split into `animate.ts` / `events.ts`.
