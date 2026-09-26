'use client'

import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { Link, usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import type { IHeaderMenu } from '../config'
import {
  useHeaderConfig,
  useHeaderConfigValue,
} from './HeaderDataConfigureProvider'
import { useMobileMenu } from './HeaderDrawerButton'

export const HeaderDrawerContent = () => {
  const config = useHeaderConfigValue('configAtom')
  const { ensureMenuData } = useHeaderConfig()
  const t = useTranslations('common')
  const pathname = usePathname()
  const { close } = useMobileMenu()

  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    ensureMenuData('Home')
    ensureMenuData('Post')
  }, [ensureMenuData])

  const getTitle = useCallback(
    (item: IHeaderMenu) => {
      if (item.titleKey) {
        return t(item.titleKey as any)
      }
      return item.title
    },
    [t],
  )

  const toggleSection = useCallback((path: string) => {
    setExpandedSection((prev) => (prev === path ? null : path))
  }, [])

  const activeClass =
    'text-neutral-9 bg-white/55 dark:bg-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
  const inactiveClass = 'text-neutral-7'

  return (
    <div className="p-3">
      <div className="flex flex-wrap gap-2">
        {config.map((section) => {
          const hasSubMenu = !!section.subMenu
          const isNonNavigable = section.path === '#'
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

          if (hasSubMenu) {
            return (
              <div
                key={section.path}
                className={clsxm(
                  'flex items-stretch rounded-[2px] overflow-hidden',
                  'border dark:border-white/[0.06]',
                  isActive
                    ? `border-black/[0.06] ${activeClass}`
                    : `border-black/[0.04] ${inactiveClass}`,
                )}
              >
                {isNonNavigable ? (
                  <button
                    className="px-3 py-3 text-copy-13"
                    onClick={() => toggleSection(section.path)}
                  >
                    {getTitle(section)}
                  </button>
                ) : (
                  <Link
                    className="px-3 py-3 text-copy-13"
                    href={href}
                    onClick={() => {
                      section.do?.()
                      close()
                    }}
                  >
                    {getTitle(section)}
                  </Link>
                )}
                <button
                  aria-expanded={expandedSection === section.path}
                  aria-label={t('nav_drawer_expand_section', {
                    section: getTitle(section),
                  })}
                  className={clsxm(
                    'px-3 py-3 text-label-12 transition',
                    'border-l dark:border-white/[0.06]',
                    expandedSection === section.path
                      ? 'border-black/[0.08] bg-black/[0.02] dark:bg-white/[0.04] text-neutral-7'
                      : 'border-black/[0.06] bg-black/[0.015] dark:bg-white/[0.03] text-neutral-5',
                  )}
                  onClick={() => toggleSection(section.path)}
                >
                  {expandedSection === section.path ? '▴' : '▾'}
                </button>
              </div>
            )
          }

          const linkClass = clsxm(
            'px-3 py-3 text-copy-13 rounded-[2px] transition',
            'border dark:border-white/[0.06]',
            isActive
              ? `border-black/[0.06] ${activeClass}`
              : `border-black/[0.04] ${inactiveClass}`,
          )

          if (isExternal) {
            return (
              <a
                className={linkClass}
                href={href}
                key={section.path}
                rel="noopener"
                target="_blank"
                onClick={close}
              >
                {getTitle(section)}
              </a>
            )
          }

          return (
            <Link
              className={linkClass}
              href={href}
              key={section.path}
              onClick={() => {
                section.do?.()
                close()
              }}
            >
              {getTitle(section)}
            </Link>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {expandedSection && (
          <ExpandedSubMenu
            close={close}
            getTitle={getTitle}
            key={expandedSection}
            pathname={pathname}
            section={config.find((s) => s.path === expandedSection)!}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const ExpandedSubMenu = ({
  section,
  getTitle,
  close,
  pathname,
}: {
  section: IHeaderMenu
  getTitle: (item: IHeaderMenu) => string
  close: () => void
  pathname: string
}) => {
  const t = useTranslations('common')
  if (!section.subMenu) return null

  return (
    <m.div
      animate={{ height: 'auto', opacity: 1 }}
      className="overflow-hidden"
      exit={{ height: 0, opacity: 0 }}
      initial={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="border-t border-black/[0.03] dark:border-white/[0.03] pt-2 mt-2">
        <div className="text-caption-10 uppercase tracking-[2px] text-neutral-4 mb-1.5">
          {getTitle(section)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {section.subMenu.length === 0 && (
            <span className="text-label-12 text-neutral-4 py-2">
              {t('nav_drawer_loading')}
            </span>
          )}
          {section.subMenu.map((sub) => {
            const isExternal = sub.path.startsWith('http')
            const isSubActive =
              sub.path === pathname ||
              pathname.slice(1) === sub.path ||
              pathname.startsWith(`${sub.path}/`)

            const subClass = clsxm(
              'text-label-12 px-3 py-2.5 rounded-[2px] transition',
              isSubActive
                ? 'text-neutral-9 bg-white/55 dark:bg-white/[0.06]'
                : 'text-neutral-6 bg-black/[0.02] dark:bg-white/[0.04]',
            )

            if (isExternal) {
              return (
                <a
                  className={subClass}
                  href={sub.path}
                  key={sub.path}
                  rel="noopener"
                  target="_blank"
                  onClick={close}
                >
                  {getTitle(sub)}
                </a>
              )
            }

            return (
              <Link
                className={subClass}
                href={sub.path}
                key={sub.path}
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
    </m.div>
  )
}
