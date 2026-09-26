# Header 书页浮片 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the header navigation bar from pill-shaped glassmorphism to a rectangular "book page float" style, matching the 書写·信纸·光影 design language.

**Architecture:** Pure CSS/className changes in 2 files (HeaderContent.tsx, DropdownContents.tsx) + 1 CSS file check (nav-menu.css). No functional, behavioral, or structural changes. Remove spotlight effect code.

**Tech Stack:** Tailwind CSS v4, Base UI NavigationMenu, Motion (Framer Motion), clsx/clsxm

---

## Chunk 1: Header Restyling

### Task 1: Remove spotlight effect

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderContent.tsx`

- [ ] **Step 1: Remove spotlight imports**

In `HeaderContent.tsx`, change the motion import from:
```tsx
import {
  AnimatePresence,
  LayoutGroup,
  m,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react'
```
To:
```tsx
import {
  AnimatePresence,
  LayoutGroup,
  m,
} from 'motion/react'
```

- [ ] **Step 2: Remove spotlight hooks and handler**

In the `ForDesktop` component, delete these lines (approximately lines 106-119):
```tsx
const mouseX = useMotionValue(0)
const mouseY = useMotionValue(0)
const radius = useMotionValue(0)
const handleMouseMove = React.useCallback(
  ({ clientX, clientY, currentTarget }: React.MouseEvent) => {
    const bounds = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - bounds.left)
    mouseY.set(clientY - bounds.top)
    radius.set(Math.hypot(bounds.width, bounds.height) / 2.5)
  },
  [mouseX, mouseY, radius],
)

const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, var(--spotlight-color) 0%, transparent 65%)`
```

- [ ] **Step 3: Remove spotlight JSX and onMouseMove**

On `NavigationMenu.Root`, remove the `onMouseMove={handleMouseMove}` prop.

Delete the spotlight overlay div (approximately lines 150-154):
```tsx
<m.div
  aria-hidden="true"
  className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
  style={{ background }}
/>
```

- [ ] **Step 4: Clean up unused React import**

After removing `React.useCallback` for `handleMouseMove`, check if `React` namespace is still needed. The `React.cloneElement` in `AnimatedMenu` still uses it, so keep the `import * as React` but remove `useCallback` from the named imports if it's no longer used elsewhere. Note: `useCallback` is still used for `handleValueChange` and `getTitle`, so keep it.

- [ ] **Step 5: Lint check**

Run: `pnpm --filter @shiro/web lint -- --no-warn-ignored apps/web/src/components/layout/header/internal/HeaderContent.tsx`
Expected: No errors related to removed code.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderContent.tsx
git commit -m "refactor(header): remove spotlight effect"
```

---

### Task 2: Restyle navigation container

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderContent.tsx`

- [ ] **Step 1: Change NavigationMenu.Root className**

Replace the `NavigationMenu.Root` className block (currently around line 137-145):

Before:
```tsx
className={clsxm(
  'relative',
  'rounded-full bg-gradient-to-b from-neutral-1/70 to-neutral-2/90',
  'shadow-lg shadow-neutral-9/5 ring-1 ring-neutral-9/5 backdrop-blur-md',
  'group [--spotlight-color:oklch(from_var(--color-accent)_l_c_h_/_0.12)]',
  'pointer-events-auto duration-200',
  shouldHideNavBg && 'bg-none! shadow-none! ring-transparent!',
  className,
)}
```

After:
```tsx
className={clsxm(
  'relative',
  'rounded-sm',
  'bg-white/[0.38] dark:bg-neutral-900/[0.38]',
  'border border-[rgba(200,180,160,0.08)] dark:border-neutral-700/20',
  'pointer-events-auto duration-200',
  shouldHideNavBg && 'bg-none! border-transparent!',
  className,
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderContent.tsx
git commit -m "style(header): change nav container from pill to rectangular float"
```

---

### Task 3: Add separators between nav items

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderContent.tsx`

- [ ] **Step 1: Add NavSeparator component**

Add above the `ForDesktop` component:
```tsx
const NavSeparator = () => (
  <div className="h-3.5 w-px shrink-0 bg-gradient-to-b from-transparent via-black/[0.06] to-transparent dark:via-white/[0.06]" />
)
```

- [ ] **Step 2: Insert separators in the menu item loop**

In the `NavigationMenu.List`, wrap the `.map()` to insert separators between items. Replace:
```tsx
<NavigationMenu.List className="flex list-none px-4 font-medium text-neutral-9">
  {headerMenuConfig.map((section) => {
```

With:
```tsx
<NavigationMenu.List className="flex list-none items-center px-2 font-medium text-neutral-9">
  {headerMenuConfig.map((section, index) => {
```

Then at the end of each `return` in the map (both the `DropdownContent` branch and the plain link branch), wrap the return value with a Fragment that includes a separator. Change the map to use `Fragment`:

```tsx
{headerMenuConfig.map((section, index) => {
  // ... existing logic ...

  const menuItem = DropdownContent ? (
    <NavigationMenu.Item key={section.path} value={section.path}>
      {/* ... existing DropdownContent branch JSX ... */}
    </NavigationMenu.Item>
  ) : (
    <NavigationMenu.Item key={section.path}>
      {/* ... existing plain link branch JSX ... */}
    </NavigationMenu.Item>
  )

  return (
    <React.Fragment key={section.path}>
      {index > 0 && <NavSeparator />}
      {menuItem}
    </React.Fragment>
  )
})}
```

Note: Remove `key` from the inner `NavigationMenu.Item` elements since the key is now on the `Fragment`.

- [ ] **Step 3: Lint check**

Run: `pnpm --filter @shiro/web lint -- --no-warn-ignored apps/web/src/components/layout/header/internal/HeaderContent.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderContent.tsx
git commit -m "style(header): add vertical separators between nav items"
```

---

### Task 4: Restyle active item indicator

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderContent.tsx`

- [ ] **Step 1: Replace active item styling in Trigger (dropdown branch)**

Find the `NavigationMenu.Trigger` className (around line 190-193):

Before:
```tsx
className={clsxm(
  'relative inline-flex cursor-pointer items-center whitespace-nowrap border-none bg-transparent px-4 py-2 transition duration-200',
  isActive ? 'text-accent' : 'hover:text-accent/80',
)}
```

After:
```tsx
className={clsxm(
  'relative inline-flex cursor-pointer items-center whitespace-nowrap border-none bg-transparent px-3 py-1.5 transition duration-200',
  isActive
    ? 'text-neutral-9 bg-white/55 dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-[2px] m-0.5'
    : 'text-neutral-7 hover:text-neutral-9',
)}
```

- [ ] **Step 2: Remove the accent underline indicator in Trigger branch**

Delete the active underline `m.span` (approximately lines 211-219):
```tsx
{isActive && (
  <m.span
    layoutId="active-nav-item"
    className={clsx(
      'absolute inset-x-1 -bottom-px h-px',
      'bg-gradient-to-r from-accent/0 via-accent/70 to-accent/0',
    )}
  />
)}
```

- [ ] **Step 3: Replace active item styling in Link (plain link branch)**

Find the `NavigationMenu.Link` className (around line 233-235):

Before:
```tsx
className={clsxm(
  'relative block whitespace-nowrap px-4 py-2 transition duration-200',
  isActive ? 'text-accent' : 'hover:text-accent/80',
)}
```

After:
```tsx
className={clsxm(
  'relative block whitespace-nowrap px-3 py-1.5 transition duration-200',
  isActive
    ? 'text-neutral-9 bg-white/55 dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-[2px] m-0.5'
    : 'text-neutral-7 hover:text-neutral-9',
)}
```

- [ ] **Step 4: Remove the accent underline indicator in Link branch**

Delete the second active underline `m.span` (approximately lines 260-268):
```tsx
{isActive && (
  <m.span
    layoutId="active-nav-item"
    className={clsx(
      'absolute inset-x-1 -bottom-px h-px',
      'bg-gradient-to-r from-accent/0 via-accent/70 to-accent/0',
    )}
  />
)}
```

- [ ] **Step 5: Clean up unused clsx import**

After removing the accent underline, check if the `clsx` import (line 6) is still used. If `clsx` is no longer used anywhere (replaced by `clsxm`), remove it. Check by searching for `clsx(` calls (not `clsxm(`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderContent.tsx
git commit -m "style(header): replace accent active indicator with neutral float layer"
```

---

### Task 5: Restyle dropdown popup

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderContent.tsx`

- [ ] **Step 1: Change NavigationMenu.Popup className**

Find the Popup className (around line 282-286):

Before:
```tsx
className={clsxm(
  'nav-menu-popup',
  'select-none rounded-2xl bg-neutral-1/60 outline-hidden',
  'border border-neutral-9/5 shadow-lg shadow-neutral-9/5 backdrop-blur-md',
)}
```

After:
```tsx
className={clsxm(
  'nav-menu-popup',
  'select-none rounded bg-[var(--color-root-bg)] dark:bg-neutral-900 outline-hidden',
  'border border-[rgba(200,180,160,0.08)] dark:border-neutral-700/20',
  'shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderContent.tsx
git commit -m "style(header): change dropdown from glassmorphism to solid paper card"
```

---

### Task 6: Restyle dropdown hover states

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/DropdownContents.tsx`

- [ ] **Step 1: Replace all hover:bg-accent and hover:text-accent**

In `DropdownContents.tsx`, perform these replacements across the file:

| Before | After |
|--------|-------|
| `hover:bg-accent/5` | `hover:bg-black/[0.02] dark:hover:bg-white/[0.04]` |
| `hover:bg-accent/10 hover:text-accent` | `hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-neutral-9` |
| `hover:text-accent` (standalone, without bg) | `hover:text-neutral-9` |

There are 8 occurrences to change. Use search-and-replace carefully — some lines have both `hover:bg-accent/5` and `hover:text-accent` on the same className.

Specific lines to change (search for `hover:bg-accent`):
1. Line 40: `hover:bg-accent/5` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04]`
2. Line 82: `hover:bg-accent/10 hover:text-accent` → `hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-neutral-9`
3. Line 150: `hover:bg-accent/5 hover:text-accent` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9`
4. Line 219: `hover:bg-accent/5 hover:text-accent` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9`
5. Line 250: `hover:bg-accent/5 hover:text-accent` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9`
6. Line 314: `hover:bg-accent/5 hover:text-accent` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9`
7. Line 350: `hover:bg-accent/5 hover:text-accent` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9`
8. Line 430: `hover:bg-accent/5` → `hover:bg-black/[0.02] dark:hover:bg-white/[0.04]`

Also change any `rounded-lg` or `rounded-xl` in dropdown items to `rounded` to match the container's micro-rounded style:
- `rounded-lg` → `rounded` (on NavigationMenu.Link items)
- `rounded-xl` → `rounded` (on card-style items)

- [ ] **Step 2: Lint check**

Run: `pnpm --filter @shiro/web lint -- --no-warn-ignored apps/web/src/components/layout/header/internal/DropdownContents.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/header/internal/DropdownContents.tsx
git commit -m "style(header): change dropdown hover from accent to neutral gray"
```

---

### Task 7: Verify nav-menu.css compatibility

**Files:**
- Check: `apps/web/src/components/layout/header/internal/nav-menu.css`

- [ ] **Step 1: Verify no rounded-full references**

The `nav-menu.css` file does not reference `rounded-full` or any border-radius values that conflict with the new `rounded-sm` / `rounded` styling. The popup animation uses `transform-origin: var(--transform-origin)` and `scale(0.96)` which are shape-independent. **No changes needed.**

- [ ] **Step 2: Visual verification**

Run: `pnpm --filter @shiro/web dev`

Verify in browser:
1. Navigation container is rectangular (rounded-sm), not pill-shaped
2. No spotlight effect on mouse move
3. Vertical separators visible between nav items
4. Active item has subtle white float layer, text is neutral (not accent)
5. Dropdown popup is solid background with paper shadow, not glassmorphism
6. Dropdown hover states use neutral gray, not accent color
7. Dark mode: all elements render correctly
8. Scroll behavior: container hides/shows as before
9. Mobile: drawer button and behavior unchanged

- [ ] **Step 3: Final commit (if any CSS tweaks needed)**

```bash
git add -A
git commit -m "style(header): final polish for book-page-float design"
```
