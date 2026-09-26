'use client'

import './nav-menu.css'

import type { BaseUIEvent } from '@base-ui/react'
import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { animate, m, useMotionValue } from 'motion/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { RootPortal } from '~/components/ui/portal'
import { useDebounceValue } from '~/hooks/common/use-debounce-value'
import { Link, usePathname } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import {
  useIsScrollUpAndPageIsOver,
  usePageScrollLocationSelector,
} from '~/providers/root/page-scroll-info-provider'

import type { IHeaderMenu } from '../config'
import { dropdownTypeMap } from './DropdownContents'
import {
  useHeaderConfig,
  useHeaderConfigValue,
} from './HeaderDataConfigureProvider'
import { useHeaderShouldShowBg, useMenuOpacity } from './hooks'

/** Debug: prevent menu from closing on focus loss (e.g. when opening DevTools). Enable via ?nav_debug=1 or localStorage.nav_debug */
const useNavDebugMode = () => {
  const [debug] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      new URLSearchParams(window.location.search).get('nav_debug') === '1' ||
      !!localStorage.getItem('nav_debug')
    )
  })
  return debug
}

const NavSeparator = () => (
  <div className="h-3.5 w-px shrink-0 bg-gradient-to-b from-transparent via-black/[0.06] to-transparent dark:via-white/[0.06]" />
)

const PORTAL_CLASSES =
  'yohaku-page-right-inset pointer-events-none fixed inset-x-0 top-4 z-10 mr-[var(--removed-body-scroll-bar-size)] hidden justify-center lg:flex'

function cssAnchorPositioningSupported() {
  if (typeof CSS === 'undefined') return false
  // Some engines report position-anchor before anchor() resolves correctly
  return (
    CSS.supports?.('position-anchor', 'auto') === true &&
    CSS.supports?.('left', 'anchor(left)') === true
  )
}

export const HeaderContent = () => {
  const menuOpacity = useMenuOpacity()
  // When fadeMode is false, the page keeps the nav permanently visible
  // (e.g. post list / post detail). In that case the float-in animation
  // would briefly hide and re-slide an already-visible nav — skip it.
  const fadeMode = useHeaderShouldShowBg()
  const floatRaw = useIsScrollUpAndPageIsOver(600)
  const shouldFloat = useDebounceValue(fadeMode && floatRaw, 120)
  const scrolledPast = usePageScrollLocationSelector((y) => y > 160, [])

  const opacityMV = useMotionValue(menuOpacity)
  const yMV = useMotionValue(0)

  // Scroll-driven opacity: sync directly each render (instant, no spring)
  if (!shouldFloat) {
    opacityMV.set(fadeMode ? menuOpacity : 1)
  }

  const prevShouldFloat = useRef(shouldFloat)
  useEffect(() => {
    if (shouldFloat === prevShouldFloat.current) return
    prevShouldFloat.current = shouldFloat

    if (shouldFloat) {
      // Float in: slide from y=-20
      yMV.set(-20)
      opacityMV.set(0)
      animate(yMV, 0, { type: 'spring', bounce: 0, duration: 0.4 })
      animate(opacityMV, 1, { duration: 0.2 })
    } else {
      // Return to scroll-driven mode: reset immediately, let render-time sync handle opacity
      yMV.set(0)
      opacityMV.set(fadeMode ? menuOpacity : 1)
    }
  }, [shouldFloat, menuOpacity, fadeMode])

  // Solid (white bg + shadow) when the nav floats in, or when a long-display
  // page has scrolled far enough that content passes under it.
  const solid = shouldFloat || (!fadeMode && scrolledPast)

  return (
    <RootPortal>
      <m.div className={PORTAL_CLASSES} style={{ opacity: opacityMV, y: yMV }}>
        <ForDesktop solid={solid} />
      </m.div>
    </RootPortal>
  )
}

const ForDesktop: Component<{
  shouldHideNavBg?: boolean
  animatedIcon?: boolean
  solid?: boolean
}> = ({ className, shouldHideNavBg, animatedIcon = true, solid }) => {
  const headerMenuConfig = useHeaderConfigValue('configAtom')
  const { ensureMenuData } = useHeaderConfig()
  const pathname = usePathname()
  const t = useTranslations('common')
  const navDebugMode = useNavDebugMode()

  const [menuValue, setMenuValue] = useState<string | null>(null)
  const handleValueChange = useCallback(
    (value: string | null) => {
      if (navDebugMode && value == null) return
      if (value) {
        const section = headerMenuConfig.find((item) => item.path === value)
        if (section?.type) {
          ensureMenuData(section.type as Parameters<typeof ensureMenuData>[0])
        }
      }
      setMenuValue(value)
    },
    [ensureMenuData, headerMenuConfig, navDebugMode],
  )

  const getTitle = useCallback(
    (item: IHeaderMenu) => {
      if (item.titleKey) {
        return t(item.titleKey as any)
      }
      return item.title
    },
    [t],
  )

  const { activeSectionPath, activeIcon } = useMemo(() => {
    for (const section of headerMenuConfig) {
      const subItemActive =
        section.subMenu?.findIndex(
          (item) =>
            item.path === pathname ||
            pathname.slice(1) === item.path ||
            pathname.startsWith(`${item.path}/`),
        ) ?? -1

      if (
        pathname === section.path ||
        (pathname.startsWith(`${section.path}/`) &&
          !section.exclude?.includes(pathname)) ||
        subItemActive > -1
      ) {
        const activeSubItem = section.subMenu?.[subItemActive]
        return {
          activeSectionPath: section.path,
          activeIcon: activeSubItem?.icon ?? section.icon,
        }
      }
    }
    return { activeSectionPath: undefined, activeIcon: null }
  }, [headerMenuConfig, pathname])

  // Unique anchor name per ForDesktop instance (component can render twice)
  const instanceId = useId().replaceAll(/[^\da-z]/g, '')
  const navIconAnchor = `--nav-active-icon-${instanceId}`
  const navPillAnchor = `--nav-active-pill-${instanceId}`

  const supportsAnchor = useMemo(() => cssAnchorPositioningSupported(), [])

  const itemPillAnchorStyle = supportsAnchor
    ? ({ anchorName: navPillAnchor } as React.CSSProperties)
    : undefined
  const itemIconAnchorStyle = supportsAnchor
    ? ({ anchorName: navIconAnchor } as React.CSSProperties)
    : undefined

  const followersReady = !!activeSectionPath && supportsAnchor
  const pillFollowerStyle = supportsAnchor
    ? ({
        positionAnchor: navPillAnchor,
        top: 'calc(anchor(top) + 2px)',
        left: 'calc(anchor(left) + 2px)',
        width: 'calc(anchor-size(width) - 4px)',
        height: 'calc(anchor-size(height) - 4px)',
      } as React.CSSProperties)
    : undefined

  const iconFollowerStyle = useMemo((): React.CSSProperties => {
    const transition =
      'left 0.45s var(--ease-spring), top 0.45s var(--ease-spring), opacity 0.2s ease' as const
    if (!supportsAnchor) {
      return {
        position: 'absolute',
        opacity: 0,
        transition,
      }
    }
    return {
      position: 'absolute',
      positionAnchor: navIconAnchor,
      left: 'anchor(left)',
      top: 'anchor(center)',
      transform: 'translateY(-50%)',
      transition,
      opacity: followersReady ? 1 : 0,
    } as React.CSSProperties
  }, [followersReady, navIconAnchor, supportsAnchor])

  const renderMenuLabel = (isActive: boolean, title: string) => (
    <span
      className="relative flex items-center"
      style={isActive && animatedIcon ? itemIconAnchorStyle : undefined}
    >
      {isActive && animatedIcon && (
        <span aria-hidden className="mr-2 inline-block w-[1em] shrink-0" />
      )}
      <span>{title}</span>
    </span>
  )

  return (
    <>
      <NavigationMenu.Root
        closeDelay={150}
        delay={80}
        render={<nav />}
        value={menuValue}
        className={clsxm(
          'relative',
          'rounded-sm',
          solid
            ? 'bg-white dark:bg-neutral-900 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.12),0_2px_6px_-3px_rgba(0,0,0,0.06)] dark:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.4),0_2px_6px_-3px_rgba(0,0,0,0.25)]'
            : 'bg-white/[0.38] dark:bg-neutral-900/[0.38] backdrop-blur-lg',
          'border border-[rgba(200,180,160,0.08)] dark:border-neutral-700/20',
          'pointer-events-auto duration-200',
          shouldHideNavBg && 'bg-none! border-transparent!',
          className,
        )}
        onValueChange={handleValueChange}
      >
        <NavigationMenu.List className="flex list-none items-center px-2 font-medium text-neutral-9">
          {headerMenuConfig.map((section, index) => {
            const DropdownContent = section.type
              ? dropdownTypeMap[section.type]
              : undefined

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
              subItemActive > -1 ||
              false

            const activeSubItem = section.subMenu?.[subItemActive]
            const title = activeSubItem
              ? getTitle(activeSubItem)
              : getTitle(section)

            let href = section.path
            if (section.search) {
              href += `?${new URLSearchParams(section.search).toString()}`
            }

            const activeClass = 'text-neutral-9'
            const inactiveClass = 'text-neutral-7 hover:text-neutral-9'

            let menuItem: React.ReactNode

            if (DropdownContent) {
              menuItem = (
                <NavigationMenu.Item value={section.path}>
                  <NavigationMenu.Trigger
                    nativeButton={false}
                    style={isActive ? itemPillAnchorStyle : undefined}
                    className={clsxm(
                      'relative z-[1] inline-flex cursor-pointer items-center whitespace-nowrap border-none bg-transparent px-3 py-1.5 transition-colors duration-200',
                      isActive ? activeClass : inactiveClass,
                    )}
                    render={
                      <Link
                        href={href}
                        // Hover opens the mega menu only; clicks follow the Link (closes panel).
                        // Base UI merges render props before internal handlers — use preventBaseUIHandler
                        // so pointer/click handlers from useClick + Trigger do not keep the viewport open (#9).
                        onClick={(
                          e: BaseUIEvent<React.MouseEvent<HTMLAnchorElement>>,
                        ) => {
                          section.do?.(e as React.MouseEvent<HTMLAnchorElement>)
                          e.preventBaseUIHandler()
                          setMenuValue(null)
                        }}
                        onMouseDown={(
                          e: BaseUIEvent<React.MouseEvent<HTMLAnchorElement>>,
                        ) => {
                          e.preventBaseUIHandler()
                        }}
                      />
                    }
                  >
                    {renderMenuLabel(isActive, title)}
                  </NavigationMenu.Trigger>
                  <NavigationMenu.Content className="nav-menu-content">
                    <DropdownContent section={section} />
                  </NavigationMenu.Content>
                </NavigationMenu.Item>
              )
            } else {
              const isExternal = href.startsWith('http')
              menuItem = (
                <NavigationMenu.Item>
                  <NavigationMenu.Link
                    active={isActive}
                    style={isActive ? itemPillAnchorStyle : undefined}
                    className={clsxm(
                      'relative z-[1] block whitespace-nowrap px-3 py-1.5 transition-colors duration-200',
                      isActive ? activeClass : inactiveClass,
                    )}
                    render={
                      isExternal ? (
                        <a href={href} target="_blank" />
                      ) : (
                        <Link href={href} onClick={section.do} />
                      )
                    }
                  >
                    {renderMenuLabel(isActive, title)}
                  </NavigationMenu.Link>
                </NavigationMenu.Item>
              )
            }

            return (
              <React.Fragment key={section.path}>
                {index > 0 && <NavSeparator />}
                {menuItem}
              </React.Fragment>
            )
          })}
        </NavigationMenu.List>

        {/* Active background pill — follows the active nav item via CSS anchor positioning */}
        <span
          aria-hidden
          style={pillFollowerStyle}
          className={clsxm(
            'pointer-events-none absolute z-0 rounded-[2px]',
            'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.10),0_0_0_0.5px_rgba(0,0,0,0.06)]',
            'dark:bg-white/[0.12] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.05)]',
            '[transition:left_0.45s_var(--ease-spring),width_0.45s_var(--ease-spring),opacity_0.2s_ease]',
            activeSectionPath && followersReady ? 'opacity-100' : 'opacity-0',
          )}
        />

        {animatedIcon && (
          <span
            aria-hidden
            className="pointer-events-none absolute z-[2] flex items-center"
            style={iconFollowerStyle}
          >
            {activeIcon}
          </span>
        )}

        <NavigationMenu.Portal>
          <NavigationMenu.Positioner
            align={menuValue === '/' ? 'start' : 'center'}
            className="nav-menu-positioner"
            positionMethod="fixed"
            side="bottom"
            sideOffset={12}
          >
            <NavigationMenu.Popup
              className={clsxm(
                'nav-menu-popup',
                'select-none rounded bg-[var(--color-root-bg)] dark:bg-neutral-900 outline-hidden',
                'border border-[rgba(200,180,160,0.08)] dark:border-neutral-700/20',
                'shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]',
                'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
              )}
            >
              <NavigationMenu.Viewport className="nav-menu-viewport" />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    </>
  )
}
