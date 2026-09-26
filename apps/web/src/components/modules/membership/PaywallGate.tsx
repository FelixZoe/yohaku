'use client'

import { useLocale, useTranslations } from 'next-intl'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { StyledButton } from '~/components/ui/button'
import {
  useCurrentPostDataSelector,
  useCurrentPostMetaSelector,
} from '~/providers/post/CurrentPostDataProvider'
import { useOauthLoginModal } from '~/queries/hooks/authjs'

import { formatCurrency } from './checkout-helpers'
import { useCheckoutModal } from './CheckoutModal'
import type { PaywallChannel, PaywallCta } from './paywall-ctas'
import { resolvePaywallCtas } from './paywall-ctas'
import { writePaywallIntent } from './paywall-intent'
import {
  entitlementReasonOf,
  shouldUnlockPaywalledContent,
} from './should-unlock-paywall'
import { useArticleCheckout } from './useArticleCheckout'
import {
  useAvailablePlans,
  useIsActiveMember,
  useMembershipEnabled,
} from './useMembership'

export const PaywallGate = () => {
  const paywall = useCurrentPostMetaSelector((meta) => meta?.paywall)
  const postId = useCurrentPostDataSelector((post) => post?.id)
  const reason = entitlementReasonOf(paywall)
  const session = useSessionReader()
  const isMember = useIsActiveMember()
  const isOwner = useIsOwnerLogged()
  const membershipEnabled = useMembershipEnabled()
  const { plans, articlePurchase } = useAvailablePlans()

  const t = useTranslations('membership')
  const locale = useLocale()
  const presentLogin = useOauthLoginModal()
  const presentCheckout = useCheckoutModal()
  const articleCheckout = useArticleCheckout(postId)

  if (
    reason !== 'locked' ||
    shouldUnlockPaywalledContent({ reason, isMember, isOwner })
  )
    return null

  const loggedIn = !!session
  const monthly = plans.find((p) => p.plan === 'monthly')?.pricing
  const articlePrice = paywall?.purchase?.price ?? articlePurchase?.price
  const prices = {
    sponsor: monthly
      ? formatCurrency(monthly.amount, monthly.currency, locale)
      : undefined,
    article: articlePrice
      ? formatCurrency(articlePrice.amount, articlePrice.currency, locale)
      : undefined,
  }
  const { ctas, guestHint } = resolvePaywallCtas({
    loggedIn,
    membershipAvailable: membershipEnabled,
    purchaseAvailable:
      !!articlePurchase?.enabled && paywall?.purchase?.enabled !== false,
    prices,
  })

  if (ctas.length === 0) return null

  const channelLabel: Record<PaywallChannel, string> = {
    sponsor: prices.sponsor
      ? t('cta_sponsor', { price: prices.sponsor })
      : t('checkout_title'),
    purchase: prices.article
      ? t('cta_purchase', { price: prices.article })
      : t('cta_purchase_no_price'),
  }
  const channelCaption: Record<PaywallChannel, string> = {
    sponsor: t('sponsor_caption'),
    purchase: t('purchase_caption'),
  }
  const hint =
    guestHint.length === 2
      ? t('guest_price_hint', {
          article: prices.article ?? '',
          sponsor: prices.sponsor ?? '',
        })
      : guestHint.length === 1
        ? channelLabel[guestHint[0]]
        : null

  const onCta = (cta: PaywallCta) => {
    if (cta.kind === 'login') {
      writePaywallIntent({ type: 'paywall', path: window.location.pathname })
      presentLogin()
    } else if (cta.kind === 'sponsor') presentCheckout()
    else articleCheckout.mutate()
  }

  return (
    <div className="relative mt-2 select-none">
      <div className="mb-7 flex items-center gap-3 text-caption-10 font-medium uppercase tracking-[2px] text-neutral-6">
        <span className="h-px flex-1 bg-[var(--yohaku-paper-hairline)]" />
        {t('divider')}
        <span className="h-px flex-1 bg-[var(--yohaku-paper-hairline)]" />
      </div>

      <div className="shadow-paper-contact relative mx-auto flex max-w-md flex-col items-center gap-3 overflow-hidden rounded-xl border border-black/[0.04] bg-gradient-to-br from-accent/[0.05] via-[rgba(255,228,180,0.06)] to-accent/[0.02] px-6 py-9 text-center md:px-10 dark:border-white/[0.06] dark:from-accent/[0.08] dark:via-[rgba(255,228,180,0.04)] dark:to-accent/[0.03]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 size-[140px] dark:opacity-50"
          style={{
            background:
              'radial-gradient(circle, rgba(255,228,180,0.14), transparent 70%)',
          }}
        />
        <div className="flex size-12 items-center justify-center rounded-full bg-accent/12 text-accent">
          <i className="i-mingcute-vip-1-line size-6" />
        </div>
        <h3 className="text-balance text-xl font-medium text-neutral-9">
          {t('locked_title')}
        </h3>
        <p className="max-w-xs text-copy-13 leading-relaxed text-neutral-9/60">
          {loggedIn ? t('locked_subtitle') : t('locked_subtitle_guest')}
        </p>

        <div className="mt-3 flex w-full max-w-[16rem] flex-col gap-3">
          {ctas.map((cta) => (
            <div className="flex flex-col items-center gap-1.5" key={cta.kind}>
              <StyledButton
                className="w-full justify-center py-2"
                isLoading={cta.kind === 'purchase' && articleCheckout.isPending}
                variant={
                  cta.kind === 'login' || cta.primary ? 'primary' : 'secondary'
                }
                onClick={() => onCta(cta)}
              >
                {cta.kind === 'login' ? t('cta_login') : channelLabel[cta.kind]}
              </StyledButton>
              {cta.kind !== 'login' ? (
                <span className="text-label-12 text-neutral-6">
                  {channelCaption[cta.kind]}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {hint ? (
          <p className="mt-1 text-label-12 text-neutral-6">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}
