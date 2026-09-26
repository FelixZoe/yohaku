'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { NoticeCardItem } from '~/components/modules/shared/NoticeCard'

import type { AiGenValueOrArray } from './ai-gen'

export const AIGenFullNotice: FC<{ value?: AiGenValueOrArray | null }> = ({
  value,
}) => {
  const t = useTranslations('ai')
  const values =
    value === undefined || value === null
      ? []
      : Array.isArray(value)
        ? value
        : [value]
  if (!values.includes(2)) return null
  return (
    <NoticeCardItem
      icon="i-mingcute-ai-fill"
      title={t('fully_generated_notice')}
      tone="warning"
    />
  )
}
