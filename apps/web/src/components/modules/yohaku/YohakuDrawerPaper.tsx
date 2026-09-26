'use client'

import { useTranslations } from 'next-intl'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

import { CloseIcon } from '~/components/icons/close'
import { Loading } from '~/components/ui/loading'
import { ScrollArea } from '~/components/ui/scroll-area'
import { useIsClient } from '~/hooks/common/use-is-client'
import { clsxm } from '~/lib/helper'

import { YohakuContent } from './YohakuContent'
import { YohakuMetaHeader } from './YohakuMetaHeader'
import {
  useYohakuActions,
  useYohakuData,
  useYohakuError,
  useYohakuLoading,
  useYohakuMeta,
  useYohakuState,
} from './YohakuProvider'

export type YohakuDrawerVariant = 'post' | 'note'

interface YohakuDrawerPaperProps {
  panelW: number
  startResize: (e: ReactPointerEvent<HTMLElement>) => void
  variant: YohakuDrawerVariant
}

/**
 * Strong torn-paper filter for the note variant. Higher displacement than
 * the main `#deckle-edge` because the drawer is a secondary surface — its
 * irregular edge is decorative and can carry more visual contrast.
 */
function YohakuPaperDeckleFilter() {
  return (
    <svg aria-hidden className="absolute" height="0" width="0">
      <defs>
        <filter id="yohaku-paper-deckle">
          <feTurbulence
            baseFrequency="0.025"
            numOctaves={4}
            result="turb"
            seed={11}
            type="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turb"
            scale={9}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

interface VariantStyle {
  asideExtraClass: string
  closeBtnClass: string
  contentClass: string
  contentVariant: 'yohaku' | 'yohaku-note'
  headerClass: string
  metaFormat: 'plain' | 'literary'
  sheetClass: string
}

const VARIANT_STYLES: Record<YohakuDrawerVariant, VariantStyle> = {
  post: {
    asideExtraClass: 'border-l border-[color:var(--yohaku-paper-outline)]',
    sheetClass: 'bg-[var(--yohaku-paper-note-bg)]',
    headerClass: 'border-b border-[color:var(--yohaku-paper-hairline)]',
    closeBtnClass:
      'text-neutral-5 hover:bg-neutral-2 dark:hover:bg-white/6 rounded-md transition-colors duration-200',
    contentClass: '',
    metaFormat: 'plain',
    contentVariant: 'yohaku',
  },
  note: {
    asideExtraClass: '',
    sheetClass:
      'bg-white dark:bg-[var(--surface-paper)] [filter:url(#yohaku-paper-deckle)]',
    /* Header: dashed wood-tone hairline, no solid rule. */
    headerClass:
      'border-b border-dashed border-[color:color-mix(in_oklch,var(--yohaku-note-ink,#6b5a40),transparent_70%)]',
    /* Close X: wood-brown ink, hover deepens. */
    closeBtnClass:
      'text-[color:color-mix(in_oklch,var(--yohaku-note-ink,#6b5a40),transparent_45%)] hover:text-[color:var(--yohaku-note-ink,#6b5a40)] hover:bg-[color:color-mix(in_oklch,var(--yohaku-note-ink,#6b5a40),transparent_92%)] rounded-md transition-colors duration-200',
    contentClass: 'font-serif',
    metaFormat: 'literary',
    contentVariant: 'yohaku-note',
  },
}

export function YohakuDrawerPaper({
  panelW,
  startResize,
  variant,
}: YohakuDrawerPaperProps) {
  const state = useYohakuState()
  const data = useYohakuData()
  const meta = useYohakuMeta()
  const loading = useYohakuLoading()
  const error = useYohakuError()
  const { close, reload } = useYohakuActions()
  const t = useTranslations('common')

  const isClient = useIsClient()

  // Two CSS vars:
  //  - --yohaku-drawer-w  : drawer's own intrinsic width. Always tracks the
  //                         current panelW so the drawer content layout stays
  //                         intact even while the slot is collapsing.
  //  - --yohaku-panel-w   : layout slot width — 0 when state is closed/closing
  //                         so the article re-flows back to full width together
  //                         with the drawer's exit animation.
  // During an active drag, `usePostPanelW` writes both vars directly.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--yohaku-drawer-w', `${panelW}px`)
    const slotOpen = state === 'reading' || state === 'anchored'
    root.style.setProperty('--yohaku-panel-w', slotOpen ? `${panelW}px` : '0px')
  }, [panelW, state])

  if (!isClient) return null
  if (state === 'idle') return null

  const host = document.getElementById('layout-drawer-portal')
  if (!host) return null

  const isClosing = state === 'closing'
  const hasRealContent = data.length >= 20
  const showSkeleton = loading && !hasRealContent

  const drawerAnimation = isClosing
    ? 'animate-[yohaku-drawer-exit_var(--yohaku-exit-ms)_cubic-bezier(0.4,0,0.2,1)_both]'
    : 'animate-[yohaku-drawer-enter_var(--yohaku-anim-ms)_cubic-bezier(0.22,1,0.36,1)_var(--yohaku-note-slide-delay-ms)_both]'

  const contentAnimation = isClosing
    ? 'opacity-0 transition-opacity duration-[120ms] ease-out'
    : 'animate-[yohaku-note-content-in_var(--yohaku-note-content-ms)_ease-out_var(--yohaku-note-content-delay-ms)_both]'

  const styles = VARIANT_STYLES[variant]

  const node = (
    <aside
      aria-hidden={isClosing || undefined}
      aria-label={t('yohaku_paper_aria')}
      data-yohaku-drawer=""
      data-yohaku-phase={state}
      data-yohaku-variant={variant}
      role="complementary"
      style={{ width: 'var(--yohaku-drawer-w)' }}
      className={clsxm(
        'yohaku-post-drawer pointer-events-auto absolute right-0 top-0 bottom-0 flex flex-col isolate',
        'overflow-hidden',
        styles.asideExtraClass,
        drawerAnimation,
        isClosing ? 'pointer-events-none z-[20]' : 'z-[21]',
      )}
    >
      {variant === 'note' && <YohakuPaperDeckleFilter />}
      <div
        aria-hidden
        className={clsxm(
          'yohaku-drawer-paper-sheet shadow-paper-contact',
          styles.sheetClass,
        )}
      />

      <div
        aria-hidden
        className="yohaku-drawer-resize"
        data-yohaku-drawer-resize=""
        onPointerDown={startResize}
      />

      <div
        className={clsxm(
          'yohaku-note-content relative z-[1] flex min-h-0 flex-1 flex-col',
          styles.contentClass,
          contentAnimation,
        )}
      >
        <header
          className={clsxm(
            'flex shrink-0 items-center justify-between gap-3 px-7 pt-5 pb-3',
            styles.headerClass,
          )}
        >
          <YohakuMetaHeader format={styles.metaFormat} meta={meta} />
          <button
            aria-label={t('yohaku_close_aria')}
            data-yohaku-close=""
            type="button"
            className={clsxm(
              'z-10 flex size-6 shrink-0 cursor-pointer items-center justify-center',
              styles.closeBtnClass,
            )}
            onClick={close}
          >
            <CloseIcon />
          </button>
        </header>

        <ScrollArea.ScrollArea
          rootClassName="min-h-0 flex-1"
          viewportClassName="px-7 pt-5 pb-6"
        >
          {showSkeleton && <Loading useDefaultLoadingText />}

          {error && !loading && (
            <div className="space-y-2 text-copy-13">
              <p className="text-neutral-7">
                {t('yohaku_error')}：{error.message}
              </p>
              <button
                className="rounded border border-accent/40 px-3 py-1 text-label-12 text-accent hover:bg-accent/10"
                data-yohaku-reload=""
                type="button"
                onClick={reload}
              >
                {t('yohaku_reload')}
              </button>
            </div>
          )}

          {!error && hasRealContent && (
            <YohakuContent markdown={data} variant={styles.contentVariant} />
          )}
        </ScrollArea.ScrollArea>
      </div>
    </aside>
  )

  return createPortal(node, host)
}
