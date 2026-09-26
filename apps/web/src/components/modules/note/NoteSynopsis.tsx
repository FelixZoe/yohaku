'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import {
  useYohakuActionsOptional,
  useYohakuLoading,
  useYohakuState,
} from '~/components/modules/yohaku/YohakuProvider'
import { Markdown } from '~/components/ui/markdown'
import { clsxm } from '~/lib/helper'

export const NoteSynopsis: FC<{
  summary: string
  showYohakuChip: boolean
}> = ({ summary, showYohakuChip }) => {
  const actions = useYohakuActionsOptional()
  const state = useYohakuState()
  const loading = useYohakuLoading()
  const t = useTranslations('note')

  const active = state !== 'idle'
  const showCta = !!actions && showYohakuChip

  return (
    <section data-hide-print className="mt-6">
      <div className="mb-2 font-serif text-label-12 italic tracking-[0.4px] text-neutral-6 [font-variant:small-caps]">
        {t('synopsis_title')}
      </div>
      <div
        className="font-serif text-copy-14 leading-[1.9] text-neutral-7"
        style={{ textAutospace: 'normal' }}
      >
        <Markdown disableParsingRawHTML removeWrapper>
          {summary}
        </Markdown>
        {showCta && (
          <>
            {' '}
            <button
              aria-expanded={active}
              data-yohaku-chip=""
              disabled={loading}
              type="button"
              className={clsxm(
                'font-serif text-copy-14 italic text-accent',
                'border-b border-dotted border-accent/45 pb-px',
                'transition-colors duration-150 hover:border-accent/85',
                loading && 'cursor-wait opacity-60',
              )}
              onClick={actions.toggle}
            >
              {active ? t('synopsis_close') : t('synopsis_open')}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
