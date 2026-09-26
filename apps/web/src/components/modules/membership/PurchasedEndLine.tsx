'use client'

import { useFormatter, useTranslations } from 'next-intl'

import {
  useCurrentPostDataSelector,
  useCurrentPostMetaSelector,
} from '~/providers/post/CurrentPostDataProvider'

import { entitlementReasonOf } from './should-unlock-paywall'

export const PurchasedEndLine = () => {
  const t = useTranslations('membership')
  const tc = useTranslations('common')
  const format = useFormatter()
  const purchased = useCurrentPostMetaSelector(
    (meta) => entitlementReasonOf(meta?.paywall) === 'purchase',
  )
  const modifiedAt = useCurrentPostDataSelector((post) => post?.modifiedAt)
  if (!purchased) return null

  const date = modifiedAt
    ? format.dateTime(new Date(modifiedAt), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : ''

  return (
    <div className="mt-8 pt-5 text-label-12 text-neutral-6">
      <div className="h-px bg-[var(--yohaku-paper-hairline)]" />
      <div className="mt-5">
        {t('purchased')}
        {date && ` · ${tc('last_updated')} ${date}`}
      </div>
    </div>
  )
}
