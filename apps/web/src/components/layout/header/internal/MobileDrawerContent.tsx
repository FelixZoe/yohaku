'use client'

import { useAtomValue } from 'jotai'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { ttsControlsAtom, ttsNarrationAtom } from '~/atoms/tts'
import { useIsClient } from '~/hooks/common/use-is-client'
import { Link, usePathname } from '~/i18n/navigation'
import { authClient } from '~/lib/authjs'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'
import { useHasProviders, useOauthLoginModal } from '~/queries/hooks/authjs'

import type { IHeaderMenu } from '../config'
import {
  useHeaderConfig,
  useHeaderConfigValue,
} from './HeaderDataConfigureProvider'
import { useMobileMenu } from './HeaderDrawerButton'

export const MobileDrawerContent = () => {
  const config = useHeaderConfigValue('configAtom')
  const { ensureMenuData } = useHeaderConfig()
  const t = useTranslations('common')
  const pathname = usePathname()
  const { close } = useMobileMenu()
  const tTts = useTranslations('tts')
  const ttsAvailable = useAtomValue(ttsNarrationAtom).available
  const ttsControls = useAtomValue(ttsControlsAtom)

  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    ensureMenuData('Home')
    ensureMenuData('Post')
  }, [ensureMenuData])

  const getTitle = useCallback(
    (item: IHeaderMenu) => {
      if (item.titleKey) return t(item.titleKey as any)
      return item.title
    },
    [t],
  )

  const toggleSection = useCallback((path: string) => {
    setExpandedSection((prev) => (prev === path ? null : path))
  }, [])

  const mainItems = config.filter((s) => s.path !== '#')
  const moreSection = config.find((s) => s.path === '#')

  return (
    <div className="px-5 pb-5 pt-6">
      <div className="max-h-[75svh] overflow-y-auto">
        <div className="flex flex-col">
          {mainItems.map((section) => {
            const hasSubMenu = !!section.subMenu && section.subMenu.length > 0
            const isExternal = section.path.startsWith('http')

            const subItemActive =
              section.subMenu?.findIndex(
                (item) =>
                  item.path === pathname ||
                  pathname.slice(1) === item.path ||
                  pathname.startsWith(`${item.path}/`),
              ) ?? -1

            const isActive =
              pathname === section.path ||
              (pathname.startsWith(`${section.path}/`) &&
                !section.exclude?.includes(pathname)) ||
              subItemActive > -1

            let href = section.path
            if (section.search) {
              href += `?${new URLSearchParams(section.search).toString()}`
            }

            const isNonNavigable = section.path === '#'
            const isExpanded = expandedSection === section.path

            const linkElement = isNonNavigable ? (
              <button
                className="flex min-w-0 flex-1 items-baseline py-3 text-left"
                onClick={() => hasSubMenu && toggleSection(section.path)}
              >
                <NavLabel isActive={isActive} title={getTitle(section)} />
              </button>
            ) : isExternal ? (
              <a
                className="flex min-w-0 flex-1 items-baseline py-3 no-underline"
                href={href}
                rel="noopener"
                target="_blank"
                onClick={close}
              >
                <NavLabel isActive={isActive} title={getTitle(section)} />
              </a>
            ) : (
              <Link
                className="flex min-w-0 flex-1 items-baseline py-3 no-underline"
                href={href}
                onClick={() => {
                  section.do?.()
                  close()
                }}
              >
                <NavLabel isActive={isActive} title={getTitle(section)} />
              </Link>
            )

            const rightElement = hasSubMenu ? (
              <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${getTitle(section)}`}
                className="flex min-w-[44px] items-center justify-end self-stretch pr-1 text-neutral-6 transition-colors active:text-neutral-8"
                type="button"
                onClick={() => toggleSection(section.path)}
              >
                <i
                  aria-hidden
                  className={clsxm(
                    'i-mingcute-down-line size-3.5 shrink-0 transition-transform duration-200',
                    isExpanded && 'rotate-180',
                  )}
                />
              </button>
            ) : null

            return (
              <div key={section.path}>
                <div className="flex items-stretch border-b border-neutral-9/[0.05] dark:border-white/[0.05]">
                  {linkElement}
                  {rightElement}
                </div>

                <AnimatePresence mode="wait">
                  {isExpanded && section.subMenu && (
                    <m.div
                      animate={{ height: 'auto', opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      key={section.path}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <SubMenuItems
                        close={close}
                        getTitle={getTitle}
                        items={section.subMenu}
                        pathname={pathname}
                      />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
          {ttsAvailable && (
            <div className="flex items-stretch border-b border-neutral-9/[0.05] dark:border-white/[0.05]">
              <button
                className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left"
                type="button"
                onClick={() => {
                  ttsControls?.start()
                  close()
                }}
              >
                <i className="i-mingcute-volume-line shrink-0 text-copy-15 text-accent" />
                <span className="text-copy-15 text-neutral-8">
                  {tTts('narrate')}
                </span>
              </button>
            </div>
          )}
        </div>

        {moreSection?.subMenu && moreSection.subMenu.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-caption-10 uppercase tracking-[2px] text-neutral-5">
              {getTitle(moreSection)}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {moreSection.subMenu.map((sub) => {
                const isExternal = sub.path.startsWith('http')
                const isSubActive =
                  sub.path === pathname ||
                  pathname.slice(1) === sub.path ||
                  pathname.startsWith(`${sub.path}/`)

                if (isExternal) {
                  return (
                    <a
                      href={sub.path}
                      key={sub.path}
                      rel="noopener"
                      target="_blank"
                      className={clsxm(
                        'py-1.5 text-copy-13 no-underline',
                        isSubActive ? 'text-neutral-9' : 'text-neutral-7',
                      )}
                      onClick={close}
                    >
                      {getTitle(sub)}
                    </a>
                  )
                }

                return (
                  <Link
                    href={sub.path}
                    key={sub.path}
                    className={clsxm(
                      'py-1.5 text-copy-13 no-underline',
                      isSubActive ? 'text-neutral-9' : 'text-neutral-7',
                    )}
                    onClick={() => {
                      sub.do?.()
                      close()
                    }}
                  >
                    {getTitle(sub)}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <AuthFooter />
    </div>
  )
}

const NavLabel = ({
  title,
  isActive,
}: {
  title: string
  isActive: boolean
}) => (
  <span
    className={clsxm(
      'font-serif text-copy-14',
      isActive ? 'font-medium text-neutral-9' : 'text-neutral-8',
    )}
  >
    {title}
  </span>
)

const SubMenuItems = ({
  items,
  getTitle,
  close,
  pathname,
}: {
  items: IHeaderMenu[]
  getTitle: (item: IHeaderMenu) => string
  close: () => void
  pathname: string
}) => {
  const t = useTranslations('common')

  if (items.length === 0) {
    return (
      <div className="py-2 pl-4">
        <span className="text-label-12 text-neutral-4">
          {t('nav_drawer_loading')}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-b border-neutral-9/[0.05] py-1.5 pl-4 dark:border-white/[0.05]">
      {items.map((sub) => {
        const isExternal = sub.path.startsWith('http')
        const isSubActive =
          sub.path === pathname ||
          pathname.slice(1) === sub.path ||
          pathname.startsWith(`${sub.path}/`)

        const label = (
          <span
            className={clsxm(
              'text-copy-13',
              isSubActive ? 'text-neutral-9' : 'text-neutral-7',
            )}
          >
            {getTitle(sub)}
          </span>
        )

        if (isExternal) {
          return (
            <a
              className="py-1.5 no-underline"
              href={sub.path}
              key={sub.path}
              rel="noopener"
              target="_blank"
              onClick={close}
            >
              {label}
            </a>
          )
        }

        return (
          <Link
            className="py-1.5 no-underline"
            href={sub.path}
            key={sub.path}
            onClick={() => {
              sub.do?.()
              close()
            }}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

const AuthFooter = () => {
  const t = useTranslations('common')
  const isOwner = useIsOwnerLogged()
  const session = useSessionReader()
  const isClient = useIsClient()
  const ownerName = useAggregationSelector((data) => data.user.name)
  const hasProviders = useHasProviders()
  const presentOauthModal = useOauthLoginModal()

  const hasSomeAuth = isClient && (isOwner || !!session)
  const shouldRender = isClient && (hasSomeAuth || hasProviders)

  return (
    <div className="mt-4 h-[34px] border-t border-neutral-9/[0.06] pt-3 dark:border-white/[0.06]">
      <AnimatePresence>
        {shouldRender && (
          <m.div
            animate={{ opacity: 1 }}
            className="flex items-baseline justify-between"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {isOwner ? (
              <span className="font-serif text-label-12 italic text-[rgba(168,144,106,0.85)] dark:text-[rgba(200,176,138,0.85)]">
                {ownerName}
              </span>
            ) : session ? (
              <span className="font-serif text-label-12 italic text-neutral-6">
                {session.name}
              </span>
            ) : (
              <span />
            )}

            {hasSomeAuth ? (
              <button
                className="text-label-12 text-neutral-5 transition-colors hover:text-neutral-7"
                onClick={async () => {
                  await apiClient.owner.logout().catch(() => {})
                  await authClient.signOut().then((res) => {
                    if (res.data?.success) window.location.reload()
                  })
                }}
              >
                {t('auth_logout')}
              </button>
            ) : (
              <button
                className="text-label-12 font-medium text-accent transition-opacity hover:opacity-80"
                onClick={() => presentOauthModal()}
              >
                {t('aria_login')}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
