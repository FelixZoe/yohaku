'use client'

import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'

import { narratingElapsedLabelAtom, ttsNarrationAtom } from '~/atoms/tts'

export function CapsuleNarratingTicketRow() {
  const t = useTranslations('tts')
  const { current, total } = useAtomValue(ttsNarrationAtom)
  const elapsed = useAtomValue(narratingElapsedLabelAtom)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <i className="i-mingcute-volume-line shrink-0 text-copy-15 text-accent" />
      <span className="truncate text-copy-15 text-neutral-8">
        {t('narrating')}
        <span className="mx-1.5 text-neutral-5">·</span>
        <span className="tabular-nums">
          {current}/{total}
        </span>
        {elapsed && (
          <>
            <span className="mx-1.5 text-neutral-5">·</span>
            <span className="tabular-nums">{elapsed}</span>
          </>
        )}
      </span>
    </span>
  )
}
