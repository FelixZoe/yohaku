'use client'

import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'

import { ttsControlsAtom, ttsNarrationAtom } from '~/atoms/tts'
import { formatDuration } from '~/lib/tts-format'

export function CapsuleTtsPanel() {
  const t = useTranslations('tts')
  const s = useAtomValue(ttsNarrationAtom)
  const controls = useAtomValue(ttsControlsAtom)
  const pct = s.duration > 0 ? Math.min(100, (s.elapsed / s.duration) * 100) : 0
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        aria-label={s.status === 'playing' ? t('pause') : t('play')}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"
        type="button"
        onClick={() => controls?.toggle()}
      >
        <i
          className={
            s.status === 'playing'
              ? 'i-mingcute-pause-fill text-copy-15'
              : 'i-mingcute-volume-line text-copy-15'
          }
        />
      </button>
      <span className="text-xs tabular-nums text-neutral-7">
        {formatDuration(s.elapsed)}
      </span>
      <span className="text-xs tabular-nums text-neutral-5">
        {t('segment_progress', { current: s.current, total: s.total })}
      </span>
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-neutral-3">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        className="rounded border border-border px-1.5 py-0.5 text-xs tabular-nums text-neutral-7"
        type="button"
        onClick={() => controls?.cycleRate()}
      >
        {s.playbackRate}x
      </button>
      <button
        aria-label={t('stop')}
        className="flex size-6 items-center justify-center text-neutral-7"
        type="button"
        onClick={() => controls?.stop()}
      >
        <i className="i-mingcute-close-line text-copy-15" />
      </button>
    </div>
  )
}
