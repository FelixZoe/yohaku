import type { Transition } from 'motion/react'

export const microReboundPreset: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
}

export const softSpringPreset: Transition = {
  duration: 0.35,
  type: 'spring',
  stiffness: 120,
  damping: 20,
}

export const softBouncePreset: Transition = {
  type: 'spring',
  damping: 10,
  stiffness: 100,
}
/**
 * A smooth spring with a predefined duration and no bounce.
 */
const smoothPreset: Transition = {
  type: 'spring',
  duration: 0.4,
  bounce: 0,
}

/**
 * A spring with a predefined duration and small amount of bounce that feels more snappy.
 */
const snappyPreset: Transition = {
  type: 'spring',
  duration: 0.4,
  bounce: 0.15,
}

/**
 * A spring with a predefined duration and higher amount of bounce.
 */
const bouncyPreset: Transition = {
  type: 'spring',
  duration: 0.4,
  bounce: 0.3,
}
class SpringPresets {
  smooth = smoothPreset
  snappy = snappyPreset
  bouncy = bouncyPreset
}
class SpringStatic {
  presets = new SpringPresets()

  /**
   * A smooth spring with a predefined duration and no bounce that can be tuned.
   *
   * @param duration The perceptual duration, which defines the pace of the spring.
   * @param extraBounce How much additional bounce should be added to the base bounce of 0.
   */
  smooth(duration = 0.4, extraBounce = 0): Transition {
    return {
      type: 'spring',
      duration,
      bounce: extraBounce,
    }
  }

  /**
   * A spring with a predefined duration and small amount of bounce that feels more snappy.
   */
  snappy(duration = 0.4, extraBounce = 0): Transition {
    return {
      type: 'spring',
      duration,
      bounce: 0.15 + extraBounce,
    }
  }

  /**
   * A spring with a predefined duration and higher amount of bounce that can be tuned.
   */
  bouncy(duration = 0.4, extraBounce = 0): Transition {
    return {
      type: 'spring',
      duration,
      bounce: 0.3 + extraBounce,
    }
  }
}

const SpringClass = new SpringStatic()
export { SpringClass as Spring }

/**
 * Unified staggered list entrance animation constants.
 * Used across Post List, Thinking, Says, Friends, etc.
 */
export const staggeredEntrance = {
  initial: { opacity: 0.001, y: 8 },
  animate: { opacity: 1, y: 0 },
  preset: softSpringPreset,
  staggerMs: 60,
  transition: (index: number) => ({
    ...softSpringPreset,
    delay: index * 0.06,
  }),
} as const
