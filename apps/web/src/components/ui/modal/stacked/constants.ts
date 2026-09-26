import type { MotionProps } from 'motion/react'

const MODAL_EASING = [0.22, 1, 0.36, 1] as const

export const modalMontionConfig: MotionProps = {
  initial: { scaleY: 0.8, opacity: 0 },
  animate: { scaleY: 1, opacity: 1 },
  exit: {
    scaleY: 0.8,
    opacity: 0,
    transition: { duration: 0.2, ease: MODAL_EASING },
  },
  transition: { duration: 0.3, ease: MODAL_EASING },
}

export const MODAL_STACK_Z_INDEX = 100
