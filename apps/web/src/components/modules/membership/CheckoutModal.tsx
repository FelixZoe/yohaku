'use client'

import type { MembershipPlan, MembershipPlanInfo } from '@mx-space/api-client'
import { useMutation } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { StyledButton } from '~/components/ui/button'
import { useModalStack } from '~/components/ui/modal'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'

import { currentReturnPath, formatCurrency } from './checkout-helpers'
import { useAvailablePlans } from './useMembership'

const yearlySavingsPercent = (plans: MembershipPlanInfo[]): number | null => {
  const monthly = plans.find((p) => p.plan === 'monthly')?.pricing
  const yearly = plans.find((p) => p.plan === 'yearly')?.pricing
  if (!monthly || !yearly || monthly.amount <= 0) return null
  if (monthly.currency !== yearly.currency) return null
  const ratio = 1 - yearly.amount / (monthly.amount * 12)
  const percent = Math.round(ratio * 100)
  return percent > 0 ? percent : null
}

const CheckoutModalContent = () => {
  const t = useTranslations('membership')
  const locale = useLocale()
  const { plans } = useAvailablePlans()

  const defaultPlan =
    plans.find((p) => p.plan === 'yearly')?.plan ?? plans[0]?.plan ?? 'monthly'
  const [selected, setSelected] = useState<MembershipPlan>(defaultPlan)

  const savings = useMemo(() => yearlySavingsPercent(plans), [plans])

  const checkout = useMutation({
    mutationFn: (plan: MembershipPlan) =>
      apiClient.membership.checkout(plan, currentReturnPath()),
    onSuccess: (res) => {
      window.location.href = res.checkoutUrl
    },
    onError: () => toast.error(t('checkout_failed')),
  })

  const planLabel: Record<MembershipPlan, string> = {
    monthly: t('plan_monthly'),
    yearly: t('plan_yearly'),
  }
  const intervalLabels = {
    day: t('per_day'),
    week: t('per_week'),
    month: t('per_month'),
    year: t('per_year'),
  }
  const intervalLabel = (info: MembershipPlanInfo) =>
    info.pricing ? intervalLabels[info.pricing.interval] : ''

  return (
    <div className="flex w-[min(22rem,82vw)] flex-col gap-4">
      <p className="text-copy-13 text-neutral-9/60">{t('checkout_subtitle')}</p>

      <div className="flex flex-col gap-2.5">
        {plans.map((info) => {
          const isSelected = info.plan === selected
          const isYearly = info.plan === 'yearly'
          return (
            <button
              key={info.plan}
              type="button"
              className={clsxm(
                'relative flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all',
                isSelected
                  ? 'border-accent/50 bg-accent/[0.06]'
                  : 'border-black/8 hover:border-black/15 dark:border-white/10 dark:hover:border-white/20',
              )}
              onClick={() => setSelected(info.plan)}
            >
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-copy-14 font-medium text-neutral-9">
                  {planLabel[info.plan]}
                  {isYearly && savings ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-caption-10 font-medium text-accent">
                      {t('save_percent', { percent: savings })}
                    </span>
                  ) : null}
                </span>
                {info.pricing ? (
                  <span className="text-caption-10 text-neutral-9/45">
                    {isYearly && info.pricing.interval === 'year'
                      ? t('yearly_equivalent', {
                          price: formatCurrency(
                            Math.round(info.pricing.amount / 12),
                            info.pricing.currency,
                            locale,
                          ),
                        })
                      : t('billed_each', { interval: intervalLabel(info) })}
                  </span>
                ) : null}
              </div>

              <div className="flex items-baseline gap-0.5">
                {info.pricing ? (
                  <>
                    <span className="font-serif text-display-24 font-semibold tabular-nums text-neutral-9">
                      {formatCurrency(
                        info.pricing.amount,
                        info.pricing.currency,
                        locale,
                      )}
                    </span>
                    <span className="text-caption-10 text-neutral-9/45">
                      /{intervalLabel(info)}
                    </span>
                  </>
                ) : (
                  <span className="text-copy-13 text-neutral-9/60">
                    {planLabel[info.plan]}
                  </span>
                )}
              </div>

              <span
                aria-hidden
                className={clsxm(
                  'absolute right-3 top-3 flex size-4 items-center justify-center rounded-full border',
                  isSelected
                    ? 'border-accent bg-accent text-white'
                    : 'border-black/15 dark:border-white/20',
                )}
              >
                {isSelected ? (
                  <i className="i-mingcute-check-line size-3" />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <StyledButton
        className="h-11 justify-center"
        isLoading={checkout.isPending}
        variant="primary"
        onClick={() => checkout.mutate(selected)}
      >
        {t('checkout_continue')}
      </StyledButton>

      <p className="text-center text-caption-10 text-neutral-9/40">
        {t('checkout_note')}
      </p>
    </div>
  )
}

export const useCheckoutModal = () => {
  const { present } = useModalStack()
  const t = useTranslations('membership')
  return useCallback(() => {
    present({
      title: t('checkout_title'),
      clickOutsideToDismiss: true,
      content: CheckoutModalContent,
    })
  }, [present, t])
}
