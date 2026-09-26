# Full-Page Ink Loading Design

**Date:** 2026-03-20

**Scope:** Redesign the shared full-page loading experience in `apps/web/src/components/ui/loading/index.tsx` used by App Router page-level `loading.tsx` boundaries and client pages that render `FullPageLoading`.

**Goal:** Replace the current small ink-blot mark with a full-page loading composition that treats the entire page as paper and renders a single center-origin ink spread with subtle capillary rings. The animation should play once, then settle into a static end state.

## Current State

### Shared full-page entry point

`FullPageLoading` currently renders:

- `Loading useDefaultLoadingText className="h-[calc(100vh-6.5rem-10rem)]"`
- Centered layout with a small SVG-filtered ink blot mark
- Animated loading copy below the mark

This component is re-exported by route-level loading boundaries such as:

- `apps/web/src/app/[locale]/(page-detail)/loading.tsx`
- `apps/web/src/app/[locale]/friends/loading.tsx`
- `apps/web/src/app/[locale]/thinking/loading.tsx`
- `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/loading.tsx`

### Non-target loading surfaces

`apps/web/src/components/layout/dashboard/PageLoading.tsx` uses `AbsoluteCenterSpinner` and is **out of scope** for this redesign.

## Chosen Direction

### Selected concept

`B. 毛细水圈 / Capillary Rings`

The page itself is the paper. No outlined sheet, no framed card, no faux document chrome. A single ink point appears in the center, expands outward once, leaves 1-2 soft absorption rings, and then rests.

### Why this direction

| Criterion | Result |
|---|---|
| Matches "纸 / 墨" metaphor | Strong |
| Avoids literal paper prop | Yes |
| Feels like material absorption, not spinner UI | Yes |
| Works for unknown loading duration | Yes, by settling into a static end state |
| Risk of looking like water ripple | Present, must be controlled by softness and asymmetry |

## Rejected Alternatives

| Direction | Reason Not Chosen |
|---|---|
| Quiet Bloom | Clean, but too generic and low-memory |
| Organic Bleed | Too easy to look dirty or noisy at full-page scale |
| Hybrid | Strong fallback, but broader than needed after selecting B |

## Visual Model

```text
[Page background = paper field]
            |
            v
    [Center ink point appears]
            |
            v
  [Primary soft spread expands]
            |
            v
[1-2 capillary rings bloom outward]
            |
            v
 [Outer fog settles and stops]
            |
            v
   [Loading text remains readable]
```

- The animation must feel absorptive, not radial-wave or sonar-like.
- The rings should be soft-edged and low-contrast.
- The final frame should still look intentional if loading lasts several seconds.

## Design Decisions

### 1. Page Surface

The full-page container becomes the paper field through background treatment only:

| Property | Value |
|---|---|
| Base background | Warm off-white, close to current root background |
| Texture | Extremely subtle paper-fiber / line texture via layered gradients |
| Framing | None |
| Shadows | None |
| Literal paper edges | None |

The background must remain quiet enough that route content does not feel visually disconnected when the loading boundary resolves.

### 2. Ink Composition

Three visual layers:

| Layer | Role | Behavior |
|---|---|---|
| Core dot | Center origin | Appears first, tight and dark |
| Capillary rings | Absorption signal | 1-2 low-contrast rings expand outward and stop |
| Outer fog | Soft spread | Slight atmospheric ink haze, settles behind rings |

Constraints:

- No satellite droplets
- No splatter
- No decorative stamps or page labels
- No looping pulse after the first animation completes

### 3. Animation Timing

Single-run sequence using the project easing:

| Stage | Timing | Notes |
|---|---|---|
| Core appear | ~250-350ms | Small scale-up with fade-in |
| Primary spread | ~700-1000ms | Main expansion phase |
| Ring settle | ~1000-1300ms | Rings overshoot slightly, then stop |
| Fog settle | ~1200-1500ms | Ends last, very low opacity |

Shared easing:

`cubic-bezier(0.22, 1, 0.36, 1)`

Animation requirements:

- Play once on mount
- Hold final visual state
- No infinite repeat
- No shimmer
- No spinner semantics

### 4. Geometry and Softness

To avoid reading as a water ripple:

| Rule | Intention |
|---|---|
| Rings remain faint | Prevent hard circular graphic feel |
| Outer edges are blurred | Preserve ink absorption character |
| Final diameter stays moderate | Avoid consuming the whole viewport |
| Slight irregularity is allowed only at the fog layer | Keep B clean while avoiding sterile geometry |

Recommended scale envelope:

- Core: `16-20px`
- Inner ring: roughly `70-90px`
- Outer ring: roughly `105-130px`
- Fog: roughly `140-180px`

## Copy Treatment

The current localized loading copy remains below the mark.

| Aspect | Decision |
|---|---|
| Copy source | Keep existing translation source |
| Copy animation | Simplify if needed to avoid competing with the ink motion |
| Position | Centered below the ink composition |
| Tone | Quiet, secondary |

If the current token-by-token text animation competes visually with the new ink spread, reduce its motion amplitude rather than removing the text entirely.

## Component Impact

```text
Route loading.tsx files
        |
        v
  FullPageLoading
        |
        v
      Loading
        |
        +--> page surface background
        +--> center ink composition
        +--> localized loading copy
```

## Files to Modify

| File | Change |
|---|---|
| `apps/web/src/components/ui/loading/index.tsx` | Replace current mark/layout with full-page capillary-ring loading composition |

## Files Explicitly Unchanged

| File / Area | Reason |
|---|---|
| `apps/web/src/components/layout/dashboard/PageLoading.tsx` | Different product context, not part of this visual redesign |
| Local block loaders and button loaders | Not part of the selected scope |
| Route-level `loading.tsx` re-exports | They continue to consume `FullPageLoading` unchanged |

## Risks

| Risk | Mitigation |
|---|---|
| Reads as water ripple instead of ink | Keep ring borders soft and low-contrast |
| Looks too decorative for repeated navigation | Keep center composition compact and restrained |
| Text motion conflicts with ink motion | Reduce copy animation intensity |
| Light-mode only tuning breaks dark mode | Verify both themes, even if light mode is the primary reference |

## Validation

| Check | Expectation |
|---|---|
| Light mode | Reads as warm paper field with ink absorption |
| Dark mode | Still legible and calm, without turning into a neon ripple |
| Route transition | Animation feels like a single arrival event |
| Long loading duration | Final frame holds cleanly |
| Reduced distraction | No perpetual spinner feeling |

