'use client'

import { Select as SelectImpl } from '@base-ui/react/select'
import type { PropsWithChildren } from 'react'
import * as React from 'react'

import { clsxm } from '~/lib/helper'

export type SelectValue<T> = {
  value: T
  label: string
}

interface SelectProps<T> {
  isLoading?: boolean
  onChange: (
    value: T,
    item: {
      value: T
      label: string
    },
  ) => void
  placeholder?: string

  value: T
  values: SelectValue<T>[]
}

export const Select = function Select<T>(
  props: SelectProps<T> & {
    className?: string
  },
) {
  const { value, className, values, onChange, isLoading, placeholder } = props

  return (
    <SelectImpl.Root
      items={values}
      value={value as any}
      onValueChange={(next) => {
        if (next == null) return
        const item = values.find((item) => Object.is(item.value, next))
        if (!item) return
        onChange(next as T, item)
      }}
    >
      <SelectImpl.Trigger
        className={clsxm(
          'border-border inline-flex w-full items-center justify-between gap-1 rounded-lg border',
          'p-2',
          'text-[0.9em]',

          className,
        )}
      >
        <SelectImpl.Value placeholder={placeholder} />
        <SelectImpl.Icon className="flex items-center">
          {isLoading ? (
            <i className="i-mingcute-loading-line animate-spin" />
          ) : (
            <i className="i-mingcute-down-line" />
          )}
        </SelectImpl.Icon>
      </SelectImpl.Trigger>
      <SelectImpl.Portal>
        <SelectImpl.Positioner
          alignItemWithTrigger={false}
          className="z-[1990]"
          sideOffset={4}
        >
          <SelectImpl.Popup
            className="rounded-lg border border-neutral-3 bg-neutral-1/80 backdrop-blur"
            style={{ width: 'var(--anchor-width)' }}
          >
            <SelectImpl.ScrollUpArrow className="flex h-3 items-center justify-center">
              <i className="i-mingcute-up-line" />
            </SelectImpl.ScrollUpArrow>
            <SelectImpl.List>
              {values.map((item) => (
                <SelectItem key={item.label + item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectImpl.List>
            <SelectImpl.ScrollDownArrow className="flex h-3 items-center justify-center">
              <i className="i-mingcute-down-line" />
            </SelectImpl.ScrollDownArrow>
          </SelectImpl.Popup>
        </SelectImpl.Positioner>
      </SelectImpl.Portal>
    </SelectImpl.Root>
  )
}

const SelectItem = ({
  ref: forwardedRef,
  children,
  ...props
}: PropsWithChildren<React.ComponentPropsWithoutRef<typeof SelectImpl.Item>> & {
  ref?: React.RefObject<HTMLDivElement | null>
}) => (
  <SelectImpl.Item
    className="flex cursor-auto items-center justify-between rounded-xs px-3 py-1 hover:bg-neutral-3 data-[highlighted]:bg-neutral-3"
    {...props}
    ref={forwardedRef as any}
  >
    <SelectImpl.ItemText className="pointer-events-none min-w-0 select-none truncate">
      {children}
    </SelectImpl.ItemText>

    <SelectImpl.ItemIndicator keepMounted className="shrink-0">
      <i className="i-mingcute-check-line" />
    </SelectImpl.ItemIndicator>
  </SelectImpl.Item>
)

SelectItem.displayName = 'SelectItem'
