'use client'

import type { ArchivePostItem, ArchiveResult } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays } from 'date-fns'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Fragment, useCallback } from 'react'

import { useCurrentModal, useModalStack } from '~/components/ui/modal'
import { SlotText } from '~/components/ui/slot-text'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'

import type { ArchiveStatus } from './archive-types'
import { archiveStatusOf } from './archive-types'
import { formatCurrency } from './checkout-helpers'
import { useCheckoutModal } from './CheckoutModal'
import {
  isActiveMembership,
  useAvailablePlans,
  useMembershipEnabled,
  useMembershipStatus,
} from './useMembership'

const StatusGlyph = ({ status }: { status: ArchiveStatus }) => {
  if (status === 'unlocked')
    return (
      <svg
        className="size-3 text-accent"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    )
  if (status === 'free-window')
    return (
      <svg
        className="size-3 text-accent"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  return (
    <svg
      className="size-3 text-neutral-9/30"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="10" rx="2" width="14" x="5" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

const ArchiveRow = ({
  post,
  status,
  meta,
  showGlyph,
  onNavigate,
}: {
  post: ArchivePostItem
  status: ArchiveStatus
  meta: React.ReactNode
  showGlyph: boolean
  onNavigate: () => void
}) => (
  <li>
    <Link
      className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-neutral-9/5"
      href={routeBuilder(Routes.Post, {
        slug: post.slug,
        category: post.category.slug,
      })}
      onClick={onNavigate}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        {showGlyph ? (
          <span className="flex shrink-0 self-center">
            <StatusGlyph status={status} />
          </span>
        ) : null}
        <span
          className={clsxm(
            'truncate text-copy-14',
            status === 'locked' ? 'text-neutral-9/55' : 'text-neutral-9',
          )}
        >
          {post.title}
        </span>
      </span>
      <span className="whitespace-nowrap text-caption-10 tabular-nums text-neutral-9/45">
        {meta}
      </span>
    </Link>
  </li>
)

const SponsorArchiveModalContent = () => {
  const t = useTranslations('membership')
  const format = useFormatter()
  const locale = useLocale()
  const { dismiss } = useCurrentModal()
  const { data: membership } = useMembershipStatus()
  const isMember = isActiveMembership(membership)
  const membershipEnabled = useMembershipEnabled()
  const { plans } = useAvailablePlans()
  const presentCheckout = useCheckoutModal()
  const { data, isPending } = useQuery<ArchiveResult>({
    queryKey: ['membership', 'archive'],
    queryFn: () => apiClient.membership.archive(),
    staleTime: 60_000,
  })
  const posts = data?.posts ?? []

  const shortDate = (iso: string) =>
    format.dateTime(new Date(iso), { month: '2-digit', day: '2-digit' })
  const metaOf = (post: ArchivePostItem) => {
    const base = post.category.name
      ? `${shortDate(post.createdAt)} · ${post.category.name}`
      : shortDate(post.createdAt)
    if (post.entitlement === 'free-window' && post.freeUntil) {
      const days = Math.max(
        0,
        differenceInCalendarDays(new Date(post.freeUntil), new Date()),
      )
      return (
        <Fragment>
          {base} ·{' '}
          <span className="text-accent">
            {t('archive_free_days_left', { days })}
          </span>
        </Fragment>
      )
    }
    if (post.entitlement === 'purchase')
      return `${base} · ${t('archive_purchased')}`
    return base
  }

  const readable = posts.filter(
    (post) => archiveStatusOf(post.entitlement) !== 'locked',
  ).length
  const freeWindow = posts.filter(
    (post) => post.entitlement === 'free-window',
  ).length
  const years = [
    ...new Set(posts.map((post) => new Date(post.createdAt).getFullYear())),
  ].sort((a, b) => b - a)
  const yearRange =
    years.length > 1 ? `${years.at(-1)} – ${years[0]}` : String(years[0] ?? '')
  const monthly = plans.find((p) => p.plan === 'monthly')?.pricing
  const showCta = !isMember && membershipEnabled && readable < posts.length

  return (
    <div className="flex w-[min(30rem,86vw)] flex-col gap-4">
      {isPending ? (
        <p className="py-6 text-center text-label-12 text-neutral-9/40">…</p>
      ) : posts.length === 0 ? (
        <p className="py-6 text-center text-label-12 text-neutral-9/40">
          {t('archive_empty')}
        </p>
      ) : (
        <Fragment>
          <div className="flex flex-col gap-1">
            <p className="flex items-baseline gap-2 font-serif text-display-24 font-semibold text-neutral-9">
              <span>
                {t.rich('archive_heading', {
                  n: () => (
                    <span className="tabular-nums text-accent">
                      <SlotText text={String(posts.length)} />
                    </span>
                  ),
                })}
              </span>
              <span className="font-sans text-copy-13 font-medium text-neutral-7">
                {yearRange}
              </span>
            </p>
            {isMember ? null : (
              <p className="flex gap-3 text-label-12 text-neutral-7">
                <span>
                  <span className="font-medium text-accent">
                    <SlotText text={String(readable)} />
                  </span>{' '}
                  {t('archive_readable_now')}
                </span>
                {freeWindow > 0 ? (
                  <Fragment>
                    <span className="text-neutral-9/20">·</span>
                    <span>
                      {t('archive_free_window_count', { n: freeWindow })}
                    </span>
                  </Fragment>
                ) : null}
              </p>
            )}
          </div>

          <div className="-mx-2 grid max-h-[60vh] grid-cols-[3rem_minmax(0,1fr)] gap-x-5 overflow-y-auto px-2">
            {years.map((year) => (
              <Fragment key={year}>
                <div className="border-t border-neutral-9/8 pt-3 font-serif text-label-12 font-semibold tabular-nums text-accent">
                  {year}
                </div>
                <ul className="flex flex-col border-t border-neutral-9/8 pt-1">
                  {posts
                    .filter(
                      (post) => new Date(post.createdAt).getFullYear() === year,
                    )
                    .map((post) => (
                      <ArchiveRow
                        key={post.id}
                        meta={metaOf(post)}
                        post={post}
                        showGlyph={!isMember}
                        status={
                          isMember
                            ? 'unlocked'
                            : archiveStatusOf(post.entitlement)
                        }
                        onNavigate={dismiss}
                      />
                    ))}
                </ul>
              </Fragment>
            ))}
          </div>

          {membership && membership.status !== 'none' && isMember ? (
            <p className="border-t border-neutral-9/8 pt-3 text-caption-10 text-neutral-9/45">
              {t('archive_valid_until', {
                date: format.dateTime(new Date(membership.currentPeriodEnd), {
                  dateStyle: 'medium',
                }),
              })}
            </p>
          ) : null}

          {showCta ? (
            <button
              className="-mx-5 -mb-5 flex items-center justify-between border-t border-neutral-9/8 bg-accent/[0.04] px-5 py-3.5 text-left text-copy-13 text-neutral-9 transition-colors hover:bg-accent/[0.08]"
              type="button"
              onClick={() => {
                dismiss()
                presentCheckout()
              }}
            >
              <span className="flex flex-col gap-0.5">
                <span>{t('archive_cta', { total: posts.length })}</span>
                <span className="text-caption-10 text-neutral-9/45">
                  {t('archive_cta_sub')}
                </span>
              </span>
              <span className="whitespace-nowrap rounded-full bg-accent px-3.5 py-1.5 text-copy-13 font-medium text-white">
                {monthly
                  ? t('archive_cta_price', {
                      price: formatCurrency(
                        monthly.amount,
                        monthly.currency,
                        locale,
                      ),
                    })
                  : t('checkout_title')}
              </span>
            </button>
          ) : null}
        </Fragment>
      )}
    </div>
  )
}

export const useSponsorArchiveModal = () => {
  const { present } = useModalStack()
  const t = useTranslations('membership')
  return useCallback(() => {
    present({
      title: t('divider'),
      clickOutsideToDismiss: true,
      content: SponsorArchiveModalContent,
    })
  }, [present, t])
}
