# Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the stacked modal system to match the 書写·信纸·光影 design language — letter-card structure, no glassmorphism, scaleY unfold animation, push-back stack effect, lightened overlay.

**Architecture:** Visual-only restyle of 4 files in `apps/web/src/components/ui/modal/stacked/`. No API breaking changes — all 28 call sites remain unchanged. New optional `label` prop is additive.

**Tech Stack:** React, Motion (Framer Motion), @base-ui/react/dialog, Tailwind CSS, Jotai

**Spec deviation:** The spec specifies exit duration 0.2s vs enter 0.3s. Motion's `transition` prop applies to all states uniformly. To implement asymmetric duration, we embed a `transition` key inside the `exit` object. This is the correct Motion API pattern.

---

## Chunk 1: Implementation

### Task 1: Add `label` prop to ModalProps

**Files:**
- Modify: `apps/web/src/components/ui/modal/stacked/types.tsx`

- [ ] **Step 1: Add `label` prop to interface**

In `types.tsx`, add `label?: string` to the `ModalProps` interface:

```typescript
export interface ModalProps {
  clickOutsideToDismiss?: boolean
  content: FC<ModalContentPropsInternal>
  contentClassName?: string
  CustomModalComponent?: FC<PropsWithChildren>
  label?: string
  max?: boolean
  modalClassName?: string
  modalContainerClassName?: string

  overlay?: boolean

  title: ReactNode

  wrapper?: FC
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `ModalProps`

---

### Task 2: Replace animation config in constants

**Files:**
- Modify: `apps/web/src/components/ui/modal/stacked/constants.ts`

- [ ] **Step 1: Replace entire file with scaleY unfold animation**

```typescript
import type { MotionProps } from 'motion/react'

export const MODAL_EASING = [0.22, 1, 0.36, 1]

export const modalMontionConfig: MotionProps = {
  initial: { scaleY: 0.8, opacity: 0 },
  animate: { scaleY: 1, opacity: 1 },
  exit: {
    scaleY: 0.8,
    opacity: 0,
    transition: { duration: 0.2, ease: MODAL_EASING },
  },
  transition: { duration: 0.3, ease: MODAL_EASING },
}

export const MODAL_STACK_Z_INDEX = 100
```

Changes: removes `microReboundPreset` import, replaces spring with CSS easing, uses `scaleY` instead of `scale`, exit has its own `transition` (0.2s) embedded inside the `exit` object (Motion API pattern for per-state transitions).

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

---

### Task 3: Lighten overlay and add per-layer darkening

**Files:**
- Modify: `apps/web/src/components/ui/modal/stacked/overlay.tsx`
- Modify: `apps/web/src/components/ui/modal/stacked/provider.tsx`

- [ ] **Step 1: Update overlay to accept dynamic opacity with dark mode support**

Replace `overlay.tsx` entirely. Uses two stacked background layers via inline style to differentiate light/dark base opacity (light: 0.12, dark: 0.15 per spec). The `isDark` flag is derived from the document's class list.

```typescript
import { m } from 'motion/react'
import { useMemo } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'

import { RootPortal } from '../../portal'

export const ModalOverlay = ({
  zIndex,
  stackSize = 1,
}: {
  zIndex?: number
  stackSize?: number
}) => {
  const isDark = useIsDark()
  const baseOpacity = isDark ? 0.15 : 0.12
  const opacity = Math.min(baseOpacity + (stackSize - 1) * 0.06, 0.3)

  return (
    <RootPortal>
      <m.div
        animate={{ opacity: 1 }}
        className="pointer-events-none fixed inset-0 z-[11]"
        exit={{ opacity: 0 }}
        id="modal-overlay"
        initial={{ opacity: 0 }}
        style={{ zIndex, backgroundColor: `rgba(0,0,0,${opacity})` }}
      />
    </RootPortal>
  )
}
```

Note: If `useIsDark` hook doesn't exist, check for alternatives like `useTheme` or detect via `document.documentElement.classList.contains('dark')`. Search the codebase for the actual dark mode detection pattern used.

- [ ] **Step 2: Pass stack size from ModalStack**

In `provider.tsx`, update the `ModalOverlay` usage in the `ModalStack` component. Replace:

```tsx
{stack.length > 0 && forceOverlay && !isMobile && (
  <ModalOverlay zIndex={MODAL_STACK_Z_INDEX + stack.length - 1} />
)}
```

With:

```tsx
{stack.length > 0 && forceOverlay && !isMobile && (
  <ModalOverlay
    zIndex={MODAL_STACK_Z_INDEX + stack.length - 1}
    stackSize={stack.length}
  />
)}
```

Progressive darkening logic is now inside the overlay component itself, with dark mode awareness.

- [ ] **Step 3: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

---

### Task 4: Restyle modal component — structure and visuals

**Files:**
- Modify: `apps/web/src/components/ui/modal/stacked/modal.tsx`

- [ ] **Step 1: Update imports**

Remove the `Divider` import (no longer used). No other import changes needed — `modalMontionConfig` and `MODAL_STACK_Z_INDEX` imports stay the same.

Remove:
```typescript
import { Divider } from '~/components/ui/divider'
```

- [ ] **Step 2: Destructure `label` from item**

In the destructuring block (around line 77-87), add `label`:

```typescript
  const {
    CustomModalComponent,
    modalClassName,
    content,
    contentClassName,
    title,
    label,
    clickOutsideToDismiss,
    modalContainerClassName,
    wrapper: Wrapper = Fragment,
    max,
  } = item
```

- [ ] **Step 3: Update stack push-back effect**

Replace the `isTop` useEffect (around line 126-143). Changes: `scale 0.96` → `0.93`, add `opacity: 0.5`, remove `y: 10` (translateY removed per spec). Restore explicitly sets `y: 0` to clear any residual Motion state. Both push-back and restore use explicit 350ms transition per spec.

```typescript
  useEffect(() => {
    if (isTop) return
    animateController.start({
      scale: 0.93,
      opacity: 0.5,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    })
    return () => {
      try {
        animateController.stop()
        animateController.start({
          scale: 1,
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        })
      } catch {
        /* empty */
      }
    }
  }, [isTop])
```

- [ ] **Step 4: Replace the entire default modal JSX (lines 226-293)**

This is the main return block for the standard (non-CustomModalComponent, non-mobile) case. Replace the entire `return (...)` block starting at `return (` (around line 226) through the closing `)` of `ModalInternal`.

The complete new JSX for the default return:

```tsx
  return (
    <Wrapper>
      <Dialog.Root open onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Popup
            ref={edgeElementRef}
            style={zIndexStyle}
            className={clsxm(
              'center fixed inset-0 z-20 flex',
              currentIsClosing ? 'pointer-events-none!' : 'pointer-events-auto',
              modalContainerClassName,
            )}
            onClick={clickOutsideToDismiss ? dismiss : noticeModal}
          >
            <m.div
              ref={setModalContentRef}
              style={{ ...zIndexStyle, transformOrigin: 'center top' }}
              {...modalMontionConfig}
              drag
              animate={animateController}
              dragConstraints={edgeElementRef}
              dragControls={dragController}
              dragElastic={0}
              dragListener={false}
              dragMomentum={false}
              className={clsxm(
                'relative flex flex-col overflow-hidden rounded-xl',
                'bg-[#fefefb] dark:bg-neutral-2',
                'shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)]',
                max
                  ? 'h-[90vh] w-[90vw]'
                  : 'max-h-[70vh] min-w-[300px] max-w-[90vw] lg:max-h-[calc(100vh-20rem)] lg:max-w-[70vw]',
                'border border-black/5 dark:border-white/8',
                modalClassName,
              )}
              whileDrag={{
                cursor: 'grabbing',
              }}
              onClick={stopPropagation}
            >
              <Dialog.Close
                className="absolute right-3.5 top-3.5 z-10 flex size-6 items-center justify-center rounded-md bg-neutral-2 text-neutral-5 dark:bg-white/6"
                onClick={close}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CloseIcon />
              </Dialog.Close>
              <div
                className="px-5 pt-5"
                onPointerDown={(e) => dragController.start(e)}
              >
                {label && (
                  <div className="text-[9px] uppercase tracking-[4px] text-neutral-6">
                    {label}
                  </div>
                )}
                <Dialog.Title className="min-w-0 truncate pr-8 text-[15px] font-medium leading-normal">
                  {title}
                </Dialog.Title>
              </div>
              <div
                className={clsxm(
                  'min-h-0 shrink grow overflow-auto px-5 pb-5 pt-4',
                  contentClassName,
                )}
              >
                {finalChildren}
              </div>
            </m.div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </Wrapper>
  )
```

Key changes from old code:
- `rounded-lg` → `rounded-xl`
- `bg-neutral-1/98` → `bg-[#fefefb] dark:bg-neutral-2`
- `shadow-2xl shadow-neutral-4 backdrop-blur-xs` → soft shadow with 0.5px ring, no blur
- `border-neutral-3` → `border-black/5 dark:border-white/8`
- `p-2` → removed (padding now in header/content areas)
- `style={zIndexStyle}` → `style={{ ...zIndexStyle, transformOrigin: 'center top' }}`
- Header: inline title+close → floating close button + section label + title area
- Divider: removed entirely
- Content padding: `px-4 py-2` → `px-5 pb-5 pt-4`
- `noticeModal` callback: unchanged (uses uniform `scale: 1.01`, intentionally not `scaleY`)

- [ ] **Step 5: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Verify build**

Run: `pnpm --filter @shiro/web build 2>&1 | tail -20`
Expected: Build succeeds

---

### Task 5: Lint and commit

- [ ] **Step 1: Lint modified files**

Run from workspace root:
```bash
pnpm --filter @shiro/web exec eslint --fix src/components/ui/modal/stacked/modal.tsx src/components/ui/modal/stacked/constants.ts src/components/ui/modal/stacked/overlay.tsx src/components/ui/modal/stacked/types.tsx src/components/ui/modal/stacked/provider.tsx
```

Note: paths are relative to `apps/web/` because `exec` runs from the package directory.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ui/modal/stacked/{types.tsx,constants.ts,overlay.tsx,modal.tsx,provider.tsx}
git commit -m "feat(web): redesign modal to letter-card style

- Remove glassmorphism (backdrop-blur), adopt bg-[#fefefb] / dark:bg-neutral-2
- Letter-card structure: section label + title, no divider, floating close button
- ScaleY unfold animation (0.8→1, exit 0.2s) with cubic-bezier(0.22,1,0.36,1)
- Push-back stack: scale(0.93) + opacity(0.5), remove translateY
- Lighten overlay: bg-black/12 + progressive darkening (+6%/layer, cap 30%)
- Add optional label prop to ModalProps
- rounded-xl (12px), soft shadow with 0.5px ring"
```
