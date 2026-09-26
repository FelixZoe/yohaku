'use client'

import { SlotText } from '~/components/ui/slot-text'

export const NumberSmoothTransition = (props: {
  children: string | number
}) => {
  const { children } = props
  const value = typeof children === 'string' ? Number(children) || 0 : children
  return (
    <SlotText
      style={{ fontVariantNumeric: 'tabular-nums' }}
      text={String(value)}
    />
  )
}
