# Modal Redesign Design

**Date:** 2026-03-16

**Scope:** Visual and animation restyle of the stacked modal system in `apps/web/src/components/ui/modal/stacked/`.

**Goal:** Align modal appearance with the 書写·信纸·光影 design language — remove glassmorphism, adopt letter-card structure, lighten shadow/overlay, and refine animation to evoke paper unfolding.

## Current State

- **Structure:** Header (title + close) → Divider → Scrollable content
- **Styling:** `bg-neutral-1/98`, `backdrop-blur-xs`, `shadow-2xl shadow-neutral-4`, `border-neutral-3`, `rounded-lg`
- **Animation:** Spring (scale 0.96→1 + opacity), `microReboundPreset` (stiffness 300, damping 20)
- **Overlay:** `bg-neutral-1/80` (80% opacity)
- **Stack:** Bottom modal scale 0.96 + translateY 10px
- **Mobile:** Converts to `vaul` bottom sheet (unchanged by this redesign)

### Design language violations

1. `backdrop-blur-xs` — glassmorphism is explicitly forbidden
2. `shadow-2xl` — too heavy for the light, paper-like aesthetic
3. Divider between header and content — rigid, not letter-like

## Design Decisions

### 1. Structure — Letter-card

Remove the header/divider/content tripartite structure. Replace with:

```
┌─────────────────────────────────┐
│                          [✕]    │  ← close button: absolute top-right
│  SECTION LABEL                  │  ← 9px uppercase tracking-[4px] neutral-6 (small text tier)
│  Title                          │  ← 15px font-medium neutral-9
│                                 │
│  (content, scrollable)          │
│                                 │
└─────────────────────────────────┘
```

- **Section label:** Optional. When `title` is provided, render as the main title. A new optional `label` prop on `ModalProps` provides the small uppercase section label above the title.
- **Close button:** Floating top-right, `rounded-md`, `bg-neutral-2` (light) / `bg-white/6` (dark), icon color `neutral-5`.
- **No divider** between header and content. Content flows naturally below the title with padding.
- **Padding:** `p-5` (20px) for the modal body. Title area: `pt-5 px-5`, content: `px-5 pb-5 pt-4`.

### 2. Surface & Border

| Property | Light | Dark |
|----------|-------|------|
| Background | `bg-[#fefefb]` (root-bg) | `dark:bg-neutral-2` (#242424) — intentionally deviates from `dark:bg-white/5` card convention for stronger readability in a floating dialog context |
| Border | `border border-black/5` | `border border-white/8` |
| Shadow | `shadow-[0_2px_12px_rgba(0,0,0,0.04)]` + `shadow-[0_0_0_0.5px_rgba(0,0,0,0.03)]` | `shadow-[0_4px_24px_rgba(0,0,0,0.3)]` + `shadow-[0_0_0_0.5px_rgba(255,255,255,0.04)]` |
| Border radius | `rounded-xl` (12px) | same |
| Backdrop blur | **none** (removed) | **none** |

### 3. Overlay

- `bg-black/12` (light) / `dark:bg-black/15` (dark) — use a single element with `dark:` modifier.
- Modal stands out via its own shadow and border, not via heavy overlay dimming.
- Stacked overlay cap: max 30% opacity regardless of stack depth.

### 4. Animation

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — shared project easing, replaces spring.

**Enter:**
```
initial:  { scaleY: 0.8, opacity: 0 }
animate:  { scaleY: 1, opacity: 1 }
transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
transform-origin: center top
```

**Exit:**
```
exit:     { scaleY: 0.8, opacity: 0 }
transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
```

**Notice (click outside when not dismissible):**
- Keep existing uniform `scale` pulse (1→1.01→1), duration 60ms. Uses `scale` (not `scaleY`) intentionally — the pulse is a brief attention cue, not part of the enter/exit metaphor.

### 5. Stack Behavior

When a new modal is pushed on top of an existing one:

- **Bottom modal:** `scale(0.93)` + `opacity(0.5)`, transition 350ms with project easing. Replaces the current `scale(0.96)` + `translateY(10px)` — `translateY` is removed; depth is conveyed solely through scale + opacity.
- **Restore on pop:** `scale(1)` + `opacity(1)`, same transition
- **Overlay:** Darkens slightly per layer (base 12%, +6% per additional modal, capped at 30%)

### 6. Drag

- **Preserved.** Drag handle remains on the header area (title/label region).
- `dragConstraints`, `dragElastic: 0`, `dragMomentum: false` — unchanged.
- Drag cursor: `grabbing` while dragging.
- `onPointerDown` on the title/label area to initiate drag.
- Close button must call `stopPropagation` on `onPointerDown` to prevent drag initiation when clicking close.

### 7. Mobile

- No changes. Mobile continues to convert to `vaul` PresentSheet.
- The `isMobile` check and sheet conversion logic remain as-is.

### 8. Props Changes

```typescript
interface ModalProps {
  // Existing (unchanged)
  title: ReactNode
  content: ModalContentComponent
  clickOutsideToDismiss?: boolean
  CustomModalComponent?: FC<PropsWithChildren>
  modalClassName?: string
  contentClassName?: string
  modalContainerClassName?: string
  wrapper?: ComponentType<PropsWithChildren>
  max?: boolean
  overlay?: boolean

  // New
  label?: string  // Small uppercase section label above title
}
```

## Files to Modify

1. **`apps/web/src/components/ui/modal/stacked/modal.tsx`** — Main structural and styling changes
2. **`apps/web/src/components/ui/modal/stacked/constants.ts`** — Replace `modalMontionConfig` (spring → CSS easing, scaleY animation)
3. **`apps/web/src/components/ui/modal/stacked/overlay.tsx`** — Reduce overlay opacity
4. **`apps/web/src/components/ui/modal/stacked/types.tsx`** — Add `label` prop

## Files Unchanged

- `context.tsx`, `provider.tsx`, `helper.tsx`, `declarative-modal.tsx`, `index.ts` — No structural changes needed
- All call sites (28 files using `useModalStack`) — Existing `title` + `content` API preserved; `label` is optional and additive
- Sheet/mobile components — Untouched

## Validation

- Build `@shiro/web` successfully
- Visual check: light mode single modal
- Visual check: dark mode single modal
- Stack behavior: open two modals, verify push-back effect
- Drag: verify header drag still works
- Mobile: verify sheet conversion still works
- Animation: verify enter/exit timing feels right
- Overlay: verify lightened opacity
- Label prop: verify rendering with label present and absent
