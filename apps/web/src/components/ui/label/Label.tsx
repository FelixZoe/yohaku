import * as React from 'react'

import { clsxm } from '~/lib/helper'

import { useLabelPropsContext } from './LabelContext'

export const Label = ({
  ref,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  ref?: React.RefObject<HTMLLabelElement | null>
}) => {
  const propsCtx = useLabelPropsContext()

  return (
    <label
      ref={ref}
      className={clsxm(
        'text-foreground-600 text-[1em] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
        propsCtx.className,
      )}
      {...props}
    />
  )
}
Label.displayName = 'Label'
