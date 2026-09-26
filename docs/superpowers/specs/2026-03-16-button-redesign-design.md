# Button Redesign Design

**Date:** 2026-03-16

**Scope:** Visual restyle of button components in `apps/web/src/components/ui/button/`.

**Goal:** Align with 書写·信纸·光影 design language — outlined/ink-pressure interaction model, remove scale animations, remove glassmorphism from secondary variant.

## Current State

- **MotionButtonBase:** `whileHover: scale(1.02)`, `whileTap: scale(0.95)` — digital rubber-band feel
- **StyledButton primary:** `bg-accent`, `hover:contrast-[1.10]`, `rounded-lg`
- **StyledButton secondary:** `bg-gradient-to-b`, `backdrop-blur`, `shadow-lg`, `rounded-full`, `ring-1`
- **RoundedIconButton:** `rounded-full`, `bg-accent`, `p-2`

### Design language violations

1. Secondary uses `backdrop-blur` (glassmorphism forbidden)
2. Secondary uses gradient + heavy shadow
3. Scale animations contradict paper metaphor (paper doesn't scale)
4. `rounded-lg` / `rounded-full` inconsistent with `rounded-xl` convention

## Design Decisions

### 1. Interaction Model — Ink Pressure

Paper doesn't scale. Ink responds to pressure. All button interactions use color deepening + micro-displacement, driven by CSS transitions.

| State | Effect | Metaphor |
|-------|--------|----------|
| Default | Static | Ink on paper |
| Hover | bg-opacity +4%, border-opacity +15% | Pen hovering, ink bleeds |
| Active | bg-opacity +8%, border-opacity +20%, translateY(1px) | Pen presses paper |
| Disabled | bg/border/text opacity reduced, cursor not-allowed | Faded ink |

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`, duration 200ms.

**No scale animations.** `MotionButtonBase` removes `whileHover`, `whileFocus`, `whileTap`.

### 2. Variants

**Primary** — accent-tinted outline:
```
default:  bg-accent/8  border border-accent/30  text-accent  font-medium
hover:    bg-accent/12  border-accent/45
active:   bg-accent/16  border-accent/50  translateY(1px)
disabled: bg-accent/4   border-accent/15  text-accent/40  cursor-not-allowed
```
Uses dynamic `--color-accent` CSS variable (OKLCH) so it works with the theme's accent color system.

**Secondary** — neutral outline:
```
default:  bg-transparent  border border-black/10  dark:border-white/10  text-neutral-9
hover:    bg-black/[0.02]  dark:bg-white/4  border-black/15  dark:border-white/15
active:   bg-black/[0.04]  dark:bg-white/6  border-black/18  dark:border-white/18  translateY(1px)
disabled: opacity-50  cursor-not-allowed
```

**Ghost** (new variant):
```
default:  bg-transparent  border-transparent  text-neutral-7
hover:    bg-black/[0.03]  dark:bg-white/4  text-neutral-9
active:   bg-black/[0.06]  dark:bg-white/6  translateY(1px)
```

All variants: `rounded-xl` (12px), `px-3 py-2`, `text-sm`.

### 3. MotionButtonBase

Remove `whileHover`, `whileFocus`, `whileTap` scale props. Keep `m.button` for any future motion needs, but interaction is now pure CSS via `transition` + `hover:` / `active:` classes.

### 4. RoundedIconButton

Rename concept to icon-button style. Uses secondary surface with square padding:
```
bg-transparent  border border-black/10  dark:border-white/10  rounded-lg (10px)  p-2
hover/active: same as secondary
```

### 5. Loading State

Unchanged — LoadingButtonWrapper overlay with spinner.

## Files to Modify

1. **`apps/web/src/components/ui/button/StyledButton.tsx`** — Replace variant styles in `tv()` config, add `ghost` variant
2. **`apps/web/src/components/ui/button/MotionButton.tsx`** — Remove scale animation props
3. **`apps/web/src/components/ui/button/RoundedIconButton.tsx`** — Replace accent bg with outlined style

## Files Unchanged

- `button/index.ts` — Re-exports only
- All 30 call sites — `primary`/`secondary` variant names preserved. `ghost` is additive.

## Validation

- Build `@shiro/web` successfully
- Visual check: primary hover/active states
- Visual check: secondary hover/active states
- Visual check: disabled states
- Visual check: dark mode all variants
- Visual check: RoundedIconButton
- Visual check: loading state overlay
