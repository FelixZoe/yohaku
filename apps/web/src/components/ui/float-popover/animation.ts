import type { MotionProps, TargetAndTransition } from 'motion/react'

const POPOVER_EASING = [0.22, 1, 0.36, 1] as const

type PlacementDirection = 'top' | 'bottom' | 'left' | 'right'

const originMap: Record<PlacementDirection, string> = {
  bottom: 'center top',
  top: 'center bottom',
  right: 'left center',
  left: 'right center',
}

export function getPopoverAnimationConfig(placement: string): MotionProps & {
  style: { transformOrigin: string }
} {
  const dir = (placement.split('-')[0] || 'bottom') as PlacementDirection
  const isHorizontal = dir === 'left' || dir === 'right'

  const initial: TargetAndTransition = isHorizontal
    ? { scaleX: 0.8, opacity: 0 }
    : { scaleY: 0.8, opacity: 0 }

  const animate: TargetAndTransition = isHorizontal
    ? { scaleX: 1, opacity: 1 }
    : { scaleY: 1, opacity: 1 }

  const exit: TargetAndTransition = isHorizontal
    ? {
        scaleX: 0.8,
        opacity: 0,
        transition: { duration: 0.18, ease: POPOVER_EASING },
      }
    : {
        scaleY: 0.8,
        opacity: 0,
        transition: { duration: 0.18, ease: POPOVER_EASING },
      }

  return {
    initial,
    animate,
    exit,
    transition: { duration: 0.25, ease: POPOVER_EASING },
    style: { transformOrigin: originMap[dir] },
  }
}
