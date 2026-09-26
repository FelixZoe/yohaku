'use client'

import type { HTMLMotionProps } from 'motion/react'
import { useTranslations } from 'next-intl'

import { MotionButtonBase } from '~/components/ui/button'
import { FloatPopover } from '~/components/ui/float-popover'
import {
  fieldBaseClassName,
  fieldWrapperFocusClassName,
} from '~/components/ui/input/styles'
import { useIsClient } from '~/hooks/common/use-is-client'
import { clsxm } from '~/lib/helper'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

import { DonateContent } from './AsideDonateButton'

interface AsideActionBaseProps {
  active?: boolean
  activeColor?: string
  count?: number
  iconClass: string
  iconClassActive?: string
  label: string
  onClick?: () => void
}

type AsideActionButtonProps = AsideActionBaseProps &
  Omit<HTMLMotionProps<'button'>, keyof AsideActionBaseProps | 'children'>

export const AsideActionTab = ({
  iconClass,
  iconClassActive,
  label,
  count,
  active,
  activeColor,
  onClick,
  ...buttonProps
}: AsideActionButtonProps) => {
  const { className, ...restButtonProps } = buttonProps

  return (
    <MotionButtonBase
      {...restButtonProps}
      aria-label={label}
      aria-pressed={active}
      className={clsxm(
        'group relative flex items-center',
        'h-11',
        'w-auto max-w-11 overflow-hidden hover:max-w-44 focus-visible:max-w-44',
        'rounded-l-none rounded-r-xl',
        'border-l-0!',
        fieldBaseClassName,
        fieldWrapperFocusClassName,
        'transition-all duration-300 ease-out',
        active && 'bg-neutral-4/10',
        'focus:outline-hidden',
        className,
      )}
      onClick={onClick}
    >
      <span
        className={clsxm(
          'flex h-full w-11 shrink-0 items-center justify-center',
          'text-copy-16 transition-all duration-300',
          'group-hover:scale-110 group-focus-visible:scale-110',
          !active && [
            'text-neutral-5',
            'group-hover:text-neutral-6 group-focus-visible:text-neutral-6',
          ],
          active && (activeColor ?? 'text-neutral-6'),
        )}
      >
        <i
          className={active && iconClassActive ? iconClassActive : iconClass}
        />
      </span>

      <span
        className={clsxm(
          'flex items-center gap-2 pr-4',
          'whitespace-nowrap text-label-12 leading-none font-medium text-neutral-6',
          'opacity-0 -translate-x-2 transition-all duration-300',
          'group-hover:translate-x-0 group-hover:opacity-100',
          'group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
        )}
      >
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-label-12 text-neutral-4">{count}</span>
        )}
      </span>
    </MotionButtonBase>
  )
}

export const AsideActionMark = ({
  active,
  activeColor = 'text-accent',
  count,
  iconClass,
  iconClassActive,
  label,
  onClick,
  ...buttonProps
}: AsideActionButtonProps) => {
  const { className, ...restButtonProps } = buttonProps

  return (
    <MotionButtonBase
      {...restButtonProps}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={clsxm(
        'group relative flex h-10 items-center gap-3 px-2',
        'rounded-lg border-none transition-all duration-200',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800/50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        className,
      )}
      onClick={onClick}
    >
      <span
        className={clsxm(
          'flex items-center justify-center text-title-20 transition-all duration-200',
          active ? activeColor : 'text-neutral-500 dark:text-neutral-400',
          !active &&
            'group-hover:text-neutral-700 dark:group-hover:text-neutral-200',
          'group-hover:scale-110',
        )}
      >
        <i
          className={active && iconClassActive ? iconClassActive : iconClass}
        />
      </span>

      {count !== undefined && (
        <span
          className={clsxm(
            'text-copy-13 font-medium tabular-nums',
            active ? activeColor : 'text-neutral-500 dark:text-neutral-400',
          )}
        >
          {count}
        </span>
      )}

      <span
        className={clsxm(
          'max-w-0 overflow-hidden whitespace-nowrap text-copy-13',
          'opacity-0 -translate-x-2 transition-all duration-200',
          active ? activeColor : 'text-neutral-500 dark:text-neutral-400',
          'group-hover:max-w-[180px] group-hover:translate-x-0 group-hover:opacity-100',
        )}
      >
        {label}
      </span>
    </MotionButtonBase>
  )
}

interface AsideDonatePopoverProps {
  triggerElement: React.ReactElement
}

export const AsideDonatePopover = ({
  triggerElement,
}: AsideDonatePopoverProps) => (
  <FloatPopover
    asChild
    offset={16}
    placement="left"
    popoverClassNames="w-fit max-w-none px-5 py-4"
    popoverWrapperClassNames="z-[120]"
    strategy="fixed"
    trigger="hover"
    triggerElement={triggerElement}
  >
    <DonateContent />
  </FloatPopover>
)

export const useDonateAction = () => {
  const t = useTranslations('common')
  const isClient = useIsClient()
  const donate = useAppConfigSelector((config) => config.module?.donate)

  return {
    canRender: isClient && !!donate?.enable,
    donateLabel: t('aria_donate'),
    openDonate: () => {
      if (!donate?.link) return
      window.open(donate.link, '_blank')
    },
  }
}
