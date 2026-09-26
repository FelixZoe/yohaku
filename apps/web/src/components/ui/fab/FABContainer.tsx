'use client'

import clsx from 'clsx'
import { typescriptHappyForwardRef } from 'foxact/typescript-happy-forward-ref'
import { atom, useAtomValue } from 'jotai'
import type { HTMLMotionProps } from 'motion/react'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type * as React from 'react'
import type { JSX, PropsWithChildren, ReactNode } from 'react'
import { useCallback, useEffect, useId } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { clsxm } from '~/lib/helper'
import { jotaiStore } from '~/lib/store'
import { usePageScrollDirectionSelector } from '~/providers/root/page-scroll-info-provider'

import { RootPortal } from '../portal'

const fabContainerElementAtom = atom(null as HTMLDivElement | null)
const FABBase = typescriptHappyForwardRef(
  (
    props: PropsWithChildren<
      {
        id: string
        show?: boolean
        children: JSX.Element
      } & HTMLMotionProps<'button'>
    >,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    const t = useTranslations('common')
    const { children, show = true, ...extra } = props
    const { className, ...rest } = extra

    return (
      <AnimatePresence initial={false}>
        {show && (
          <m.div
            className="mt-2 overflow-hidden"
            style={{ transformOrigin: 'right center' }}
            animate={{
              opacity: 1,
              width: 48,
            }}
            exit={{
              opacity: 0,
              width: 0,
            }}
            initial={{
              opacity: 0,
              width: 0,
            }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <m.button
              aria-label={rest['aria-label'] || t('aria_fab')}
              ref={ref}
              whileTap={{ scale: 0.97 }}
              className={clsxm(
                'group relative flex h-14 w-12 items-center justify-center overflow-hidden rounded-l-2xl border border-r-0 pr-1',
                'border-black/8 bg-paper/95 text-neutral-6',
                'transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:bg-black/[0.02] hover:text-neutral-9',
                'active:bg-black/[0.04]',
                'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-black/10',
                'dark:border-white/10 dark:bg-paper/95 dark:text-neutral-4 dark:hover:bg-white/4 dark:hover:text-neutral-1 dark:active:bg-white/6 dark:focus-visible:ring-white/12',
                className,
              )}
              {...rest}
            >
              <span className="relative flex text-copy-16 opacity-75 transition-opacity duration-200 group-hover:opacity-100">
                {children}
              </span>
            </m.button>
          </m.div>
        )}
      </AnimatePresence>
    )
  },
)

export const FABPortable = typescriptHappyForwardRef(
  (
    props: Omit<HTMLMotionProps<'button'>, 'children' | 'onClick'> & {
      children: React.JSX.Element

      onClick: () => void
      onlyShowInMobile?: boolean
      show?: boolean
    },
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    const { onClick, children, show = true, ...buttonProps } = props
    const id = useId()
    const portalElement = useAtomValue(fabContainerElementAtom, {
      store: jotaiStore,
    })
    const isMobile = useIsMobile()
    if (!isMobile) return null
    if (!portalElement) return null

    return (
      <RootPortal to={portalElement}>
        <FABBase
          id={id}
          ref={ref}
          show={show}
          onClick={onClick}
          {...buttonProps}
        >
          {children}
        </FABBase>
      </RootPortal>
    )
  },
)

export const FABContainer = (props: { children?: ReactNode }) => {
  const isMobile = useIsMobile()
  const handleContainerRef = useCallback(
    (el: HTMLDivElement) => jotaiStore.set(fabContainerElementAtom, el),
    [],
  )

  useEffect(() => {
    if (!isMobile) {
      jotaiStore.set(fabContainerElementAtom, null)
    }
  }, [isMobile])

  const shouldHide = usePageScrollDirectionSelector(
    (direction) => isMobile && direction === 'down',
    [isMobile],
  )

  if (!isMobile) return null

  return (
    <m.div
      data-hide-print
      data-testid="fab-container"
      initial={false}
      ref={handleContainerRef}
      animate={{
        opacity: shouldHide ? 0 : 1,
        y: shouldHide ? 12 : 0,
        pointerEvents: shouldHide ? 'none' : 'auto',
      }}
      className={clsx(
        'fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(0px,env(safe-area-inset-right))] z-[9] flex flex-col items-end overflow-x-clip',
      )}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {props.children}
    </m.div>
  )
}
