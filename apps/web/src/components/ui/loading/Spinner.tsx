import type { FC } from 'react'

import { clsxm } from '~/lib/helper'

interface SpinnerProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const Spinner: FC<SpinnerProps> = ({
  size = 16,
  className,
  strokeWidth = 2.6,
}) => (
  <svg
    aria-hidden
    className={clsxm('shrink-0 animate-spin', className)}
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    <circle
      cx="12"
      cy="12"
      opacity="0.25"
      r="10"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <path
      d="M22 12a10 10 0 0 0-10-10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={strokeWidth}
    />
  </svg>
)

Spinner.displayName = 'Spinner'
