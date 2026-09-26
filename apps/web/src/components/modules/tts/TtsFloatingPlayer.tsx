'use client'

import { useAtomValue } from 'jotai'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'

import { useIsMobile } from '~/atoms/hooks/viewport'
import {
  requestTtsReveal,
  setTtsNarration,
  ttsControlsAtom,
  ttsNarrationAtom,
} from '~/atoms/tts'
import { RootPortal } from '~/components/ui/portal'
import { softSpringPreset } from '~/constants/spring'
import { clsxm } from '~/lib/helper'

export function TtsFloatingPlayer() {
  const isMobile = useIsMobile()
  const s = useAtomValue(ttsNarrationAtom)
  const controls = useAtomValue(ttsControlsAtom)
  const t = useTranslations('tts')

  if (isMobile || !s.available) return null

  const show =
    s.status === 'playing' || s.status === 'paused' || s.status === 'loading'
  const segmentPct =
    s.total > 0 ? Math.min(100, (s.current / s.total) * 100) : 0

  return (
    <RootPortal>
      <AnimatePresence>
        {show && controls && (
          <m.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            initial={{ opacity: 0, y: 6 }}
            key="tts-margin-rail"
            transition={softSpringPreset}
            className={clsxm(
              'fixed bottom-[2rem] right-[max(0.5rem,env(safe-area-inset-right))] z-[10]',
              'flex flex-col items-center gap-2.5 px-1.5 py-1',
            )}
          >
            <button
              aria-label={t(s.status === 'playing' ? 'pause' : 'play')}
              type="button"
              className={clsxm(
                'flex size-7 items-center justify-center rounded-md transition-colors',
                'text-neutral-7 hover:bg-neutral-2 hover:text-neutral-9',
                s.status === 'playing' && 'text-accent hover:text-accent',
              )}
              onClick={controls.toggle}
            >
              {s.status === 'loading' ? (
                <i className="i-mingcute-loading-3-line animate-spin text-icon-sm" />
              ) : s.status === 'playing' ? (
                <i className="i-mingcute-pause-fill text-icon-sm" />
              ) : (
                <i className="i-mingcute-volume-line text-icon-sm" />
              )}
            </button>

            <div aria-hidden className="relative h-12 w-px bg-neutral-3">
              <span
                className="absolute inset-x-0 bottom-0 bg-accent/80 transition-[height] duration-300 ease-out"
                style={{ height: `${segmentPct}%` }}
              />
            </div>

            {s.status !== 'loading' && s.current > 0 ? (
              <span className="text-caption-10 tabular-nums tracking-wide text-neutral-6">
                {s.current}
              </span>
            ) : null}

            {s.current > 0 && (
              <button
                aria-label={t('reveal')}
                className="flex size-7 items-center justify-center rounded-md text-neutral-6 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
                type="button"
                onClick={() => {
                  if (!s.autoFollow) setTtsNarration({ autoFollow: true })
                  requestTtsReveal()
                }}
              >
                <i className="i-mingcute-aiming-line text-icon-sm" />
              </button>
            )}

            <button
              aria-label={t('stop')}
              className="flex size-7 items-center justify-center rounded-md text-neutral-6 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
              type="button"
              onClick={controls.stop}
            >
              <i className="i-mingcute-close-line text-icon-sm" />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </RootPortal>
  )
}
