'use client'

import { useTranslations } from 'next-intl'

import { useSessionReader } from '~/atoms/hooks/reader'
import { clsxm } from '~/lib/helper'
import { useCurrentPostMetaSelector } from '~/providers/post/CurrentPostDataProvider'
import { useOauthLoginModal } from '~/queries/hooks/authjs'

import { useCheckoutModal } from '../membership/CheckoutModal'
import { insightsTapAction } from '../membership/insights-tap-action'
import { useMembershipEnabled } from '../membership/useMembership'
import {
  useYohakuActionsOptional,
  useYohakuLoading,
  useYohakuState,
} from './YohakuProvider'

export function YohakuSummaryChip({ className }: { className?: string }) {
  const actions = useYohakuActionsOptional()
  const state = useYohakuState()
  const loading = useYohakuLoading()
  const t = useTranslations('common')
  const locked =
    useCurrentPostMetaSelector((meta) => meta?.paywall?.locked) === true
  const loggedIn = !!useSessionReader()
  const checkoutEnabled = useMembershipEnabled()
  const presentLogin = useOauthLoginModal()
  const presentCheckout = useCheckoutModal()
  if (!actions) return null
  const active = state !== 'idle'
  return (
    <button
      aria-expanded={active}
      data-yohaku-chip=""
      disabled={loading}
      type="button"
      className={clsxm(
        'inline-flex shrink-0 items-center gap-1 text-label-12 text-accent',
        'underline underline-offset-2 transition-opacity hover:opacity-80',
        loading && 'opacity-60 cursor-wait',
        className,
      )}
      onClick={() => {
        if (active) {
          void actions.toggle()
          return
        }
        const action = insightsTapAction({
          checkoutEnabled,
          locked,
          loggedIn,
        })
        if (action === 'login') {
          presentLogin()
          return
        }
        if (action === 'subscribe') {
          presentCheckout()
          return
        }
        if (action === 'open') void actions.toggle()
      }}
    >
      <i
        aria-hidden
        className={clsxm(
          'text-copy-13',
          active ? 'i-mingcute-book-open-line' : 'i-mingcute-book-2-line',
        )}
      />
      {active ? t('yohaku_chip_close') : t('yohaku_chip_open')}
    </button>
  )
}
