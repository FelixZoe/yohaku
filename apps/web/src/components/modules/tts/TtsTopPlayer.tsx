'use client'

import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'

import { ttsControlsAtom, ttsNarrationAtom } from '~/atoms/tts'
import { clsxm } from '~/lib/helper'

export function TtsTopPlayer() {
  const s = useAtomValue(ttsNarrationAtom)
  const controls = useAtomValue(ttsControlsAtom)
  const t = useTranslations('tts')

  if (!s.available || !controls) return null

  const active =
    s.status === 'playing' || s.status === 'paused' || s.status === 'loading'
  const segmentPct =
    s.total > 0 ? Math.min(100, (s.current / s.total) * 100) : 0

  return (
    <div className="mb-4 flex items-center gap-2.5 border-b border-border py-2 pb-3">
      <button
        aria-label={t(s.status === 'playing' ? 'pause' : 'play')}
        type="button"
        className={clsxm(
          'flex size-7 shrink-0 items-center justify-center rounded-full transition-colors',
          s.status === 'playing' || s.status === 'loading'
            ? 'bg-accent text-white hover:bg-accent/90'
            : 'border border-border text-accent hover:bg-neutral-2',
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

      {active && s.status !== 'loading' ? (
        <>
          <div className="relative h-[3px] min-w-10 flex-1 overflow-hidden rounded-full bg-neutral-3">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${segmentPct}%` }}
            />
          </div>
          <span className="text-label-12 tabular-nums text-neutral-7">
            {s.current}/{s.total}
          </span>
          <button
            className="rounded border border-border px-1.5 py-0.5 text-label-12 tabular-nums text-neutral-7 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
            type="button"
            onClick={controls.cycleRate}
          >
            {s.playbackRate}x
          </button>
          <button
            aria-label={t('stop')}
            className="flex size-7 shrink-0 items-center justify-center rounded text-neutral-7 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
            type="button"
            onClick={controls.stop}
          >
            <i className="i-mingcute-close-line text-icon-sm" />
          </button>
        </>
      ) : (
        <>
          <span className="text-copy-13 text-neutral-9">
            <span className="font-medium">{t('narration')}</span>
            {s.status === 'loading' ? (
              <span className="text-neutral-7"> · {t('narrating')}</span>
            ) : null}
          </span>
          {s.stale && s.status === 'idle' ? (
            <span className="ml-auto text-label-12 text-warning">
              {t('stale_warning')}
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}
