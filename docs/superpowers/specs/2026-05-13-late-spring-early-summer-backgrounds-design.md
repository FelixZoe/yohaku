# Late-Spring and Early-Summer Seasonal Backgrounds

**Date:** 2026-05-13
**Status:** Approved (brainstorming complete; pending implementation)

## Motivation

The site currently shows the `SakuraBackground` (cherry blossoms) for the entire February-through-May window, and `FireflyBackground` for June-through-August. In May, sakura has finished blooming, and fireflies do not appear until late June or July, so neither motif fits the actual season. The background system needs two intermediate slots — wisteria for late spring, hydrangea for early summer — and the firefly window should shift to July-August to match its real ecology.

## Scope

**In scope**

- Add a new `'late-spring'` season slot (Apr 20 – May 31) rendered by a new `WisteriaBackground` component.
- Add a new `'early-summer'` season slot (Jun 1 – Jun 30) rendered by a new `HydrangeaBackground` component.
- Narrow the `'spring'` slot to end Apr 19 and shift the `'summer'` slot to start Jul 1, so firefly only renders Jul–Aug.
- Wire both new components into `BackgroundTexture.tsx` for both light and dark modes (mirroring how Sakura currently renders in both modes).

**Out of scope**

- Refactoring `SakuraBackground` or any existing seasonal component. The pre-existing implementations are not touched.
- Abstracting shared particle physics between Sakura, Wisteria, and Hydrangea. The three components remain independent, mirroring the existing per-season file pattern.
- Changing the dynamic accent color system (`AccentColorStyleInjector`, `--a`). The wisteria/hydrangea months continue to use the existing 浅葱/桃 accent palette; motif and accent are independent layers.
- Adding `prefers-reduced-motion` support. None of the existing seasonal components honor it; this spec does not change that convention.
- Adding unit tests for the new components. The existing background components have no tests; sway/particle behavior is decorative.
- Adjusting the `HomePageTimeLine` season grouping (`apps/web/src/app/[locale]/(home)/components/HomePageTimeLine.tsx`). That component has its own `getSeasonFromMonth` and is unrelated to background rendering.

## Architecture

### File layout

Four new files under `apps/web/src/components/ui/background/`:

```
WisteriaBackground.tsx          # ~600 lines; SVG overlay + WebGPU canvas
WisteriaBackground.shader.ts    # ~200 lines; WGSL procedural petal shader
HydrangeaBackground.tsx         # ~600 lines; SVG overlay + WebGPU canvas
HydrangeaBackground.shader.ts   # ~200 lines; WGSL procedural 4-petal shader
```

Each component mirrors the structure of `SakuraBackground.tsx` and `SakuraBackground.shader.ts`. The two new components are independent of each other and of `SakuraBackground`. No shared parent or abstraction is introduced; if future work calls for it, the refactor is left for later.

### Single-layer rendering (WebGPU canvas only)

After early visual review the SVG corner-cluster overlay layer was dropped for both motifs. The canvas-rendered falling particles alone carry the seasonal motif; the SVG hanging raceme / mophead overlays did not read as realistic next to the photographic references and were stripped in favor of a cleaner ambient effect.

Both `WisteriaBackground` and `HydrangeaBackground` mirror `SakuraBackground`'s architecture: a single fixed-position `<canvas>` (or a gradient `<div>` fallback when WebGPU is unavailable). Per-particle physics (gravity + drag + wind + flutter) on the CPU, instanced quads + procedural shape in WGSL on the GPU. The only differences from Sakura are the procedural shape function and color palette in the shader, and slightly different prop ranges (see "Prop ranges" below).

### Season routing change

`BackgroundTexture.tsx` is the only existing file modified. Three changes:

1. Extend the `Season` type:
   ```ts
   type Season =
     | 'winter'
     | 'spring'
     | 'late-spring'
     | 'early-summer'
     | 'summer'
     | 'autumn'
   ```
2. Replace `getSeason()` with a day-aware version:
   ```ts
   const getSeason = (date: Date): Season => {
     const month = date.getMonth()   // 0-indexed
     const day = date.getDate()
     if (month === 11 || month === 0) return 'winter'             // Dec, Jan
     if (month === 3 && day >= 20) return 'late-spring'           // Apr 20–30
     if (month === 4) return 'late-spring'                        // May
     if (month === 5) return 'early-summer'                       // Jun
     if (month === 6 || month === 7) return 'summer'              // Jul, Aug
     if (month >= 1 && (month < 3 || (month === 3 && day <= 19))) return 'spring' // Feb–Apr 19
     return 'autumn'                                              // Sep, Oct, Nov
   }
   ```
3. Extend both branches of `resolveBackgroundPreset()` (light and dark) to map:
   - `'late-spring'` → `WisteriaBackground` with `createWisteriaBackgroundProps()`
   - `'early-summer'` → `HydrangeaBackground` with `createHydrangeaBackgroundProps()`

   Both modes render the new motifs (mirroring Sakura's current behavior, which is themed in both modes).

### Props and factories

Both new components accept the same prop shape as `SakuraBackground`:

```ts
type WisteriaBackgroundProps = {
  windSpeed?: number
  windDirection?: number
  speed?: number
  intensity?: number
  density?: number
  volume?: number
  weight?: number
  flutter?: number
}
// HydrangeaBackgroundProps is structurally identical.
```

Two memoized factories follow the `createSakuraBackgroundProps` pattern in `BackgroundTexture.tsx`, each sampling values from per-motif ranges:

| Param | Wisteria range | Hydrangea range | (Sakura reference) |
|---|---|---|---|
| `windSpeed` | 0.6–1.3 | 0.3–0.8 (gentler) | 0.6–1.3 |
| `intensity` | 0.7–1.0 (clusters add visual weight) | 0.6–0.9 (sparser, rainy-season feel) | 0.8–1.2 |
| `density` | 0.7–1.0 | 0.6–0.9 | 0.8–1.3 |
| `flutter` | 1.0–1.5 (petals tumble more) | 0.7–1.0 (heavier flowers, less wobble) | 0.8–1.3 |
| `windDirection`, `speed`, `volume`, `weight` | Same ranges as Sakura | Same ranges as Sakura | — |

## Visual specification

### Wisteria

The corner SVG overlay (hanging raceme, leaves, vine) described in earlier drafts was dropped; only the falling-petal canvas remains.

**Particle (falling petal) palette**

- Light mode: `#d1c4e9`, `#b39ddb`, `#9575cd`, `#7e57c2`, `#673ab7` (shallow to deep lavender)
- Dark mode: `#b39ddb`, `#9575cd`, `#7e57c2`, `#673ab7`, `#5e35b1`, with `#4527a0` and `#311b92` reserved for low-frequency edge tints and shadow gradients only (they are too dark to read as primary fills against a dark body background).

The shader uses `uniforms.colorParams.x` as an `isDark` flag (`uniformData[8] = isDark ? 1 : 0`) and branches the palette selection in the fragment stage. The same `Uniforms { resolutionTime, petalParams, colorParams }` and `VertexInput` layout as `SakuraBackground.shader.ts` is preserved — no new uniform bindings.

**Overlay (hanging cluster) shape**

Each cluster is a vertical string of 5–7 circles, descending and gradually growing then shrinking, simulating a wisteria raceme:

- Top circle: r=4, color `#d1c4e9`
- Mid circles (r=5 to r=7): `#b39ddb` → `#9575cd` → `#7e57c2` → `#673ab7`
- Bottom circles (r=5 to r=4): `#5e35b1`, `#4527a0`

Place two clusters by default: top-left (offset ~5% from left edge) and top-right (symmetric). A third optional cluster may be placed near top-center for variety.

**Overlay sway**

```css
@keyframes wisteria-sway {
  0%, 100% { transform: rotate(-1.5deg); }
  50%      { transform: rotate(1.5deg); }
}
/* Applied with transform-origin: top center; duration: 4s; timing: ease-in-out; iteration: infinite */
```

Stagger left vs. right by `animation-delay: 1.5s` on the right cluster so they do not move in lockstep.

### Hydrangea

The corner SVG mophead overlay described in earlier drafts was dropped; only the falling 4-petal canvas remains.

**Particle (falling 4-petal flower) palette**

- Light mode: `#9fa8da`, `#7986cb`, `#5c6bc0`, `#3f51b5`, plus `#64b5f6`, `#42a5f5` accents
- Dark mode primary fills: `#5c6bc0`, `#7986cb`, `#3f51b5`, plus `#1976d2`, `#42a5f5` accents
- Dark mode reserved (low-frequency only, for shadow/edge tints): `#283593`, `#1a237e`

The shader's procedural shape is a small 4-petal flower assembled from four unioned ellipses (top/bottom vertical + left/right horizontal, each offset by ~0.13 from the center). Each instance picks a color from the palette weighted by `seed`. The center receives a slightly lighter tint to read as a flower core. The shader uses `uniforms.colorParams.x` as `isDark` flag, same convention as Wisteria.

**Overlay (mophead) shape**

Each mophead is a round cluster of 5–7 small 4-petal flowers, packed loosely:

- Inner flowers slightly larger and deeper-toned; outer flowers smaller and lighter
- Two mopheads, one at top-left and one at top-right

**Overlay sway**

```css
@keyframes hydrangea-sway {
  0%, 100% { transform: rotate(-0.5deg) translateY(0); }
  50%      { transform: rotate(0.5deg)  translateY(-2px); }
}
/* duration: 5s; timing: ease-in-out; iteration: infinite */
```

Slighter sway than wisteria — mopheads are heavier and rounder, less wind-driven. Stagger left vs. right by `animation-delay: 2.5s`.

## Verification

- Manual visual check by simulating `Date` in dev (override via temporary edit or `MockDate`) at:
  - Apr 19 → expect Sakura (boundary, no change)
  - Apr 22 → expect Wisteria
  - May 15 → expect Wisteria
  - May 28 → expect Wisteria
  - Jun 5 → expect Hydrangea
  - Jun 28 → expect Hydrangea
  - Jul 1 → expect Firefly (boundary, summer now starts here)
- Lint only modified files: `pnpm --filter @yohaku/web lint` after staging the four new files and `BackgroundTexture.tsx`.
- No design-system check is needed; no new tokens are introduced. The palettes are component-internal.
- No new unit tests. Existing background components have none.

## Inherited constraints (no new work)

These are already handled by `BackgroundTexture.tsx` and apply to the new motifs automatically:

- `useIsMobile()` → returns `null` on mobile, so the new motifs never render on small viewports.
- `useIsInReading()` / `useIsImmersiveReadingEnabled()` → hide the background while reading or in immersive mode.
- `AnimatePresence` + `motion.div` → fade in/out using `Spring.presets.smooth`.

## Risks and rollback

- **Rendering fallback.** If WebGPU is unavailable, the canvas element returns `null` (mirroring `SakuraBackground`'s `unsupportedRef` pattern), but the SVG overlay continues to render. The root container always mounts so the user sees the hanging clusters / mopheads even on devices without WebGPU. Implementation note: gate only the `<canvas>` element on `unsupportedRef.current`, not the entire root.
- **Date boundary edge cases.** Apr 19 vs Apr 20 and May 31 vs Jun 1 are clean cuts at midnight. The choice of Apr 20 as the wisteria start is botanically grounded (Japanese wisteria peak: late April to mid-May, tail to end of May). Hydrangea covers June (peak rainy season).
- **Rollback.** Reverting the four new files and the diff in `BackgroundTexture.tsx` restores the previous behavior. No persistent state, no migrations.
