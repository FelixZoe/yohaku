# Mobile Bottom Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add bottom sheet mode to `@haklex/rich-editor-ui` dialog system for mobile-friendly interaction.

**Architecture:** Extend the existing `presentDialog` store with a `sheet` parameter. Create a standalone `BottomSheet` component with vaul-like touch gesture handling. `DialogStackProvider` conditionally renders sheet vs centered dialog based on `sheet` param + `matchMedia`.

**Tech Stack:** React 19, Vanilla Extract CSS-in-TS, native Touch Events API, `matchMedia` for responsive detection.

---

### Task 1: Add `sheet` field to store

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dialog/store.ts:3-12`

**Step 1: Add `sheet` to `DialogStackItemProps`**

```typescript
export interface DialogStackItemProps {
  title?: ReactNode
  description?: ReactNode
  content: FC<{ dismiss: () => void }>
  className?: string
  portalClassName?: string
  theme?: 'light' | 'dark'
  showCloseButton?: boolean
  clickOutsideToDismiss?: boolean
  sheet?: boolean | 'auto'
}
```

Only adds one field, no logic change. All existing call sites unaffected (defaults to `undefined` = modal).

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`
Expected: SUCCESS, no type errors.

---

### Task 2: Add bottom sheet styles

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dialog/styles.css.ts`

**Step 1: Add keyframes and styles for bottom sheet**

Append to the existing `styles.css.ts`:

```typescript
// -- Bottom Sheet --

const slideUp = keyframes({
  from: { transform: 'translateY(100%)' },
  to: { transform: 'translateY(0)' },
})

const slideDown = keyframes({
  from: { transform: 'translateY(0)' },
  to: { transform: 'translateY(100%)' },
})

export const sheetBackdrop = style({
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  transition: 'opacity 200ms ease',
})

export const sheetContainer = style({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '85vh',
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  backgroundColor: vars.color.bg,
  color: vars.color.text,
  fontFamily: vars.typography.fontFamilySans,
  boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
  willChange: 'transform',
  touchAction: 'none',
  selectors: {
    '&[data-open]': {
      animation: `${slideUp} 300ms cubic-bezier(0.32, 0.72, 0, 1)`,
    },
    '&[data-closed]': {
      animation: `${slideDown} 200ms ease-in`,
    },
  },
})

export const sheetDragHandle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 0 4px',
  cursor: 'grab',
  flexShrink: 0,
  ':active': {
    cursor: 'grabbing',
  },
})

export const sheetDragPill = style({
  width: 36,
  height: 4,
  borderRadius: 2,
  backgroundColor: vars.color.textTertiary,
  opacity: 0.5,
})

export const sheetContent = style({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '0 1.5rem 1.5rem',
  WebkitOverflowScrolling: 'touch',
})

export const sheetHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  textAlign: 'center',
  padding: '0 1.5rem 0.5rem',
})
```

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`
Expected: SUCCESS

---

### Task 3: Create BottomSheet component with touch gestures

**Files:**
- Create: `haklex/rich-editor-ui/src/components/dialog/sheet.tsx`

**Step 1: Write the BottomSheet component**

```tsx
import {
  PortalThemeProvider,
  PortalThemeWrapper,
} from '@haklex/rich-style-token'
import type { FC } from 'react'
import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { DialogStackItem } from './store'
import { dismissDialog, removeDialog } from './store'
import * as css from './styles.css'

export const SheetStackEntry: FC<{
  item: DialogStackItem
  index: number
}> = ({ item, index }) => {
  const {
    id,
    open,
    title,
    description,
    content,
    className,
    portalClassName,
    theme = 'light',
    showCloseButton,
    clickOutsideToDismiss = true,
  } = item

  const dismiss = useCallback(() => dismissDialog(id), [id])

  // Remove from stack after close animation
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => removeDialog(id), 200)
      return () => clearTimeout(timer)
    }
  }, [open, id])

  // -- Body scroll lock --
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // -- Touch gesture state --
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{
    startY: number
    startTime: number
    currentY: number
    isDragging: boolean
    startedOnHandle: boolean
  } | null>(null)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const target = e.target as HTMLElement
    const isHandle = target.closest(`.${css.sheetDragHandle}`) !== null
    const contentEl = contentRef.current
    const isContentAtTop = !contentEl || contentEl.scrollTop <= 0

    // Only allow drag from handle or when content is scrolled to top
    if (!isHandle && !isContentAtTop) return

    dragState.current = {
      startY: touch.clientY,
      startTime: Date.now(),
      currentY: touch.clientY,
      isDragging: false,
      startedOnHandle: isHandle,
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = dragState.current
    if (!state) return

    const touch = e.touches[0]
    const deltaY = touch.clientY - state.startY

    // Only drag downward (positive deltaY)
    if (deltaY < 0) {
      if (state.isDragging) {
        setTranslateY(0)
        setIsDragging(false)
        state.isDragging = false
      }
      return
    }

    // Start dragging after 5px threshold
    if (!state.isDragging && deltaY > 5) {
      state.isDragging = true
      setIsDragging(true)
    }

    if (state.isDragging) {
      e.preventDefault()
      state.currentY = touch.clientY
      setTranslateY(deltaY)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const state = dragState.current
    if (!state || !state.isDragging) {
      dragState.current = null
      return
    }

    const deltaY = state.currentY - state.startY
    const elapsed = Date.now() - state.startTime
    const velocity = deltaY / Math.max(elapsed, 1) * 1000 // px/s
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0
    const threshold = sheetHeight * 0.25

    if (deltaY > threshold || velocity > 500) {
      // Dismiss
      dismiss()
    } else {
      // Spring back
      setTranslateY(0)
    }

    setIsDragging(false)
    dragState.current = null
  }, [dismiss])

  // Backdrop opacity based on drag
  const sheetHeight = sheetRef.current?.offsetHeight ?? 1
  const backdropOpacity = isDragging
    ? Math.max(0, 1 - translateY / sheetHeight) * 0.5
    : open ? 0.5 : 0

  const zIndex = 50 + index

  return (
    <PortalThemeProvider className={portalClassName ?? ''} theme={theme}>
      <PortalThemeWrapper>
        {/* Backdrop */}
        <div
          className={css.sheetBackdrop}
          style={{
            zIndex,
            opacity: backdropOpacity,
            pointerEvents: open ? 'auto' : 'none',
          }}
          onClick={clickOutsideToDismiss ? dismiss : undefined}
        />

        {/* Sheet */}
        <div
          ref={sheetRef}
          className={`${css.sheetContainer}${className ? ` ${className}` : ''}`}
          data-open={open ? '' : undefined}
          data-closed={!open ? '' : undefined}
          style={{
            zIndex: zIndex + 1,
            transform: isDragging ? `translateY(${translateY}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className={css.sheetDragHandle}>
            <div className={css.sheetDragPill} />
          </div>

          {/* Header */}
          {(title || description) && (
            <div className={css.sheetHeader}>
              {title && <div className={css.title}>{title}</div>}
              {description && <div className={css.description}>{description}</div>}
            </div>
          )}

          {/* Content */}
          <div ref={contentRef} className={css.sheetContent}>
            {createElement(content, { dismiss })}
          </div>
        </div>
      </PortalThemeWrapper>
    </PortalThemeProvider>
  )
}
```

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`
Expected: SUCCESS

---

### Task 4: Wire up conditional rendering in stack.tsx

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dialog/stack.tsx`

**Step 1: Add `useIsMobile` hook and conditional rendering**

Add a `useIsMobile` hook that listens to `matchMedia('(max-width: 640px)')`. In `DialogStackProvider`, determine per-item whether to render `DialogStackEntry` or `SheetStackEntry`.

```tsx
// Add import at top
import { SheetStackEntry } from './sheet'

// Add hook before DialogStackEntry
function useIsMobile(): boolean {
  const query = '(max-width: 640px)'
  const subscribe = useCallback((cb: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
  }, [])
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [])
  const getServerSnapshot = useCallback(() => false, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Helper to decide sheet mode
function shouldUseSheet(
  sheet: boolean | 'auto' | undefined,
  isMobile: boolean,
): boolean {
  if (sheet === true) return true
  if (sheet === 'auto') return isMobile
  return false
}
```

Update `DialogStackProvider` to pass `isMobile` and choose entry type:

```tsx
export const DialogStackProvider: FC<PropsWithChildren> = ({ children }) => {
  const stack = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const isMobile = useIsMobile()

  return (
    <>
      {children}
      {stack.map((item, index) =>
        shouldUseSheet(item.sheet, isMobile) ? (
          <SheetStackEntry key={item.id} item={item} index={index} />
        ) : (
          <DialogStackEntry key={item.id} item={item} index={index} />
        ),
      )}
    </>
  )
}
```

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`
Expected: SUCCESS

---

### Task 5: Manual verification in dev playground

**Files:**
- Modify: `haklex/rich-editor-demo/src/App.tsx` (temporary test code)

**Step 1: Add a test button to demo app**

Add a temporary button that calls `presentDialog({ sheet: 'auto', ... })` to verify mobile bottom sheet behavior.

**Step 2: Run dev server and test**

Run: `pnpm --filter @haklex/rich-editor-demo dev`

Test in Chrome DevTools mobile emulator:
- Verify bottom sheet slides up from bottom on mobile viewport
- Verify centered dialog on desktop viewport
- Verify drag-to-dismiss gesture works
- Verify backdrop opacity changes during drag
- Verify spring-back when released below threshold
- Verify body scroll is locked

**Step 3: Remove test code and commit**

Remove temporary test button. Commit all changes.

```bash
git add haklex/rich-editor-ui/src/components/dialog/
git commit -m "feat(rich-editor-ui): add bottom sheet mode for mobile dialog"
```
