'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import {
  useCurrentPostDataSelector,
  useCurrentPostMetaSelector,
} from '~/providers/post/CurrentPostDataProvider'

import { NoticeCardItem } from '../shared/NoticeCard'
import { entitlementReasonOf } from './should-unlock-paywall'
import {
  isActiveMembership,
  useArticlePurchasedQuery,
  useMembershipStatus,
} from './useMembership'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const remainingUnit = (ms: number): [number, 'day' | 'hour' | 'minute'] => {
  if (ms >= DAY) return [Math.floor(ms / DAY), 'day']
  if (ms >= HOUR) return [Math.floor(ms / HOUR), 'hour']
  return [Math.max(1, Math.round(ms / MINUTE)), 'minute']
}

export const FreeWindowNoticeItem = () => {
  const t = useTranslations('membership')
  const format = useFormatter()
  const membership = useMembershipStatus()
  const isMember = isActiveMembership(membership.data)
  const postId = useCurrentPostDataSelector((post) => post?.id)
  const freeUntil = useCurrentPostMetaSelector((meta) =>
    entitlementReasonOf(meta?.paywall) === 'free-window'
      ? meta?.paywall?.freeUntil
      : undefined,
  )
  const purchase = useArticlePurchasedQuery(
    postId,
    !!freeUntil && membership.isFetched && !isMember,
  )
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE)
    return () => clearInterval(timer)
  }, [])
  if (!freeUntil) return null

  const purchased = !!purchase.data?.purchased
  const kind = isMember ? 'sponsor' : purchased ? 'purchased' : 'countdown'
  const until = new Date(freeUntil)
  const [count, unit] = remainingUnit(until.getTime() - now)
  const time = format.number(count, {
    style: 'unit',
    unit,
    unitDisplay: 'long',
  })
  const date = format.dateTime(until, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const untilText = t('free_window_until', { date })
  const youText =
    kind === 'sponsor'
      ? t('free_window_you_sponsor')
      : kind === 'purchased'
        ? t('free_window_you_purchased')
        : null

  return (
    <NoticeCardItem
      icon="i-mingcute-time-line"
      title={<span suppressHydrationWarning>{t('free_window', { time })}</span>}
      tone="secondary"
    >
      <span className="text-label-12 text-neutral-6">
        {untilText}
        {youText ? ` · ${youText}` : null}
      </span>
    </NoticeCardItem>
  )
}
