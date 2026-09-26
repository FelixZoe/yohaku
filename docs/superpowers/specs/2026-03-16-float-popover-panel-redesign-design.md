# Float-Popover & Float-Panel Redesign Design

**Date:** 2026-03-16

**Scope:** Visual and animation restyle of `FloatPopover` and `FloatPanel` in `apps/web/src/components/ui/float-popover/` and `apps/web/src/components/ui/float-panel/`.

**Goal:** Align with the 書写·信纸·光影 design language and the modal redesign — remove glassmorphism, adopt letter-card surface, and introduce direction-aware expand animation based on placement.

## Current State

**FloatPopover** (`FloatPopover.tsx`):
- **Surface:** `bg-neutral-1/80` + `backdrop-blur-lg` + `border-neutral-5/20` + `shadow-perfect`
- **Animation:** `translateY(10px→0)` + opacity, `microReboundPreset` spring
- **Exit:** `translateY(10px)` + opacity 0, tween 0.2s
- **Tooltip mode:** Same surface, `max-w-[25rem] px-4 py-2`
- **Headless mode:** Strips surface styles, keeps shadow
- **Mobile:** Converts to `PresentSheet` when `mobileAsSheet` is true

**FloatPanel** (`FloatPanel.tsx`):
- **Surface:** `bg-neutral-1/80` + `backdrop-blur-lg` + `border-neutral-5/20` + `shadow-lg` + `shadow-out-sm!`
- **Animation:** `translateY(10px→0)` + opacity, no explicit easing (default Motion spring)
- **Exit:** `translateY(10px)` + opacity 0.02

### Design language violations

1. `backdrop-blur-lg` — glassmorphism is explicitly forbidden
2. `bg-neutral-1/80` — semi-transparent background, should be opaque
3. `microReboundPreset` — spring easing, should use project easing `cubic-bezier(0.22, 1, 0.36, 1)`
4. `shadow-perfect` / `shadow-out-sm!` — heavyweight shadows, should match modal's soft shadow

## Design Decisions

### 1. Surface & Border (unified with modal)

| Property | Light | Dark |
|----------|-------|------|
| Background | `bg-[#fefefb]` | `dark:bg-neutral-2` |
| Border | `border border-black/5` | `dark:border-white/8` |
| Shadow | `shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]` | `dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)]` |
| Border radius | `rounded-xl` (12px) | same |
| Backdrop blur | **none** (removed) | **none** |

Same tokens as the modal redesign. Popover and panel are visually identical card surfaces.

### 2. Animation — Direction-Aware Expand

The popover/panel grows outward from the trigger element. The scale axis and transform-origin are determined by the **resolved** placement from `useFloating`'s return value (not the prop). This is critical because `flip()` middleware may change the actual placement at runtime (e.g., a `bottom` popover flips to `top` when there's no space below). Destructure `placement` from the `useFloating` return and pass it to the animation utility.

| Placement starts with | Scale | Transform Origin | Rationale |
|----------------------|-------|-----------------|-----------|
| `bottom` | `scaleY(0.8→1)` | `center top` | Grows downward from trigger |
| `top` | `scaleY(0.8→1)` | `center bottom` | Grows upward from trigger |
| `right` | `scaleX(0.8→1)` | `left center` | Grows rightward from trigger |
| `left` | `scaleX(0.8→1)` | `right center` | Grows leftward from trigger |

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — shared project easing.

**Enter:** 250ms. **Exit:** 180ms.

**Exit animation** mirrors enter: same scale direction back to 0.8, opacity to 0.

Placement values like `bottom-start`, `bottom-end` use the primary axis (`bottom`). Extract via `placement.split('-')[0]`.

**Dynamic placement changes:** If `flip()` changes placement while the popover is open (e.g., on scroll), the `transformOrigin` should update reactively via the `style` prop. The initial/animate/exit Motion props are read at mount/unmount and do not need to update dynamically — only `transformOrigin` must track the resolved placement.

### 3. Headless Mode

When `headless` is true, **all** surface styles (bg, border, shadow, rounded) are stripped. Only the animation and positioning apply.

**Behavioral change from current code:** Currently `shadow-perfect` is applied outside the `!headless` guard, meaning headless popovers still show shadow. The new implementation moves shadow inside the `!headless` conditional, so headless mode truly strips all visual chrome. This is a minor behavioral fix — headless should mean no visual surface.

### 4. Tooltip Mode

Same surface as popover. Padding remains `px-4 py-2` with `max-w-[25rem]`. No structural change — only surface and animation updated.

### 5. Unchanged

- Floating-UI positioning logic (`useFloating`, `flip`, `offset`, `shift`)
- Trigger mechanism (hover/click/both)
- Mobile sheet conversion (`mobileAsSheet` + `PresentSheet`)
- Click-away dismiss logic
- `PopoverActionContext` and `usePopoverAction`
- `FloatPanel` click-toggle behavior
- Portal rendering via `RootPortal`
- Props interfaces (no new props needed — `placement` is already available)

## Implementation Approach

Create a shared utility function that maps `placement` to animation config (initial/animate/exit + style with transformOrigin). Both `FloatPopover` and `FloatPanel` consume it.

```typescript
type PlacementDirection = 'top' | 'bottom' | 'left' | 'right'

function getPopoverAnimationConfig(placement: string) {
  const dir = (placement.split('-')[0] || 'bottom') as PlacementDirection

  const scaleAxis = dir === 'left' || dir === 'right' ? 'scaleX' : 'scaleY'

  const originMap: Record<PlacementDirection, string> = {
    bottom: 'center top',
    top: 'center bottom',
    right: 'left center',
    left: 'right center',
  }

  return {
    initial: { [scaleAxis]: 0.8, opacity: 0 },
    animate: { [scaleAxis]: 1, opacity: 1 },
    exit: {
      [scaleAxis]: 0.8,
      opacity: 0,
      transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
    },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
    style: { transformOrigin: originMap[dir] },
  }
}
```

This utility replaces both the `microReboundPreset` usage in FloatPopover and the inline animation props in FloatPanel.

## Files to Modify

1. **`apps/web/src/components/ui/float-popover/FloatPopover.tsx`** — Surface classes, animation config, remove `microReboundPreset` import
2. **`apps/web/src/components/ui/float-panel/FloatPanel.tsx`** — Surface classes, animation config

## Files to Create

1. **`apps/web/src/components/ui/float-popover/animation.ts`** — Shared `getPopoverAnimationConfig` utility. `FloatPanel` imports from `../float-popover/animation` — acceptable cross-directory dependency since both are floating UI components.

## Files Unchanged

- `float-popover/index.ts`, `float-panel/index.ts` — Re-exports only
- All call sites — No API changes
- Sheet/mobile components — Untouched

## Validation

- Build `@shiro/web` successfully
- Visual check: popover with bottom placement (most common)
- Visual check: popover with top/left/right placements
- Visual check: tooltip mode
- Visual check: dark mode
- Visual check: FloatPanel click toggle
- Headless mode: verify no surface styles applied
- Mobile: verify sheet conversion still works
- Flip scenario: trigger near viewport edge, verify animation direction matches flipped placement
