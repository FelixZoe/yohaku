'use client'

import type { HTMLMotionProps } from 'motion/react'
import { m } from 'motion/react'

export const MotionButtonBase = ({
  ref,
  children,
  ...rest
}: HTMLMotionProps<'button'>) => (
  <m.button {...rest} ref={ref}>
    {children}
  </m.button>
)

MotionButtonBase.displayName = 'MotionButtonBase'
