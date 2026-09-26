'use client'

import { AnimatePresence } from 'motion/react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'
import { Fragment } from 'react'

import { getAdminUrl } from '~/atoms'
import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { fetchAppUrl } from '~/atoms/hooks/url'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { UserArrowLeftIcon } from '~/components/icons/user-arrow-left'
import {
  MembershipMenuEntry,
  useIsActiveMember,
} from '~/components/modules/membership'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { EllipsisHorizontalTextWithTooltip } from '~/components/ui/typography'
import { useIsClient } from '~/hooks/common/use-is-client'
import { authClient } from '~/lib/authjs'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'
import { useHasProviders, useOauthLoginModal } from '~/queries/hooks/authjs'

import { HeaderActionButton } from './HeaderActionButton'
import { useMenuOpacity } from './hooks'
import { UserAuthFromIcon } from './UserAuthFromIcon'

const OwnerAvatar = () => {
  const t = useTranslations('common')
  const ownerAvatar = useAggregationSelector((s) => s.user.avatar)!

  return (
    <div className="pointer-events-auto relative flex items-center justify-center">
      <Image
        alt={t('aria_site_owner_avatar')}
        className="rounded-full"
        height={36}
        src={ownerAvatar}
        width={36}
      />
      <UserAuthFromIcon className="absolute -bottom-1 right-0" />
    </div>
  )
}
export function UserAuth() {
  const t = useTranslations('common')
  const isOwner = useIsOwnerLogged()
  const isClient = useIsClient()
  const session = useSessionReader()
  const isMobile = useIsMobile()
  const menuOpacity = useMenuOpacity()
  const opacityStyle: CSSProperties | undefined =
    isMobile && menuOpacity !== undefined
      ? {
          opacity: menuOpacity,
          visibility: menuOpacity === 0 ? 'hidden' : 'visible',
        }
      : undefined
  const hasProviders = useHasProviders()

  const presentOauthModal = useOauthLoginModal()

  const hoverOnly = !isMobile

  if (!isClient) return null

  return (
    <AnimatePresence>
      <div style={opacityStyle}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger nativeButton={false} openOnHover={hoverOnly}>
            {isOwner ? (
              <OwnerAvatar />
            ) : session ? (
              <ReaderAvatar />
            ) : (
              hasProviders && (
                <HeaderActionButton
                  aria-label={t('aria_login')}
                  onClick={() => {
                    presentOauthModal()
                  }}
                >
                  <UserArrowLeftIcon className="size-4" />
                </HeaderActionButton>
              )
            )}
          </DropdownMenuTrigger>

          {(session || isOwner) && (
            <DropdownMenuContent
              keepMounted
              align="end"
              className="relative flex max-w-[30ch] flex-col"
              positionMethod="fixed"
              sideOffset={8}
            >
              {session && (
                <Fragment>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-label-12 text-neutral-9/60">
                      {t('auth_account')}
                    </DropdownMenuLabel>
                    <DropdownMenuLabel className="min-w-0">
                      <div className="-mt-1 flex min-w-0 items-center gap-2">
                        <img
                          alt=""
                          className="size-8 rounded-full"
                          src={session.image}
                        />
                        <div className="min-w-0 max-w-40 leading-none">
                          <div className="truncate">{session.name}</div>
                          <EllipsisHorizontalTextWithTooltip className="min-w-0 truncate text-label-12 text-neutral-9/60">
                            {session?.handle
                              ? `@${session.handle}`
                              : session?.email}
                          </EllipsisHorizontalTextWithTooltip>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <MembershipMenuEntry />
                </Fragment>
              )}

              {isOwner && (
                <Fragment>
                  <DropdownMenuItem
                    icon={<i className="i-mingcute-dashboard-2-line size-4" />}
                    onClick={async () => {
                      let adminUrl = getAdminUrl()
                      if (!adminUrl) {
                        const data = await fetchAppUrl().catch(() => null)
                        adminUrl = data?.adminUrl ?? getAdminUrl()
                      }
                      if (adminUrl) {
                        window.open(adminUrl, '_blank')
                      }
                    }}
                  >
                    {t('auth_console')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </Fragment>
              )}
              <DropdownMenuItem
                icon={<i className="i-mingcute-exit-line size-4" />}
                onClick={async () => {
                  await apiClient.owner.logout().catch(() => {})
                  await authClient.signOut().then((res) => {
                    if (res.data?.success) window.location.reload()
                  })
                }}
              >
                {t('auth_logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </AnimatePresence>
  )
}

const ReaderAvatar = () => {
  const session = useSessionReader()!
  const isMember = useIsActiveMember()

  return (
    <div className="pointer-events-auto relative flex items-center justify-center">
      <Image
        alt={session.name}
        className={clsxm('rounded-full', isMember && 'ring-2 ring-accent/70')}
        height={36}
        src={session.image}
        width={36}
      />
      <UserAuthFromIcon className="absolute -bottom-1 right-0" />
    </div>
  )
}
