'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import clsx from 'clsx'
import { AnimatePresence, m } from 'motion/react'
import type { FC } from 'react'
import { useCallback, useId, useState } from 'react'

type CheckboxValue = boolean | 'indeterminate'

type CheckboxProps = Omit<
  React.ComponentProps<typeof CheckboxPrimitive.Root>,
  'checked' | 'defaultChecked' | 'onCheckedChange' | 'indeterminate'
> & {
  className?: string
  checked?: CheckboxValue
  defaultChecked?: CheckboxValue
  onCheckedChange?: (checked: CheckboxValue) => void
}

const Checkbox: FC<CheckboxProps> = ({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}) => {
  const [internal, setInternal] = useState<CheckboxValue>(
    checked ?? defaultChecked ?? false,
  )

  const currentValue = checked !== undefined ? checked : internal
  const isIndeterminate = currentValue === 'indeterminate'
  const isChecked = currentValue === true

  const handleChange = useCallback(
    (next: boolean) => {
      const normalized: CheckboxValue = next
      setInternal(normalized)
      onCheckedChange?.(normalized)
    },
    [onCheckedChange],
  )

  return (
    <CheckboxPrimitive.Root
      nativeButton
      checked={isChecked}
      disabled={disabled}
      indeterminate={isIndeterminate}
      className={clsx(
        'inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[checked]:border-accent data-[checked]:bg-accent data-[checked]:text-white',
        'data-[indeterminate]:border-accent data-[indeterminate]:bg-accent data-[indeterminate]:text-white',
        'data-[unchecked]:border-neutral-4 data-[unchecked]:bg-neutral-1',
        className,
      )}
      render={
        <m.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
        />
      }
      onCheckedChange={handleChange}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isChecked && (
          <CheckboxPrimitive.Indicator
            keepMounted
            render={
              <m.svg
                animate="checked"
                className="size-3"
                exit="unchecked"
                fill="none"
                initial="unchecked"
                stroke="currentColor"
                strokeWidth="3.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              />
            }
          >
            <m.path
              d="M4.5 12.75l6 6 9-13.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={{
                checked: {
                  pathLength: 1,
                  opacity: 1,
                  transition: { duration: 0.2, delay: 0.1 },
                },
                unchecked: {
                  pathLength: 0,
                  opacity: 0,
                  transition: { duration: 0.15 },
                },
              }}
            />
          </CheckboxPrimitive.Indicator>
        )}
        {isIndeterminate && (
          <CheckboxPrimitive.Indicator
            keepMounted
            render={
              <m.svg
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              />
            }
          >
            <m.line
              initial={{ pathLength: 0, opacity: 0 }}
              strokeLinecap="round"
              x1="5"
              x2="19"
              y1="12"
              y2="12"
              animate={{
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.2 },
              }}
            />
          </CheckboxPrimitive.Indicator>
        )}
      </AnimatePresence>
    </CheckboxPrimitive.Root>
  )
}

const CheckBoxLabel: FC<{
  label: string
  checked?: boolean
  onCheckChange?: (checked: boolean) => void
  disabled?: boolean
}> = ({ label, checked, disabled, onCheckChange }) => {
  const id = useId()
  return (
    <div className="inline-flex items-center gap-2">
      <Checkbox
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={(v) => {
          if (typeof v === 'boolean') onCheckChange?.(v)
        }}
      />
      <label
        htmlFor={id}
        className={clsx(
          'cursor-default select-none text-copy-13 text-neutral-7',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {label}
      </label>
    </div>
  )
}

export { Checkbox, CheckBoxLabel }
