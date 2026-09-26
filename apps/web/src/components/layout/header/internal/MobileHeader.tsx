'use client'

import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { isNarratingAtom } from '~/atoms/tts'
import { LocaleSuggestionCapsulePanel } from '~/components/modules/locale-suggestion/LocaleSuggestionCapsulePanel'
import type { LocaleSuggestion } from '~/components/modules/locale-suggestion/use-locale-suggestion'
import { useLocaleSuggestion } from '~/components/modules/locale-suggestion/use-locale-suggestion'
import { useIsClient } from '~/hooks/common/use-is-client'
import { usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { CapsuleNarratingTicketRow } from './CapsuleNarratingTicketRow'
import { CapsuleTtsPanel } from './CapsuleTtsPanel'
import { MenuIcon, MobileMenuContext } from './HeaderDrawerButton'
import {
  type CapsuleOverlay,
  COLLAPSE_IDLE_RESTORE_MS,
  overlayOnPrimaryTap,
  resolveCapsuleState,
  resolveScrollAction,
  toggleMenuOverlay,
} from './mobile-capsule'
import {
  CapsuleExpandedCard,
  CapsuleLiveDot,
  CapsuleTicketRow,
  useMobileLiveDesk,
} from './MobileCapsuleLiveDesk'
import { MobileDrawerContent } from './MobileDrawerContent'
import {
  CAPSULE_DURATION_MS,
  CAPSULE_EASE,
  usePrefersReducedMotion,
} from './use-flip'

const KEYBOARD_VIEWPORT_SHRINK_PX = 150
const LANG_SNOOZE_SCROLL_PX = 8

const useCapsuleCollapsed = (suppress: boolean) => {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (suppress) {
      setCollapsed(false)
      return
    }
    let lastY = window.scrollY
    let timer = 0
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      const action = resolveScrollAction(y, delta)
      if (action === 'collapse') setCollapsed(true)
      else if (action === 'restore') setCollapsed(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () => setCollapsed(false),
        COLLAPSE_IDLE_RESTORE_MS,
      )
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [suppress])

  return [collapsed, setCollapsed] as const
}

const useKeyboardHidden = () => {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      setHidden(window.innerHeight - vv.height > KEYBOARD_VIEWPORT_SHRINK_PX)
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return hidden
}

type PanelKind = 'expanded' | 'lang' | 'menu' | 'tts'

export const MobileHeader = () => {
  const isClient = useIsClient()
  const isMobile = useIsMobile()

  if (!isClient || !isMobile) return null

  return <CapsuleHeader />
}

export const CapsuleHeader = ({ className }: { className?: string }) => {
  const t = useTranslations('common')
  const pathname = usePathname()
  const reduceMotion = usePrefersReducedMotion()

  const [overlay, setOverlay] = useState<CapsuleOverlay>('none')
  const closeOverlay = useCallback(() => setOverlay('none'), [])
  const mobileMenuContextValue = useMemo(
    () => ({ close: closeOverlay }),
    [closeOverlay],
  )

  const { appIcons, presentation } = useMobileLiveDesk()
  const hasLive = presentation.visible
  const [collapsed, setCollapsed] = useCapsuleCollapsed(overlay !== 'none')
  const keyboardHidden = useKeyboardHidden()
  const ownerName = useAggregationSelector((data) => data.user.name) || ''
  const siteTitle = useAggregationSelector((data) => data.seo.title) || ''

  const isNarrating = useAtomValue(isNarratingAtom)
  const state = resolveCapsuleState({
    collapsed,
    hasLive,
    isNarrating,
    overlay,
  })
  const activePanel: PanelKind | null =
    overlay === 'tts'
      ? 'tts'
      : state === 'menu'
        ? 'menu'
        : state === 'expanded'
          ? 'expanded'
          : state === 'lang'
            ? 'lang'
            : null

  const suggestion = useLocaleSuggestion()
  const lastSuggestionRef = useRef<LocaleSuggestion | null>(null)
  useEffect(() => {
    if (suggestion) lastSuggestionRef.current = suggestion
  }, [suggestion])

  const langAutoOpenedRef = useRef(false)
  useEffect(() => {
    if (!suggestion) {
      langAutoOpenedRef.current = false
      setOverlay((prev) => (prev === 'lang' ? 'none' : prev))
      return
    }
    if (langAutoOpenedRef.current || state !== 'idle') return
    langAutoOpenedRef.current = true
    setOverlay('lang')
  }, [suggestion, state])

  useEffect(() => {
    if (overlay !== 'lang' || !suggestion) return
    // Mobile browsers emit displacement-free scroll events during load
    // (viewport settling, scroll restoration); only real scrolling should snooze.
    const initialY = window.scrollY
    const onScroll = () => {
      if (Math.abs(window.scrollY - initialY) <= LANG_SNOOZE_SCROLL_PX) return
      suggestion.snooze()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overlay, suggestion])

  const [panelContent, setPanelContent] = useState<PanelKind | null>(null)
  useEffect(() => {
    if (activePanel) {
      setPanelContent(activePanel)
      return
    }
    const timer = window.setTimeout(
      () => setPanelContent(null),
      CAPSULE_DURATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [activePanel])

  const panelContentRef = useRef<HTMLDivElement>(null)
  const [panelHeight, setPanelHeight] = useState(0)
  useLayoutEffect(() => {
    const el = panelContentRef.current
    if (!el) {
      setPanelHeight(0)
      return
    }
    const measure = () => setPanelHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [panelContent])

  useEffect(() => {
    setOverlay('none')
  }, [pathname])

  useEffect(() => {
    if (state !== 'menu') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [state])

  useEffect(() => {
    if (overlay === 'none') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [overlay, closeOverlay])

  const overlayOpen = activePanel !== null
  const panelVisible = overlayOpen || panelContent !== null
  const isDot = state === 'dot'
  const ticketVisible = state === 'ticket'
  const ease = reduceMotion
    ? undefined
    : `${CAPSULE_DURATION_MS}ms ${CAPSULE_EASE}`

  return (
    <>
      <div
        className={clsxm(
          'fixed inset-0 z-[8] bg-black/[0.06] transition-opacity duration-200 dark:bg-black/[0.3]',
          overlayOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeOverlay}
      />

      <div
        data-hide-print
        role="banner"
        style={{ bottom: 'calc(0.875rem + env(safe-area-inset-bottom))' }}
        className={clsxm(
          'pointer-events-none fixed inset-x-3.5 z-[9] transition-opacity duration-200',
          keyboardHidden && 'opacity-0',
          className,
        )}
      >
        <div
          className={clsxm(
            'pointer-events-auto absolute bottom-0 overflow-hidden',
            'bg-[#fefefb] dark:bg-neutral-2',
            'border border-black/5 dark:border-white/[0.04]',
            'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_14px_rgba(0,0,0,0.06)]',
            'dark:shadow-[0_1px_2px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)]',
            keyboardHidden && 'pointer-events-none',
          )}
          style={{
            borderRadius: panelVisible ? 20 : 22,
            height: isDot ? '2.75rem' : undefined,
            left: isDot ? 0 : '50%',
            transform: isDot ? 'translateX(0)' : 'translateX(-50%)',
            width: isDot
              ? '2.75rem'
              : state === 'idle'
                ? '78%'
                : state === 'ticket' || state === 'narrating'
                  ? panelVisible
                    ? '100%'
                    : '92%'
                  : '100%',
            transition: ease
              ? `width ${ease}, left ${ease}, transform ${ease}, border-radius ${ease}`
              : undefined,
          }}
        >
          <div
            className="overflow-hidden"
            style={{
              height: overlayOpen ? panelHeight : 0,
              transition: ease ? `height ${ease}` : undefined,
            }}
          >
            <div ref={panelContentRef}>
              <div
                aria-modal={panelContent === 'menu' || undefined}
                role={panelContent === 'menu' ? 'dialog' : undefined}
                className={clsxm(
                  'transition-opacity',
                  overlayOpen
                    ? 'opacity-100 delay-150 duration-200'
                    : 'opacity-0 delay-200 duration-300',
                )}
              >
                {panelContent === 'menu' ? (
                  <MobileMenuContext value={mobileMenuContextValue}>
                    <MobileDrawerContent />
                  </MobileMenuContext>
                ) : panelContent === 'tts' ? (
                  <CapsuleTtsPanel />
                ) : panelContent === 'expanded' && presentation.visible ? (
                  <CapsuleExpandedCard
                    appIcons={appIcons}
                    ownerName={ownerName}
                    presentation={presentation}
                    showIcon={state === 'expanded'}
                  />
                ) : panelContent === 'lang' &&
                  (suggestion ?? lastSuggestionRef.current) ? (
                  <LocaleSuggestionCapsulePanel
                    suggestion={(suggestion ?? lastSuggestionRef.current)!}
                  />
                ) : null}
                <div className="mx-4 h-px bg-neutral-9/[0.05] dark:bg-white/[0.05]" />
              </div>
            </div>
          </div>

          <div
            className={clsxm(
              'flex h-11 items-center transition-opacity duration-200',
              isDot && 'pointer-events-none opacity-0',
            )}
          >
            <button
              className="relative flex h-full min-w-0 flex-1 items-center text-left"
              type="button"
              aria-label={
                isNarrating
                  ? 'Narration'
                  : ticketVisible
                    ? 'Live Desk'
                    : t('aria_header_drawer')
              }
              onClick={() =>
                setOverlay((prev) =>
                  overlayOnPrimaryTap(prev, hasLive, isNarrating),
                )
              }
            >
              {isNarrating && !isDot && (
                <span className="absolute inset-y-0 left-4 right-0 flex items-center">
                  <CapsuleNarratingTicketRow />
                </span>
              )}
              {hasLive && !isDot && !isNarrating && (
                <span
                  className={clsxm(
                    'absolute inset-y-0 left-4 right-0 flex items-center transition-opacity duration-200',
                    ticketVisible
                      ? 'opacity-100'
                      : 'pointer-events-none opacity-0',
                  )}
                >
                  <CapsuleTicketRow
                    appIcons={appIcons}
                    presentation={presentation}
                    showIcon={ticketVisible}
                  />
                </span>
              )}
              <span
                className={clsxm(
                  'absolute inset-y-0 left-4 right-0 flex items-center transition-opacity duration-200',
                  (ticketVisible || isNarrating) &&
                    'pointer-events-none opacity-0',
                )}
              >
                <span className="truncate font-serif text-copy-15 tracking-[0.05em] text-neutral-8">
                  {siteTitle}
                </span>
              </span>
            </button>
            <button
              aria-expanded={state === 'menu'}
              aria-label={t('aria_header_drawer')}
              className="flex h-full w-12 shrink-0 items-center justify-center text-neutral-5"
              type="button"
              onClick={() => setOverlay((prev) => toggleMenuOverlay(prev))}
            >
              <MenuIcon isOpen={overlay !== 'none'} />
            </button>
          </div>

          {isDot && (
            <button
              aria-label={t('aria_header_drawer')}
              className="absolute inset-0 flex items-center justify-center"
              type="button"
              onClick={() => setCollapsed(false)}
            >
              {isNarrating ? (
                <span className="size-2.5 animate-[tts-pulse_1.6s_ease-out_infinite] rounded-full bg-accent" />
              ) : (
                <CapsuleLiveDot active={hasLive} />
              )}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
