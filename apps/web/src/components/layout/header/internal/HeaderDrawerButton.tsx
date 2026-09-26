'use client'

import { AnimatePresence, m, type Variants } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { RootPortal } from '~/components/ui/portal'
import { useIsClient } from '~/hooks/common/use-is-client'
import { usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import { HeaderDrawerContent } from './HeaderDrawerContent'
import { useMenuOpacity } from './hooks'

export const MobileMenuContext = createContext({ close: () => {} })
export const useMobileMenu = () => use(MobileMenuContext)

export const HeaderDrawerButton = () => {
  const t = useTranslations('common')
  const isClient = useIsClient()
  const isMobile = useIsMobile()
  const menuOpacity = useMenuOpacity()
  const pathname = usePathname()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Escape key + focus management
  useEffect(() => {
    if (!isOpen) return

    // Move focus into the panel
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
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

  return (
    <>
      <button
        aria-controls="mobile-nav-panel"
        aria-expanded={isOpen}
        aria-label={t('aria_header_drawer')}
        ref={triggerRef}
        style={opacityStyle}
        className={clsxm(
          'group size-10 rounded-full bg-white dark:bg-neutral-1',
          'text-copy-13 ring-1 ring-neutral-9/5 transition',
          'flex items-center justify-center',
        )}
        onClick={toggle}
      >
        <MenuIcon isOpen={isOpen} />
      </button>

      {isClient && (
        <RootPortal>
          <AnimatePresence>
            {isOpen && (
              <MobileMenuContext value={{ close }}>
                {/* Overlay */}
                <m.div
                  animate={{ opacity: 1 }}
                  className="fixed inset-x-0 bottom-0 top-[4.5rem] z-[19] bg-black/[0.06] dark:bg-black/[0.3]"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={close}
                />

                {/* Merged floating card */}
                <m.div
                  animate={{ y: 0, opacity: 1 }}
                  aria-modal="true"
                  exit={{ y: '-100%', opacity: 0 }}
                  id="mobile-nav-panel"
                  initial={{ y: '-100%', opacity: 0 }}
                  ref={panelRef}
                  role="dialog"
                  className={clsxm(
                    'fixed inset-x-0 top-[4.5rem] z-[20] mx-2 mt-2',
                    'max-h-[calc(100dvh-5.5rem)] overflow-y-auto',
                    'rounded-sm',
                    'bg-[var(--color-root-bg)] dark:bg-neutral-900',
                    'border border-[rgba(200,180,160,0.12)] dark:border-neutral-700/20',
                    'shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]',
                    'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
                  )}
                  transition={{
                    duration: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Navigation panel uses the existing fixed header above */}
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

/** SVG-based hamburger icon with spring-animated ☰ ↔ × transition */
const menuAnimations = {
  line1: {
    initial: { rotate: 0, x: 0, y: 0 },
    animate: {
      rotate: -45,
      x: -2.35,
      y: 0.35,
      transformOrigin: 'top right',
      transition: { type: 'spring', stiffness: 200, damping: 20 },
    },
  },
  line2: {
    initial: { opacity: 1 },
    animate: {
      opacity: 0,
      transition: { ease: 'easeInOut', duration: 0.2 },
    },
  },
  line3: {
    initial: { rotate: 0, x: 0, y: 0 },
    animate: {
      rotate: 45,
      x: -2.35,
      y: -0.35,
      transformOrigin: 'bottom right',
      transition: { type: 'spring', stiffness: 200, damping: 20 },
    },
  },
} satisfies Record<string, Variants>

export const MenuIcon = ({ isOpen }: { isOpen: boolean }) => {
  const animateState = isOpen ? 'animate' : 'initial'

  return (
    <m.svg
      fill="none"
      height={16}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={16}
      xmlns="http://www.w3.org/2000/svg"
    >
      <m.line
        animate={animateState}
        initial="initial"
        variants={menuAnimations.line1}
        x1={4}
        x2={20}
        y1={6}
        y2={6}
      />
      <m.line
        animate={animateState}
        initial="initial"
        variants={menuAnimations.line2}
        x1={4}
        x2={20}
        y1={12}
        y2={12}
      />
      <m.line
        animate={animateState}
        initial="initial"
        variants={menuAnimations.line3}
        x1={4}
        x2={20}
        y1={18}
        y2={18}
      />
    </m.svg>
  )
}
