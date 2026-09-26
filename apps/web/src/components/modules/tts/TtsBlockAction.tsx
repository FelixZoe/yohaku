'use client'

import { useTranslations } from 'next-intl'

import { clsxm } from '~/lib/helper'

import { useTtsPlaybackContext } from './tts-playback-context'

export function TtsBlockAction({
  blockId,
  isHovered,
}: {
  blockId: string
  isHovered: boolean
}) {
  const t = useTranslations('tts')
  const ctx = useTtsPlaybackContext()
  if (!ctx) return null

  const { segments, playback, isCurrentBlock, playBlock } = ctx
  const hasSegment = segments.some((s) => s.blockId === blockId)
  if (!hasSegment) return null

  const isCurrent = isCurrentBlock(blockId)

  return (
    <button
      aria-label={t('narration')}
      type="button"
      className={clsxm(
        'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-neutral-2 hover:text-foreground',
        isHovered || isCurrent ? 'opacity-100' : 'opacity-0',
        isCurrent && 'text-accent',
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (isCurrent) {
          playback.toggleSegment(playback.playingIndex!)
        } else {
          playBlock(blockId)
        }
      }}
    >
      <i
        className={clsxm(
          'text-copy-15',
          isCurrent && playback.isPlaying
            ? 'i-mingcute-pause-fill'
            : 'i-mingcute-volume-line',
        )}
      />
    </button>
  )
}
