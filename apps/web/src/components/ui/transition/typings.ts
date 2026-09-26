import type { HTMLMotionProps, m, TargetAndTransition } from 'motion/react'

export interface BaseTransitionProps extends Omit<
  HTMLMotionProps<'div'>,
  'ref'
> {
  animation?: {
    enter?: TargetAndTransition['transition']
    exit?: TargetAndTransition['transition']
  }

  as?: keyof typeof m

  delay?: number

  duration?: number

  lcpOptimization?: boolean
  timeout?: {
    exit?: number
    enter?: number
  }
}
