import { Switch as SwitchPrimitives } from '@base-ui/react/switch'
import * as React from 'react'

import { clsxm } from '~/lib/helper'

import { Label } from '../label/Label'

export const Switch = ({
  ref,
  className,
  thumbClassName,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
  ref?: React.RefObject<React.ElementRef<typeof SwitchPrimitives.Root> | null>
  thumbClassName?: string
}) => (
  <SwitchPrimitives.Root
    className={clsxm(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[checked]:bg-accent data-[unchecked]:bg-neutral-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-1 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={clsxm(
        'pointer-events-none block size-5 rounded-full bg-neutral-1 shadow-lg ring-0 transition-transform data-[checked]:translate-x-5 data-[unchecked]:translate-x-0',
        thumbClassName,
      )}
    />
  </SwitchPrimitives.Root>
)
Switch.displayName = SwitchPrimitives.Root.displayName

export const LabelSwitch: Component<{
  label?: React.ReactNode

  checked?: boolean
  onCheckedChange?: (checked: boolean) => void

  disabled?: boolean
  /**
   * Label placement
   */
  placement?: 'left' | 'right'
}> = (props) => {
  const {
    label,
    checked,
    onCheckedChange,
    placement = 'left',
    className,
    children,
    disabled,
  } = props
  const id = React.useId()
  const labelEl = <Label htmlFor={id}>{children ?? label}</Label>
  return (
    <div
      className={clsxm(
        'flex items-center justify-between space-x-2 text-[1em]',
        disabled && 'cursor-not-allowed opacity-80',
        className,
      )}
    >
      {placement === 'left' ? labelEl : null}
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      />
      {placement === 'right' ? labelEl : null}
    </div>
  )
}
