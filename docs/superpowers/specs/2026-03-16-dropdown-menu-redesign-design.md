# Dropdown Menu Redesign Design

**Date:** 2026-03-16

**Scope:** Visual restyle of `DropdownMenu` in `apps/web/src/components/ui/dropdown-menu/`.

**Goal:** Align surface tokens and animation with the 書写·信纸·光影 design language, matching modal, float-popover, and float-panel redesigns.

## Current State

- **Surface:** `bg-neutral-1`, `border-neutral-4/50`, `drop-shadow`, `rounded-md`
- **Animation:** CSS transitions with `data-side` direction awareness, `scale(0.98)` + `translateY/X(6px)`, `ease` easing, 160ms
- **Item hover:** `data-[highlighted]:bg-neutral-2` (acceptable)
- **Separator:** `bg-neutral-4/20`

### Design language violations

1. `bg-neutral-1` — should be `bg-[#fefefb] dark:bg-neutral-2`
2. `border-neutral-4/50` — should be `border-black/5 dark:border-white/8`
3. `drop-shadow` — too generic, should use soft shadow + 0.5px ring
4. `rounded-md` — should be `rounded-xl` (12px)
5. `ease` easing — should be `cubic-bezier(0.22, 1, 0.36, 1)`
6. `scale(0.98) + translate` — should be directional scaleY/scaleX(0.8), no translate

## Design Decisions

### 1. Surface (DropdownMenuContent)

| Property | Light | Dark |
|----------|-------|------|
| Background | `bg-[#fefefb]` | `dark:bg-neutral-2` |
| Border | `border border-black/5` | `dark:border-white/8` |
| Shadow | `shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)]` | `dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)]` |
| Border radius | `rounded-xl` | same |

### 2. CSS Animation (dropdown-menu.css)

Keep CSS transition approach (not Motion). Keep `transform-origin: var(--transform-origin)` from Base UI.

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`

**Duration:** 200ms (unified enter/exit — CSS transitions use a single duration)

**Direction-aware scale (no translate):**

| data-side | Transform (starting/ending) |
|-----------|---------------------------|
| `bottom` | `scaleY(0.8)` |
| `top` | `scaleY(0.8)` |
| `left` | `scaleX(0.8)` |
| `right` | `scaleX(0.8)` |

Note: `--transform-origin` is set by Base UI's Positioner automatically based on side+align. This handles the origin correctly (e.g., bottom-start → top left, top-end → bottom right).

### 3. Separator

`bg-neutral-4/20` → `bg-black/5 dark:bg-white/8` (matches border tokens)

### 4. Unchanged

- Base UI component structure and all props interfaces
- DropdownMenuTrigger, DropdownMenuSubTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuShortcut
- Item highlight: `data-[highlighted]:bg-neutral-2` (already correct)
- SubTrigger highlight: `data-[highlighted]:bg-neutral-2/80` (already correct)
- All call sites — no API changes

## Files to Modify

1. **`apps/web/src/components/ui/dropdown-menu/index.tsx`** — Surface classes on DropdownMenuContent, separator color
2. **`apps/web/src/components/ui/dropdown-menu/dropdown-menu.css`** — Animation easing, duration, scale values

## Validation

- Build `@shiro/web` successfully
- Visual check: dropdown open/close animation
- Visual check: dark mode
- Visual check: submenu
- Separator appearance
