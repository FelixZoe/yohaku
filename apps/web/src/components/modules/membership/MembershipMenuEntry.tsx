'use client'

import { useTranslations } from 'next-intl'
import { Fragment } from 'react'

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu'

import { useCheckoutModal } from './CheckoutModal'
import { useSponsorArchiveModal } from './SponsorArchiveModal'
import {
  isActiveMembership,
  useMembershipEnabled,
  useMembershipStatus,
} from './useMembership'

export const MembershipMenuEntry = () => {
  const t = useTranslations('membership')
  const { data } = useMembershipStatus()
  const membershipEnabled = useMembershipEnabled()
  const presentCheckout = useCheckoutModal()
  const presentArchive = useSponsorArchiveModal()
  const archiveItem = (
    <DropdownMenuItem
      icon={<i className="i-mingcute-book-2-line size-4" />}
      onClick={() => presentArchive()}
    >
      {t('menu_archive')}
    </DropdownMenuItem>
  )

  if (data && isActiveMembership(data)) {
    const end =
      'currentPeriodEnd' in data
        ? new Date(data.currentPeriodEnd).toLocaleDateString()
        : undefined
    return (
      <Fragment>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 text-label-12">
            <i className="i-mingcute-vip-1-line size-4 text-accent" />
            <span>{t('badge_member')}</span>
            {end ? (
              <span className="text-neutral-9/60">
                {t('expire_at', { date: end })}
              </span>
            ) : null}
          </DropdownMenuLabel>
          {archiveItem}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
      </Fragment>
    )
  }

  if (!membershipEnabled) return null

  return (
    <Fragment>
      <DropdownMenuGroup>
        <DropdownMenuItem
          icon={<i className="i-mingcute-vip-1-line size-4" />}
          onClick={() => presentCheckout()}
        >
          {t('menu_become_member')}
        </DropdownMenuItem>
        {archiveItem}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </Fragment>
  )
}
