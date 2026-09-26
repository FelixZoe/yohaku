'use client'

import { LayoutGroup, m } from 'motion/react'
import type { ReactNode } from 'react'
import { useId } from 'react'

import { MotionButtonBase } from '~/components/ui/button/MotionButton'
import { clsxm } from '~/lib/helper'

export interface SegmentedOption<T> {
  description?: string
  icon?: string
  label?: ReactNode
  labelHiddenOnMobile?: boolean
  value: T
}

export interface SegmentedProps<T> {
  ariaLabel?: string
  className?: string
  onChange: (next: T) => void
  options: SegmentedOption<T>[]
  value: T
}

const indicatorSpring = {
  damping: 32,
  mass: 0.8,
  stiffness: 380,
  type: 'spring' as const,
}

export function Segmented<T extends string | number>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: SegmentedProps<T>) {
  const layoutId = useId()
  return (
    <LayoutGroup id={layoutId}>
      <div
        aria-label={ariaLabel}
        role="radiogroup"
        className={clsxm(
          'relative inline-flex items-center rounded-full p-1',
          'bg-neutral-1/60 backdrop-blur',
          'border border-black/[0.04] dark:border-white/[0.06]',
          className,
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <MotionButtonBase
              aria-checked={active}
              key={String(opt.value)}
              role="radio"
              title={opt.description}
              type="button"
              className={clsxm(
                'relative inline-flex select-none items-center gap-1.5',
                'rounded-full px-3 py-1.5 text-label-12 font-medium',
                'transition-colors duration-200',
                active ? 'text-accent' : 'text-neutral-7 hover:text-neutral-9',
              )}
              onClick={() => onChange(opt.value)}
            >
              {active && (
                <m.span
                  layoutId={`${layoutId}-indicator`}
                  transition={indicatorSpring}
                  className={clsxm(
                    'absolute inset-0 -z-1 rounded-full',
                    'bg-accent/10 ring-1 ring-accent/20',
                    'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
                  )}
                />
              )}
              {opt.icon ? (
                <i
                  aria-hidden
                  className={clsxm(opt.icon, 'shrink-0 text-copy-14')}
                />
              ) : null}
              {opt.label !== undefined && opt.label !== null ? (
                <span
                  className={
                    opt.labelHiddenOnMobile ? 'hidden sm:inline' : undefined
                  }
                >
                  {opt.label}
                </span>
              ) : null}
            </MotionButtonBase>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
