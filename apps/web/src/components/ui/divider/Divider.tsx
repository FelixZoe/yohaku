import type { DetailedHTMLProps, FC, HTMLAttributes } from 'react'
import * as React from 'react'

import { clsxm } from '~/lib/helper'

export const Divider: FC<
  DetailedHTMLProps<HTMLAttributes<HTMLHRElement>, HTMLHRElement>
> = (props) => {
  const { className, ...rest } = props
  return (
    <hr
      className={clsxm(
        'my-4 h-[0.5px] border-0 bg-neutral-10/30',
        className,
      )}
      {...rest}
    />
  )
}

export const DividerVertical: FC<
  DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
> = (props) => {
  const { className, ...rest } = props
  return (
    <span
      className={clsxm(
        'mx-4 inline-block h-full w-[0.5px] select-none bg-neutral-10/30 text-transparent',
        className,
      )}
      {...rest}
    >
      w
    </span>
  )
}

export const BreadcrumbDivider: Component = ({ className }) => (
  <svg
    className={className}
    color="currentColor"
    fill="none"
    height="24"
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    width="24"
  >
    <path d="M16.88 3.549L7.12 20.451" />
  </svg>
)
