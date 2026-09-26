'use client'

import type { FC, ReactNode } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { SlotText } from '~/components/ui/slot-text'
import { clsxm } from '~/lib/helper'

interface KvOption {
  label: string
  value: string
}

export const FooterKv: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <span className="inline-flex items-baseline gap-1.5">
    <span className="text-neutral-6">{label}</span>
    {children}
  </span>
)

export const footerKvValueClass =
  'border-b border-transparent text-neutral-8 transition-colors duration-200 hover:border-neutral-5 data-[popup-open]:border-neutral-5'

export const FooterKvMenu: FC<{
  label: string
  value: string
  displayValue?: string
  options: KvOption[]
  onSelect: (value: string) => void
  disabled?: boolean
}> = ({ label, value, displayValue, options, onSelect, disabled }) => {
  const current = options.find((o) => o.value === value)

  return (
    <FooterKv label={label}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className={clsxm(footerKvValueClass, disabled && 'opacity-50')}
            disabled={disabled}
            type="button"
          >
            <SlotText text={displayValue ?? current?.label ?? value} />
            <i className="i-mingcute-down-line ml-0.5 align-[-2px] text-label-12 text-neutral-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" sideOffset={8}>
          {options.map((o) => (
            <DropdownMenuItem
              key={o.value}
              className={
                o.value === value ? 'text-neutral-9' : 'text-neutral-7'
              }
              onClick={() => onSelect(o.value)}
            >
              <span
                className={clsxm(
                  'mr-2 inline-block size-1 rounded-full',
                  o.value === value ? 'bg-accent' : 'bg-transparent',
                )}
              />
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </FooterKv>
  )
}
