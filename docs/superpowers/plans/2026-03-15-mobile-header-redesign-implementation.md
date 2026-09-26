# Mobile Header 融合浮片 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile header's bottom-sheet drawer (Vaul) with a top-down "fused floating card" that merges with the header, using tag-based navigation with split buttons for sub-menus.

**Architecture:** Rewrite `HeaderDrawerButton.tsx` as the mobile menu orchestrator (state, overlay, merged card, a11y) and `HeaderDrawerContent.tsx` as the tag-based navigation panel. Render via `RootPortal` to overlay the page. No changes to `Header.tsx`, desktop nav, or config.

**Tech Stack:** React 19, Motion (Framer Motion), Tailwind CSS v4, next-intl, clsxm

---

## Chunk 1: Mobile Menu Rewrite

### Task 1: Rewrite HeaderDrawerButton

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderDrawerButton.tsx`

This task replaces the PresentSheet-based drawer with a custom top-down panel. The component becomes the full mobile menu orchestrator: hamburger icon with CSS animation, overlay, merged floating card, a11y, scroll lock, escape key, and auto-close on navigation.

- [ ] **Step 1: Rewrite HeaderDrawerButton.tsx**

Replace the entire file content:

```tsx
'use client'

import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'
import { createContext, use, useCallback, useEffect, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { RootPortal } from '~/components/ui/portal'
import { useIsClient } from '~/hooks/common/use-is-client'
import { usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import { AnimatedLogo } from './AnimatedLogo'
import { HeaderDrawerContent } from './HeaderDrawerContent'
import { useMenuOpacity } from './hooks'
import { UserAuth } from './UserAuth'

export const MobileMenuContext = createContext({ close: () => {} })
export const useMobileMenu = () => use(MobileMenuContext)

export const HeaderDrawerButton = () => {
  const t = useTranslations('common')
  const isClient = useIsClient()
  const isMobile = useIsMobile()
  const menuOpacity = useMenuOpacity()
  const pathname = usePathname()

  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Auto-close on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close])

  const opacityStyle: CSSProperties | undefined =
    isMobile && menuOpacity !== undefined
      ? {
          opacity: menuOpacity,
          visibility: menuOpacity === 0 ? 'hidden' : 'visible',
        }
      : undefined

  const buttonLabel = isOpen
    ? t('aria_header_drawer_close')
    : t('aria_header_drawer')

  return (
    <>
      {/* Hamburger / Close button */}
      <button
        aria-controls="mobile-nav-panel"
        aria-expanded={isOpen}
        aria-label={buttonLabel}
        className={clsxm(
          'group size-10 rounded-full bg-neutral-1',
          'text-sm ring-1 ring-neutral-9/5 transition',
          'flex items-center justify-center',
        )}
        style={opacityStyle}
        onClick={toggle}
      >
        <HamburgerIcon isOpen={isOpen} />
      </button>

      {/* Mobile menu overlay + merged card */}
      {isClient && (
        <RootPortal>
          <AnimatePresence>
            {isOpen && (
              <MobileMenuContext value={{ close }}>
                {/* Overlay */}
                <m.div
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[19] bg-black/[0.06] dark:bg-black/[0.3]"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={close}
                />

                {/* Merged floating card */}
                <m.div
                  animate={{ y: 0, opacity: 1 }}
                  className={clsxm(
                    'fixed inset-x-0 top-0 z-[20] mx-2 mt-2',
                    'rounded-sm',
                    'bg-[var(--color-root-bg)] dark:bg-neutral-900',
                    'border border-[rgba(200,180,160,0.12)] dark:border-neutral-700/20',
                    'shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]',
                    'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
                  )}
                  exit={{ y: '-100%', opacity: 0 }}
                  id="mobile-nav-panel"
                  initial={{ y: '-100%', opacity: 0 }}
                  role="dialog"
                  transition={{
                    duration: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Header row inside the card */}
                  <div className="flex h-[4.5rem] items-center justify-between px-4 border-b border-black/[0.03] dark:border-white/[0.03]">
                    <button
                      aria-label={t('aria_header_drawer_close')}
                      className={clsxm(
                        'size-10 rounded-full bg-neutral-1',
                        'ring-1 ring-neutral-9/5 transition',
                        'flex items-center justify-center',
                      )}
                      onClick={close}
                    >
                      <HamburgerIcon isOpen />
                    </button>

                    <AnimatedLogo />

                    <UserAuth />
                  </div>

                  {/* Navigation panel */}
                  <HeaderDrawerContent />
                </m.div>
              </MobileMenuContext>
            )}
          </AnimatePresence>
        </RootPortal>
      )}
    </>
  )
}

/** CSS-based hamburger icon with animated ☰ ↔ × transition */
const HamburgerIcon = ({ isOpen }: { isOpen: boolean }) => {
  const base =
    'block h-[1.5px] w-3.5 rounded-full bg-neutral-7 transition-all duration-200'
  const ease = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]'

  return (
    <span className="flex flex-col items-center justify-center gap-1">
      <span
        className={clsxm(
          base,
          ease,
          isOpen && 'translate-y-[2.75px] rotate-45',
        )}
      />
      <span
        className={clsxm(base, ease, isOpen && 'opacity-0')}
      />
      <span
        className={clsxm(
          base,
          ease,
          isOpen && '-translate-y-[2.75px] -rotate-45',
        )}
      />
    </span>
  )
}
```

**Key decisions:**
- `RootPortal` renders overlay + card above everything (z-19/20, below header's z-[9] is fine since the card is fixed on top)
- `MobileMenuContext` provides `close` to child links
- Hamburger icon uses 3 `<span>` elements with CSS transforms (top/bottom rotate ±45deg, middle fades out)
- `translate-y-[2.75px]` = gap(4px)/2 + lineHeight(1.5px)/2 = 2.75px to converge at center
- Body scroll lock via direct `overflow` manipulation (simple, no library needed)
- `usePathname()` change triggers auto-close

- [ ] **Step 2: Add missing i18n key**

The `aria_header_drawer_close` key is needed. Check if it exists:

Run: `cd /Users/innei/git/innei-repo/Shiroi && grep -r "aria_header_drawer_close" apps/web/src/i18n`

If missing, add it to the translation files. The key should translate to "Close menu" / "关闭菜单". If the project uses a convention where missing keys fall back, you can skip this step — the existing `aria_header_drawer` key is already defined and the close variant may use a similar pattern.

Alternatively, simplify by using a static string for the close label:
```tsx
const buttonLabel = isOpen ? 'Close menu' : t('aria_header_drawer')
```

- [ ] **Step 3: Lint check**

Run: `cd /Users/innei/git/innei-repo/Shiroi/apps/web && npx eslint --fix src/components/layout/header/internal/HeaderDrawerButton.tsx`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderDrawerButton.tsx
git commit -m "$(cat <<'EOF'
refactor(mobile-header): replace bottom drawer with top-down fused floating card

Replace PresentSheet (Vaul) with custom overlay + merged card panel.
Add CSS hamburger icon with animated ☰ ↔ × transition.
Add a11y (aria-expanded, Escape key, scroll lock, focus management).
EOF
)"
```

---

### Task 2: Rewrite HeaderDrawerContent

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/HeaderDrawerContent.tsx`

This task rewrites the drawer content from a vertical list layout to tag-based horizontal navigation with split buttons for sub-menus.

- [ ] **Step 1: Rewrite HeaderDrawerContent.tsx**

Replace the entire file content:

```tsx
'use client'

import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { Link, usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import type { IHeaderMenu } from '../config'
import { useHeaderConfig } from './HeaderDataConfigureProvider'
import { useMobileMenu } from './HeaderDrawerButton'

export const HeaderDrawerContent = () => {
  const { config, ensureMenuData } = useHeaderConfig()
  const t = useTranslations('common')
  const pathname = usePathname()
  const { close } = useMobileMenu()

  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    ensureMenuData('Home')
    ensureMenuData('Post')
  }, [ensureMenuData])

  const getTitle = useCallback(
    (item: IHeaderMenu) => {
      if (item.titleKey) {
        return t(item.titleKey as any)
      }
      return item.title
    },
    [t],
  )

  const toggleSection = useCallback((path: string) => {
    setExpandedSection((prev) => (prev === path ? null : path))
  }, [])

  const activeClass =
    'text-neutral-9 bg-white/55 dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
  const inactiveClass = 'text-neutral-7'

  return (
    <div className="p-3">
      {/* Navigation tags */}
      <div className="flex flex-wrap gap-1.5">
        {config.map((section) => {
          const hasSubMenu =
            section.subMenu && section.subMenu.length > 0
          const isNonNavigable = section.path === '#'
          const isExternal = section.path.startsWith('http')

          const subItemActive =
            section.subMenu?.findIndex(
              (item) =>
                item.path === pathname ||
                pathname.slice(1) === item.path ||
                pathname.startsWith(`${item.path}/`),
            ) ?? -1

          const isActive =
            pathname === section.path ||
            (pathname.startsWith(`${section.path}/`) &&
              !section.exclude?.includes(pathname)) ||
            subItemActive > -1

          let href = section.path
          if (section.search) {
            href += `?${new URLSearchParams(section.search).toString()}`
          }

          if (hasSubMenu) {
            // Split tag: text navigates, ▾ expands sub-menu
            return (
              <div
                key={section.path}
                className={clsxm(
                  'flex items-center rounded-[2px] overflow-hidden',
                  'border dark:border-white/[0.06]',
                  isActive
                    ? 'border-black/[0.06] ' + activeClass
                    : 'border-black/[0.04] ' + inactiveClass,
                )}
              >
                {isNonNavigable ? (
                  <button
                    className="px-2.5 py-1.5 text-sm"
                    onClick={() => toggleSection(section.path)}
                  >
                    {getTitle(section)}
                  </button>
                ) : (
                  <Link
                    className="px-2.5 py-1.5 text-sm"
                    href={href}
                    onClick={(e) => {
                      section.do?.()
                      close()
                    }}
                  >
                    {getTitle(section)}
                  </Link>
                )}
                <button
                  aria-label={`Expand ${getTitle(section)}`}
                  className={clsxm(
                    'px-2 py-1.5 text-xs transition',
                    'border-l dark:border-white/[0.06]',
                    expandedSection === section.path
                      ? 'border-black/[0.08] bg-black/[0.02] dark:bg-white/[0.04] text-neutral-7'
                      : 'border-black/[0.06] bg-black/[0.015] dark:bg-white/[0.03] text-neutral-5',
                  )}
                  onClick={() => toggleSection(section.path)}
                >
                  {expandedSection === section.path ? '▴' : '▾'}
                </button>
              </div>
            )
          }

          // Simple tag: direct navigation
          const linkClass = clsxm(
            'px-2.5 py-1.5 text-sm rounded-[2px] transition',
            'border dark:border-white/[0.06]',
            isActive
              ? 'border-black/[0.06] ' + activeClass
              : 'border-black/[0.04] ' + inactiveClass,
          )

          if (isExternal) {
            return (
              <a
                key={section.path}
                className={linkClass}
                href={href}
                rel="noopener"
                target="_blank"
                onClick={close}
              >
                {getTitle(section)}
              </a>
            )
          }

          return (
            <Link
              key={section.path}
              className={linkClass}
              href={href}
              onClick={() => {
                section.do?.()
                close()
              }}
            >
              {getTitle(section)}
            </Link>
          )
        })}
      </div>

      {/* Expanded sub-menu */}
      <AnimatePresence mode="wait">
        {expandedSection && (
          <ExpandedSubMenu
            key={expandedSection}
            close={close}
            getTitle={getTitle}
            pathname={pathname}
            section={config.find((s) => s.path === expandedSection)!}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const ExpandedSubMenu = ({
  section,
  getTitle,
  close,
  pathname,
}: {
  section: IHeaderMenu
  getTitle: (item: IHeaderMenu) => string
  close: () => void
  pathname: string
}) => {
  if (!section.subMenu || section.subMenu.length === 0) return null

  return (
    <m.div
      animate={{ height: 'auto', opacity: 1 }}
      className="overflow-hidden"
      exit={{ height: 0, opacity: 0 }}
      initial={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="border-t border-black/[0.03] dark:border-white/[0.03] pt-2 mt-2">
        <div className="text-[9px] uppercase tracking-[2px] text-neutral-4 mb-1.5">
          {getTitle(section)}
        </div>
        <div className="flex flex-wrap gap-1">
          {section.subMenu.map((sub) => {
            const isExternal = sub.path.startsWith('http')
            const isSubActive =
              sub.path === pathname ||
              pathname.slice(1) === sub.path ||
              pathname.startsWith(`${sub.path}/`)

            const subClass = clsxm(
              'text-xs px-2 py-1 rounded-[2px] transition',
              isSubActive
                ? 'text-neutral-9 bg-white/55 dark:bg-white/[0.06]'
                : 'text-neutral-6 bg-black/[0.02] dark:bg-white/[0.04]',
            )

            if (isExternal) {
              return (
                <a
                  key={sub.path}
                  className={subClass}
                  href={sub.path}
                  rel="noopener"
                  target="_blank"
                  onClick={close}
                >
                  {getTitle(sub)}
                </a>
              )
            }

            return (
              <Link
                key={sub.path}
                className={subClass}
                href={sub.path}
                onClick={() => {
                  sub.do?.()
                  close()
                }}
              >
                {getTitle(sub)}
              </Link>
            )
          })}
        </div>
      </div>
    </m.div>
  )
}
```

**Key decisions:**
- Reuses `MobileMenuContext` from `HeaderDrawerButton` for `close`
- Active item detection logic mirrors the desktop `ForDesktop` component
- Split tags: `<Link>` for text area (navigates + closes), `<button>` for ▾ (toggles sub-menu)
- `path === '#'` (More): text area is `<button>` that toggles sub-menu (no navigation)
- External links: `<a target="_blank" rel="noopener">`
- `section.do?.()` called on click (e.g., Posts sets `window.__POST_LIST_ANIMATED__`)
- `section.search` appended to href
- `ensureMenuData('Home')` and `ensureMenuData('Post')` called on mount (same as current)
- Sub-menu reveal uses Motion height animation (150ms)
- `AnimatePresence mode="wait"` prevents overlapping sub-menu transitions

- [ ] **Step 2: Lint check**

Run: `cd /Users/innei/git/innei-repo/Shiroi/apps/web && npx eslint --fix src/components/layout/header/internal/HeaderDrawerContent.tsx`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/header/internal/HeaderDrawerContent.tsx
git commit -m "$(cat <<'EOF'
style(mobile-header): rewrite drawer content as tag-based navigation

Replace vertical list layout with horizontal tag chips (flex-wrap).
Add split buttons for items with sub-menus (text navigates, ▾ expands).
Add inline sub-menu expansion with height reveal animation.
Handle special paths (# for More, external links for Warp).
EOF
)"
```

---

### Task 3: Visual verification and polish

**Files:**
- Check: All modified files

- [ ] **Step 1: Run dev server**

Run: `pnpm --filter @shiro/web dev`

- [ ] **Step 2: Verify in browser (mobile viewport)**

Open Chrome DevTools → Toggle Device Toolbar → Select a mobile device (e.g., iPhone 14, 390×844).

Verify:
1. Hamburger icon (3 lines) visible in top-left
2. Click hamburger → merged floating card appears with slideDown animation
3. Hamburger icon animates to × (top/bottom lines rotate, middle fades)
4. Card contains: close button | logo | avatar in header row
5. Navigation tags below: Home, Posts ▾, Notes, Timeline ▾, Thinking, More ▾
6. Active item has white float layer (bg-white/55)
7. Click "Posts" text → navigates to /posts, menu closes
8. Click ▾ on "Posts" → sub-menu expands below with categories
9. Click ▾ on "More" → shows Friends, Projects, Quotes, Warp
10. Click "More" text → also expands sub-menu (path is #, no navigation)
11. Warp sub-item opens in new tab
12. Click overlay → menu closes
13. Press Escape → menu closes
14. Page content doesn't scroll when menu is open
15. Dark mode: all elements render correctly (toggle in DevTools)
16. Desktop (>1024px): hamburger button is hidden, desktop nav unaffected

- [ ] **Step 3: Fix any issues found**

If visual/functional issues are found during verification, fix them in the relevant files.

- [ ] **Step 4: Final lint check**

Run: `cd /Users/innei/git/innei-repo/Shiroi/apps/web && npx eslint --fix src/components/layout/header/internal/HeaderDrawerButton.tsx src/components/layout/header/internal/HeaderDrawerContent.tsx`

- [ ] **Step 5: Commit if needed**

```bash
git add apps/web/src/components/layout/header/internal/
git commit -m "style(mobile-header): polish fused floating card layout"
```
