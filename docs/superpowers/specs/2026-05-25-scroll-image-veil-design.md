# Scroll-Driven Image Accent Veil

**Date:** 2026-05-25

**Scope:** Add a subtle, scroll-driven color "veil" to the article reading experience on post and note pages. As the reader scrolls past content images, the dominant color of each image (already extracted server-side as `accent`) fades a barely-perceptible tint into the page background. Multiple veils overlap and blend naturally during scroll. Implemented with CSS `animation-timeline: view()` — no JS scroll listener. Static pages (about, equipment) opt out.

## Goals

1. **Ambient hue continuity between text and images.** When a reader scrolls past an image, the page picks up a hint of its dominant hue and lets it fade back as the image leaves the viewport. The effect should feel like a sheer veil drifting past, not a state change.
2. **Zero perceived performance cost.** No JS scroll listener; scroll handling is delegated to the browser's compositor via CSS view-timeline.
3. **Graceful degradation.** Older browsers, reduced-motion users, and images without an extracted accent all silently get the baseline (no veil) experience.
4. **Sub-perceptual intensity.** Peak per-layer opacity ≤ 4%. The effect should be felt during scrolling, not noticed as a discrete overlay. Aligns with Yohaku's "几不可察" color tinting convention (mix ratios in the 0.5–1.5% range, peak glows 6–10%).

## Non-Goals

- Server-side dominant color extraction. `accent` is already populated by the mx-core backend on image upload; this spec consumes it.
- Replacing or interacting with the existing `PageColorGradient` startup glow. Both can coexist; veils stack additively in sRGB on top of the glow.
- Recoloring text, accent UI elements, links, or any other accent-driven CSS variable. The veil is a background-only effect; `--color-accent` does not change with scroll.
- Animating gallery cells. Only block-level `MarkdownImage` participates in v1. `GridZoomImage` cells contribute their `accent` to the swatch, but not the veil.
- Cover / banner images, OG images, RSS previews — also out of scope for v1.
- Pages other than post and note (about, equipment, friends, timeline, etc.).
- Feature-flagging. The `@supports` and `prefers-reduced-motion` gates are the only opt-outs; no GrowthBook or similar.

## Architecture

A new client component `ScrollImageVeil` is mounted alongside the existing `MarkdownImageRecordProvider` on post and note detail pages. It renders N invisible-by-default veil layers (one per image with a non-empty `accent`), each tied to that image's CSS `view-timeline-name`. Browser-managed alpha-blending across N pinned-fixed layers produces the drift effect during scroll.

### Component layout

```
ScrollImageVeil (client)
 ├─ <style> — generated rules:
 │     · timeline-scope on shared ancestor
 │     · view-timeline-name per [data-veil-idx="N"]
 │     · animation-timeline + background-color per .scroll-veil[data-veil-idx="N"]
 │     · gate everything inside @supports + @media reduced-motion
 └─ <div className="scroll-veil-host" aria-hidden>
       ├─ <div className="scroll-veil" data-veil-idx="0" />
       ├─ <div className="scroll-veil" data-veil-idx="1" />
       └─ ... (one per accented image)
```

### Files

| Path | Purpose |
|---|---|
| `apps/web/src/components/common/ScrollImageVeil/index.tsx` | The client component. Reads images from the existing `MarkdownImageRecordProvider`, emits styles + veil host. |
| `apps/web/src/components/common/ScrollImageVeil/constants.ts` | `VEIL_DEFAULTS` (peak opacity, desaturation ratio, blur, neutral anchor). Module-level export so production can tune via a single edit. |
| `apps/web/src/components/common/ScrollImageVeil/styles.ts` | Pure function `generateVeilCss(images, theme)` → CSS string. Imported by the component. |
| `apps/web/src/components/ui/markdown/renderers/image.tsx` | Wire `data-veil-idx` onto `MarkdownImage` and `FixedZoomedImage` outer wrapper. Index is the image's position in the provider's array. |

### Data flow

```
mx-core (server)
   └─ Image { src, accent, blurHash, height, width }

PostDetailClient / NoteDetailClient
   └─ <PostMarkdownImageRecordProvider> / <NoteMarkdownImageRecordProvider>
        ├─ <ScrollImageVeil />  ← consumes provider's image array
        └─ <ArticleContent>
              └─ <MarkdownImage>  ← reads its accent + index via useMarkdownImageRecord(src)
                    · outer wrap: data-veil-idx={index}
```

The provider's image list is the single source of truth. `ScrollImageVeil` snapshots it on mount (subscribing via Jotai if needed for SSR-stable rendering) and emits CSS for that snapshot. If the image list mutates (e.g., article re-fetch on revalidate), the component re-renders with the new set.

Image-to-index mapping is positional within the provider's array, filtered to images with a non-empty `accent`. Indices are stable across renders of the same article.

### Timeline scope

`timeline-scope` is declared on the article wrapper (a known ancestor of both the veil host and the rendered images). For post pages, this is the `<article>` element inside `PostMarkdownRenderer` / `PostLexicalRenderer`. For note pages, the equivalent in `NoteDetailClient`. The generated CSS targets this wrapper via a class added by `ScrollImageVeil` (`yohaku-scroll-veil-scope`).

```css
.yohaku-scroll-veil-scope {
  timeline-scope: --ydv-0, --ydv-1, --ydv-2, ...;  /* one entry per veil */
}
```

Naming prefix `--ydv-` (Yohaku Drift Veil) avoids collisions with other timelines.

### Per-image timeline declaration

The image's outer wrapper gets `view-timeline-name` via the generated stylesheet — not inline — to keep React's JSX free of vendor-prefixed inline style hacks:

```css
[data-veil-idx="0"] { view-timeline-name: --ydv-0; }
[data-veil-idx="1"] { view-timeline-name: --ydv-1; }
...
```

### Veil layer

Each veil is a `position: fixed; inset: 0` layer rendered behind the article content, with a pre-computed `background-color` and an `animation-timeline` reference:

```css
.scroll-veil {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background-color: var(--veil-c, transparent);
  animation-name: scroll-veil-pulse;
  animation-fill-mode: both;
  animation-timing-function: ease-in-out;
}
.scroll-veil[data-veil-idx="0"] {
  animation-timeline: --ydv-0;
  background-color: <pre-computed color>;
}
@keyframes scroll-veil-pulse {
  0%, 100% { opacity: 0; }
  50% { opacity: var(--veil-peak, 0.04); }
}
```

`animation-duration: auto` is implied when `animation-timeline` is a view-timeline — the keyframes are stretched across the timeline's full range (image entering viewport → image exiting viewport).

### Color computation

For each image, the pre-computed veil color is:

```ts
desaturatedHex = chroma
  .mix(image.accent, NEUTRAL_ANCHOR, VEIL_DEFAULTS.desaturate, 'oklch')
  .hex()
```

(Or via `Color` from `colorjs.io` to match `accent-color.ts`'s existing OKLCH plumbing.) The pre-mix happens once at component render time, not per frame.

Light and dark themes use different neutral anchors (`#a8a39a` vs `#3a3835`). Generated CSS emits both sets, gated by `:root[data-theme='light']` / `[data-theme='dark']` selectors, matching the pattern in `generateAccentColorStyle`.

### Layering with existing visual layers

Visual stacking (back → front):

1. Page background (`--color-root-bg`) + `body::before` grain texture (if `html.noise`)
2. `PageColorGradient` startup ornament (`page-glow-container` + `page-glow-accent`, fixed near top, mask-faded)
3. `ScrollImageVeil` host (fixed, full viewport)
4. Article content (text, images, headings)

Achieved by:
- The scope wrapper sets `isolation: isolate` to form a fresh stacking context.
- `ScrollImageVeil`'s veil host is rendered as the **first child** of the scope wrapper, before article content. With both unpositioned-in-flow content above and a fixed-positioned veil below, the in-flow text paints above the veil by default — no explicit `z-index` needed.
- `PageColorGradient` continues to use `RootPortal` (renders to `<body>`); it sits below the article's stacking context because the article appears later in source order.

The veil and the page-glow share the same screen real estate but are visually independent: page-glow is a one-time startup ornament, veil is the continuous scroll response.

## Visual Parameters

Locked defaults (extracted to constants for ops tuning):

```ts
// apps/web/src/components/common/ScrollImageVeil/constants.ts
export const VEIL_DEFAULTS = {
  peakOpacity: 0.04,           // each layer's α peak when its image is centered
  desaturate:  0.30,           // mix toward NEUTRAL in OKLCH (0=raw accent, 1=fully neutral)
  blurPx:      0,              // optional filter blur on the veil layer
  neutralLight: '#a8a39a',     // light-theme desaturation anchor (warm gray)
  neutralDark:  '#3a3835',     // dark-theme desaturation anchor
} as const
```

Rationale: arrived at via interactive mockup tuning. `peakOpacity 0.04` is the smallest value at which the effect remains felt over the existing grain + page-glow background. `desaturate 0.30` keeps enough of the image's identity to register as "this image's color" while preventing saturated colors (e.g., a vivid red photo) from feeling like an overlay. Sigma / influence radius is not a parameter under approach A — the `view()` timeline spans the image's full transit through the viewport.

## Browser Support and Fallback

Gate the entire feature behind `@supports`:

```css
@supports (animation-timeline: view()) {
  /* all of the above rules */
}
```

Unsupported browsers (Chrome < 115, Safari < 26, Firefox < 140) see the page exactly as it is today: page-glow + static accent, no veil drift. No JS errors, no layout shift. The `<style>` block can still be emitted unconditionally — browsers that don't recognize `animation-timeline` simply drop those declarations.

The veil layer divs render into the DOM regardless (they're cheap and `aria-hidden`), but with `opacity: 0` and no animation, they're effectively invisible.

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .scroll-veil { display: none; }
}
```

Fully disabled. Rationale: a continuous scroll-tied color change is exactly the kind of motion `prefers-reduced-motion` is intended to suppress, and the page degrades cleanly to its existing static accent.

## Integration Points

### post

In `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/PostDetailClient.tsx`:

1. Add `className="yohaku-scroll-veil-scope"` to the article wrapper element rendered inside `PostMarkdownImageRecordProvider`. (If no suitable element exists, introduce a thin `<div>` for this purpose.)
2. Mount `<ScrollImageVeil />` as the **first child** of that wrapper, immediately before the article content.

### note

In `apps/web/src/app/[locale]/notes/(note-detail)/NoteDetailClient.tsx`:

1. Same pattern: add `yohaku-scroll-veil-scope` class to the note's article container inside `NoteMarkdownImageRecordProvider`.
2. Mount `<ScrollImageVeil />` as the first child.

### page

Out of scope. The `(page-detail)` route renders content but does not mount the veil.

### Image renderer

`apps/web/src/components/ui/markdown/renderers/image.tsx`:
- `MarkdownImage`: outer wrapper gains `data-veil-idx={index}` when the image has a non-empty `accent`.
- Index is derived from the position in `useMarkdownImageRecord(src)`'s parent array, filtered to accented images. (Need a small companion hook `useMarkdownImageVeilIndex(src)` since the existing hook returns the matched record, not its index.)
- `FixedZoomedImage`: pass through `data-veil-idx` from `MarkdownImage`.
- `GridZoomImage` / `GridMarkdownImages`: not modified; gallery cells do not participate.

If a Lexical-rendered image goes through `@haklex/rich-kit-shiro`'s image override instead of the markdown renderer, that override needs the same `data-veil-idx` wiring. (Verify during implementation; the spec assumes both code paths can attach the attribute.)

## Performance

- No scroll listener, no IntersectionObserver, no rAF loop. All scroll responsiveness is handed off to the browser's compositor.
- N veil layers, each a single solid-color fixed-position div. N ≤ image count per article (commonly 0–15, occasionally 50+). GPU-friendly.
- Compositor cost: each veil is a candidate compositor layer. For typical articles this is negligible. For 50+ image posts we may want to revisit, but no optimization in v1.
- One generated `<style>` block per article render. Trivial.

## Testing & Validation

No automated tests. Manual validation matrix:

| Scenario | Expected |
|---|---|
| Post with 0 images | Veil host renders empty; no visible effect |
| Post with 1 image | Veil pulses 0 → 4% → 0 over that image's transit |
| Post with 4 images, varied colors | Veils blend additively during overlap; no muddy stacking |
| Post with 50 images | No frame drops while scrolling |
| Note with 1 image | Same as post 1-image case |
| Note with 0 images | No veil |
| `(page-detail)/about` | No veil component mounted |
| Chrome 116+ / Safari 26+ / Firefox 140+ | Full effect |
| Safari 17 (no animation-timeline) | No errors, no veil, page identical to current main |
| `prefers-reduced-motion: reduce` | No veil, page identical to current main |
| Light/dark theme switch | Veil colors recompute to use the appropriate neutral anchor |
| Article revalidate (image list changes) | Veil host re-renders with new color set |

## Rollout

Direct merge to main. No feature flag. Recovery path is `@supports` + `prefers-reduced-motion` (already covered) plus a one-line revert of the component mount on post and note clients.

Tuning hatch: `VEIL_DEFAULTS` is a single exported const — adjusting `peakOpacity` or `desaturate` in production is a one-line change.

## Out of Scope / Future

- **Gallery contribution.** Could let each grid cell emit its own veil. Adds complexity (gallery layouts vary), defer until requested.
- **Cover/banner images.** Their position is outside the article scroll context; a different mechanism would be needed.
- **Custom per-article tuning.** Could expose `peakOpacity` overrides via post meta if a specific article needs different intensity.
- **OKLCH layer compositing.** The browser composites layers in sRGB by default; CSS color-interpolation-filters or `color-interpolation: oklch` on the layer parent could shift this. Skipped because the additive nature is mild at 4% peak.
- **Reverse-direction differentiation.** Currently keyframes are symmetric (image entering and exiting feel the same). Could weight entry > exit, or vice versa, for narrative feel.
