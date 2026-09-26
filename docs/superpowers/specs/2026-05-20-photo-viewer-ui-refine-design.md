# Refine `@yohaku/photo-viewer` UI to match Yohaku's design language

- **Status**: Brainstorm approved — pending spec review
- **Date**: 2026-05-20
- **Affected**: `packages/photo-viewer/`, `apps/web/src/styles/`
- **Depends on**: `2026-05-20-photo-viewer-fork-design.md` (M2 already shipped — this is a follow-up polish pass on the same package)

## Problem

Photo-viewer chrome predates Yohaku's design contract:

- **Overlay** — `core.ts` defaults `background: '#fff'`. `apps/web/src/styles/image-zoom.css` overrides it to `bg-neutral-1!` with a hardcoded color, not the `--color-paper` token. The override couples the app to internal class names of the package and bypasses theme inversion.
- **Controls** — `album.css.ts` ships every control on a `rgba(0,0,0,0.5)` black tile (prev/next buttons, counter, strip). Black tiles read as foreign chrome over Yohaku's warm-paper body.
- **Active thumbnail** — `border-color: #fff` is theme-blind and ignores the accent system; it disappears on a light overlay.
- **Motion** — `image-zoom.css` overrides the package transition to `all 0.5s ease-in-out`, which collides with the package's intended `transform .3s cubic-bezier(.2, 0, .2, 1)`. Swap (prev/next) has no transition at all (`album.ts` sets `transition: none` on the incoming clone).
- **No close affordance** — only Esc / outside-click / scroll close the viewer; no visible `×`.
- **No theme decoupling** — package styles bake colors in, so theme switching only works because `apps/web` shadows them with `!important`.

## Decision

Refine the UI in place — **no API change, no interaction redesign**. The viewer adopts Yohaku tokens via CSS custom properties so the package itself stays theme-agnostic; `apps/web` injects the bindings.

Four pillars (approved 2026-05-20 brainstorm):

1. **Overlay** — `--color-paper` 96% solid; light/dark adapt via the token alone.
2. **Controls** — "墨字 Ink" language: no tiles, characters/icons as ink in neutral-9; active thumb gets a double-ring (`--a` accent + paper-spacer).
3. **Motion** — "桃花潭": 380ms `cubic-bezier(0.32, 0.72, 0, 1)` entrance / 280ms exit; horizontal slide ±28px + cross-fade 280ms on prev/next swap.
4. **Theme decoupling** — `--photo-viewer-*` CSS variables with light-mode fallbacks declared in the package; `apps/web` rebinds them to Yohaku tokens.

## Scope

| Item | In / Out |
|---|---|
| Token-driven overlay, ink controls, accent ring | In |
| Close `×` button (top-right) | In |
| Motion easing + swap slide/fade | In |
| `apps/web/src/styles/image-zoom.css` removal (folded into package + a new bindings file) | In |
| Public API surface (`mediumZoom()`, options) | Unchanged |
| `options.background` | Kept; inline override still wins over the CSS var |
| Mobile gestures (`gestures.ts`) | Unchanged |
| HD loading state, empty state | Out |
| Focus-ring overhaul, drag-distance opacity feedback | Out |
| Wheel zoom, rotation | Out (still) |

## Design tokens — the package contract

The package declares fallbacks for light mode. The consumer rebinds.

```css
/* packages/photo-viewer — declared in a new core.css.ts globalStyle on :root */
:root {
  --photo-viewer-overlay-bg: #ffffff;
  --photo-viewer-ink:        rgba(0, 0, 0, 0.85);
  --photo-viewer-ink-subtle: rgba(0, 0, 0, 0.55);
  --photo-viewer-accent:     #33A6B8;
  --photo-viewer-shadow:     0 14px 36px rgba(0, 0, 0, 0.18);
}
```

```css
/* apps/web/src/styles/image-zoom.css — rewritten */
@reference "tailwindcss";

:root {
  --photo-viewer-overlay-bg: var(--color-paper);
  --photo-viewer-ink:        var(--color-neutral-9);
  --photo-viewer-ink-subtle: var(--color-neutral-7);
  --photo-viewer-accent:     var(--a);
}

.dark {
  --photo-viewer-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
}

.medium-zoom-overlay { z-index: 99; }
.medium-zoom-image--opened { z-index: 100; }
```

The old `bg-neutral-1!` and `transition: all 0.5s ease-in-out` rules are removed — the package owns those now.

## Component specs

### Overlay (`core.css.ts`)

| Property | Value |
|---|---|
| `background` | `var(--photo-viewer-overlay-bg, #fff)` |
| Opacity (visible state) | `0.96` |
| Transition | `opacity 380ms cubic-bezier(0.32, 0.72, 0, 1)` |

`options.background`, when set, still writes inline `overlay.style.background` and wins by specificity (existing behavior in `update()`).

### Zoomed image (`core.css.ts`)

| Selector | Property | Value |
|---|---|---|
| `.medium-zoom-image` | `transition` | `transform 380ms cubic-bezier(0.32, 0.72, 0, 1)` (entrance default) |
| `.medium-zoom-image--opened` | `border-radius` | `3px` |
| `.medium-zoom-image--opened` | `box-shadow` | `var(--photo-viewer-shadow)` |

Exit duration (280ms) is shorter than entrance (380ms); since CSS transition is single-valued per property, `core.ts` `close()` sets `active.zoomed.style.transitionDuration = '280ms'` inline before clearing the transform. The `transitionend` handler still drives teardown.

A small radius softens the in-viewer image to match Yohaku's general image treatment. The earlier override `border-radius: 0` is dropped — confirmed in brainstorm.

### Counter (`album.css.ts`)

| Property | Value |
|---|---|
| Position | `top: 18px; left: 50%; transform: translateX(-50%)` |
| Font | `500 12px var(--font-sans, ui-sans-serif)`, `letter-spacing: 0.08em` |
| Color | `var(--photo-viewer-ink-subtle)` |
| `font-variant-numeric` | `tabular-nums` |
| Format | `"3 / 6"` (space-slash-space) |

No background, no border, no pill — strip the existing `rgba(0,0,0,0.5)` chrome entirely.

### Close button (NEW — `album.css.ts` + `album.ts`)

| Property | Value |
|---|---|
| Position | `top: 14px; right: 18px` |
| Glyph | `×` (U+00D7), single character |
| Font | `200 22px var(--font-sans)` |
| Hit-area | `28×28`, flex-centered |
| Color | `var(--photo-viewer-ink-subtle)` |
| Hover | `var(--photo-viewer-ink)` + `transform: scale(1.05)`, 200ms ease |
| Element | `<button type="button" aria-label="Close">` |
| Handler | Calls `deps.close()` |

The close button is rendered by `createAlbumControls` even when there is no album (single-image mode). Today `createAlbumControls` only runs when `images.length > 1`; this needs a small refactor — split into "close-only controls" (always shown when opened) and "album controls" (only when ≥2 in group). See `album.ts` changes below.

### Prev / next chevrons (`album.ts` + `album.css.ts`)

| Property | Value |
|---|---|
| Position | `top: 50%; translateY(-50%); left: 6px` / `right: 6px` |
| Glyph | `‹` (U+2039) / `›` (U+203A) — serif characters via `var(--font-serif)` |
| Font | `300 32px var(--font-serif)` |
| Hit-area | `36×60` |
| Color | `var(--photo-viewer-ink-subtle)` |
| Hover | `var(--photo-viewer-ink)`, 200ms ease |
| Hidden state | `.hidden` selector reused — `opacity: 0; pointer-events: none` |

Replace the existing inline `ICON_PREV` / `ICON_NEXT` SVG strings; the glyphs render as text and inherit the font chain.

### Thumbnail strip (`album.css.ts`)

| Property | Value |
|---|---|
| Container background / border / padding | **none** |
| Position | `bottom: 16px; left: 50%; translateX(-50%)`, `max-width: 80vw`, `overflow-x: auto`, scrollbar hidden |
| Gap | `4px` |
| Thumb | `28×28`, `border-radius: 2px`, `object-fit: cover`, `opacity: 0.45` |
| Thumb hover | `opacity: 0.85`, 200ms |
| Thumb active | `opacity: 1; box-shadow: 0 0 0 1.5px var(--photo-viewer-accent), 0 0 0 2.5px var(--photo-viewer-overlay-bg)` |

The double-ring is the only chrome on the strip — accent first, then a paper-colored spacer so the ring still separates from the thumb image on both warm-light and dark-paper overlays.

## Motion specifics

| Element | Property | Duration | Easing |
|---|---|---|---|
| Image entrance (open) | `transform` | 380ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Image exit (close) | `transform` | 280ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Overlay fade (open / close) | `opacity` | 380ms / 280ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Swap (prev / next) | `transform: translateX(±28px) + opacity` | 280ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Control hover | `color`, `transform` | 200ms | `ease` |
| Strip scroll-into-view | `scrollIntoView({behavior: 'smooth'})` | (browser) | (browser) |

### Swap mechanics (replaces the `transition: none` snap in `album.ts`)

`album.ts` `swap(nextIndex)` knows the direction from `nextIndex - index`:

1. **Outgoing animation** — `active.zoomed.animate(...)` via WAAPI from current state to `transform: translateX(<sign*-28>px) ... ; opacity: 0`, 280ms, the spring easing. (`<sign*-28>` = `forward → -28`, `backward → +28`.)
2. On `outgoing.onfinish`:
   - Remove the outgoing clone (existing teardown).
   - Build incoming clone (existing `cloneTarget` + `animate()`).
   - Set `incoming.style.transform = translate(<sign*+28>px, 0)` and `opacity = 0` (as the starting frame), append to DOM.
3. **Incoming animation** — next frame, `incoming.animate(...)` from `translateX(<sign*+28>px), opacity: 0` to the computed zoom transform and `opacity: 1`, 280ms.
4. After incoming `onfinish`, restore normal CSS transition.

WAAPI is preferred over chained CSS transitions because the swap needs to compose with the zoom transform that `animate.ts` writes inline — keeping it imperative avoids transition-conflict between `transform` channels.

`animate.ts` itself does not need a code change; only the CSS transition timing on `.medium-zoom-image` changes the entrance feel.

## File-by-file changes

### `packages/photo-viewer/src/`

| File | Change |
|---|---|
| `core.css.ts` | (a) Declare `:root` fallbacks for `--photo-viewer-overlay-bg`, `--photo-viewer-ink`, `--photo-viewer-ink-subtle`, `--photo-viewer-accent`, `--photo-viewer-shadow`. (b) Overlay `background` → `var(--photo-viewer-overlay-bg, #fff)`, opacity transition `380ms cubic-bezier(0.32, 0.72, 0, 1)`. (c) `.medium-zoom-image` transition `transform 380ms ...`. (d) `.medium-zoom-image--opened`: add `border-radius: 3px`, `box-shadow: var(--photo-viewer-shadow)`. |
| `album.css.ts` | Rewrite per "Component specs" — drop all `rgba(0,0,0,0.5)` tiles; set ink colors via `var(--photo-viewer-ink*)`; add `closeButton` style; rewrite `prevButton`/`nextButton` as serif-glyph containers; strip the strip's pill background. |
| `album.ts` | (a) Split rendering: `createOverlayControls` (counter + close button, always when open) and `createAlbumControls` (prev/next + strip, only when album size ≥ 2). (b) Replace `ICON_PREV` / `ICON_NEXT` SVG with `<span>` containing `‹` / `›`. (c) Track swap direction (`delta` or `target - index`); drive WAAPI animations as described under "Swap mechanics"; remove `nextClone.style.transition = 'none'`. (d) Add `closeButton` element with `deps.close()` handler. |
| `core.ts` | (a) `open()` always mounts `createOverlayControls(close)` (counter + `×`); `album.setup()` keeps its existing role for prev/next/strip. Both tear down in `close()`. (b) In `close()`, set `active.zoomed.style.transitionDuration = '280ms'` before clearing the transform so exit is faster than entrance; `transitionend` still drives teardown. |
| `index.ts` | No change to exports. |

### `apps/web/src/`

| File | Change |
|---|---|
| `styles/image-zoom.css` | Rewrite: bind `--photo-viewer-*` to Yohaku tokens (light defaults at `:root`, dark shadow override at `.dark`). Remove `@apply bg-neutral-1!` and the `transition: all 0.5s ease-in-out` block. Keep only `z-index` rules. |
| `styles/index.css` | No change (already imports `@yohaku/photo-viewer/photo-viewer.css`). Verify `image-zoom.css` is imported after the package CSS so the var-bindings override fallbacks. |
| `app/[locale]/(dev)/photo-viewer/page.tsx` | No change — used for visual QA. |

## Verification

- **Visual QA** on `/photo-viewer` dev page, in both light and dark mode:
  - Overlay matches body paper tone — no white flash on dark mode entry.
  - Counter, close `×`, chevrons all read as ink on paper, no tiles.
  - Album swap is directional (forward = slide left, backward = slide right) and crisp.
  - Active thumb double-ring visible on both warm-cream and dark-paper overlays.
  - Single-image (no group): counter and strip absent; close `×` still present.
- **Unit tests**: `packages/photo-viewer/src/core.test.ts` still passes (no API change, no flow change).
- **Lint / typecheck**: pass on changed files only — per repo convention, do not run on the whole project.
- **Motion feel**: manually compare entrance against Apple Photos on iOS Safari (reference for the easing curve).

## Out of scope

- HD loading skeleton / spinner
- Empty / error state
- Wheel zoom, image rotation
- Focus-ring keyboard a11y indicator overhaul
- Drag-to-close opacity-tied feedback
- Mobile gesture hint chrome

## Open items (resolve during planning)

- Confirm WAAPI (`Element.animate`) browser-support floor matches the project's existing baseline (Yohaku targets evergreen; should be fine).
- Confirm `var(--font-serif)` for chevrons reads acceptably with CJK fallback chain — if the serif chevrons render as a generic font on some platforms, fall back to inline `<svg>` chevrons with `stroke-width: 1.2`.
- Decide whether the close `×` glyph (`U+00D7`) needs an `<svg>` fallback for the same font-rendering reason.
- Whether the package's `:root` token declarations should sit in `core.css.ts` (current pattern) or a new `tokens.css.ts` for clarity.
