'use client'

import { clsx } from 'clsx'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'

import { ImpressionView } from '~/components/common/ImpressionTracker'
import { useModalStack } from '~/components/ui/modal'
import { TrackerAction } from '~/constants/tracker'
import { Link } from '~/i18n/navigation'

import type { PeekOrigin } from './peek-motion'
import { PEEK_EXIT_MS, peekExitProps, playPeekEnter } from './peek-motion'
import { withoutPeekParam, withPeekParam } from './peek-url'

export type PeekSize = 'default' | 'max'

const sizeClass: Record<PeekSize, string> = {
  default: 'my-[10vh] h-[80vh] w-full max-w-[65rem]',
  max: 'my-[5vh] h-[90vh] w-[90vw]',
}

const DECKLE_AMP = 2.5
const DECKLE_FREQ = 0.05

function edgeNoise(length: number) {
  const step = 1 / DECKLE_FREQ
  const knots = Array.from({ length: Math.ceil(length / step) + 2 }, () =>
    Math.random(),
  )
  return (position: number) => {
    const index = Math.floor(position / step)
    const smooth = (1 - Math.cos(((position % step) / step) * Math.PI)) / 2
    const coarse = knots[index] * (1 - smooth) + knots[index + 1] * smooth
    const fiber = (Math.random() - 0.5) * 0.35
    return Math.max(0, Math.min(1, coarse + fiber)) * DECKLE_AMP
  }
}

function deckleMaskUrl(width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  const context = canvas.getContext('2d')
  if (!context) return null
  context.scale(dpr, dpr)
  const top = edgeNoise(width)
  const right = edgeNoise(height)
  const bottom = edgeNoise(width)
  const left = edgeNoise(height)
  context.fillStyle = '#fff'
  context.beginPath()
  context.moveTo(left(0), top(0))
  for (let x = 0; x <= width; x += 2) context.lineTo(x, top(x))
  for (let y = 0; y <= height; y += 2) context.lineTo(width - right(y), y)
  for (let x = width; x >= 0; x -= 2) context.lineTo(x, height - bottom(x))
  for (let y = height; y >= 0; y -= 2) context.lineTo(left(y), y)
  context.closePath()
  context.fill()
  return canvas.toDataURL()
}

export const PeekModal = (
  props: PropsWithChildren<{
    controls?: boolean
    origin?: PeekOrigin
    size?: PeekSize
    to?: string
  }>,
) => {
  const t = useTranslations('common')
  const { dismissAll, dismissTop } = useModalStack()
  const { children, controls = true, origin, size = 'default', to } = props

  const frameRef = useRef<HTMLDivElement>(null)
  const shadeRef = useRef<HTMLDivElement>(null)
  const navigatingRef = useRef(false)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const { height, width } = frame.getBoundingClientRect()
    const mask = deckleMaskUrl(width, height)
    if (mask) {
      const url = `url(${mask})`
      frame.style.setProperty('-webkit-mask-image', url)
      frame.style.setProperty('mask-image', url)
      frame.style.setProperty('-webkit-mask-size', '100% 100%')
      frame.style.setProperty('mask-size', '100% 100%')
    }
  }, [])

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    return playPeekEnter(frame, shadeRef.current, origin ?? null)
  }, [origin])

  // Resolved at unmount, not render: the frame's box is only knowable after
  // layout, and nothing re-renders this component between mount and dismiss.
  const exitVariants = {
    out: () =>
      peekExitProps(
        frameRef.current?.getBoundingClientRect() ?? null,
        origin ?? null,
      ),
  }

  useEffect(() => {
    if (!to) return
    // Next patches history.replaceState into the router, so the underlying page
    // re-reads useSearchParams here. Merge into the existing query instead of
    // replacing it — dropping params like `?type=note` swaps the page's query
    // key and remounts the list, losing its scroll position.
    history.replaceState({}, '', withPeekParam(location.href, to))

    return () => {
      // The unmount runs after the exit animation, by which time the expand
      // link's navigation may still be in flight; rewriting history here
      // rewinds the router and cancels it.
      if (navigatingRef.current) return
      history.replaceState({}, '', withoutPeekParam(location.href))
    }
  }, [to])

  return (
    <>
      <m.div
        aria-hidden
        className="pointer-events-none fixed z-[-1] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_48px_rgba(0,0,0,0.10)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_48px_rgba(0,0,0,0.55)]"
        exit={{ opacity: 0 }}
        initial={false}
        ref={shadeRef}
        transition={{ duration: (PEEK_EXIT_MS * 0.5) / 1000 }}
      />

      <m.div
        exit="out"
        initial={false}
        ref={frameRef}
        style={{ transformOrigin: '0 0' }}
        variants={exitVariants}
        className={clsx(
          'bg-paper relative mx-auto flex min-h-0 flex-col overflow-hidden',
          sizeClass[size],
        )}
        transition={{
          duration: PEEK_EXIT_MS / 1000,
          ease: [0.4, 0, 1, 1],
          opacity: {
            duration: PEEK_EXIT_MS / 1000,
            ease: 'linear',
            times: [0, 0.4, 1],
          },
        }}
      >
        <ImpressionView
          action={TrackerAction.Impression}
          trackerMessage="Peek Modal"
        />

        <div
          data-peek-content
          className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {children}
        </div>

        {controls && (
          <div className="bg-paper absolute right-3 top-3 z-10 flex items-center overflow-hidden rounded-full shadow-xs ring-1 ring-neutral-3">
            {to && (
              <>
                <Link
                  className="center flex h-8 w-9 hover:bg-neutral-2"
                  href={to}
                  onClick={() => {
                    navigatingRef.current = true
                    dismissAll()
                  }}
                >
                  <i className="i-mingcute-fullscreen-2-line text-copy-16" />
                  <span className="sr-only">{t('aria_open_link')}</span>
                </Link>
                <div aria-hidden className="h-4 w-px bg-neutral-3" />
              </>
            )}

            <button
              className="center flex h-8 w-9 hover:bg-neutral-2"
              onClick={dismissTop}
            >
              <i className="i-mingcute-close-line text-copy-16" />
              <span className="sr-only">{t('actions_close')}</span>
            </button>
          </div>
        )}
      </m.div>
    </>
  )
}
