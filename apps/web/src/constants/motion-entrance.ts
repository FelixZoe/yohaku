// LCP-safe entrance animations.
//
// Chrome's LCP algorithm only counts an element as painted when computed
// opacity > 0. Starting a motion entrance at `opacity: 0` means the largest
// element on the page isn't a valid LCP candidate until hydration completes
// and the first animation frame runs — which on slow networks pushes LCP into
// the 20-30s range. Starting at `opacity: 0.001` is visually indistinguishable
// from 0 but counts as painted, so LCP fires on the initial frame.

const EASING = [0.22, 1, 0.36, 1] as const

export const LCP_SAFE_OPACITY = 0.001

export const riseInLcpSafe = (
  delay = 0,
  opts: { y?: number; duration?: number } = {},
) => ({
  initial: { opacity: LCP_SAFE_OPACITY, y: opts.y ?? 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: opts.duration ?? 0.6, ease: EASING, delay },
})

export const fadeInLcpSafe = (delay = 0, opts: { duration?: number } = {}) => ({
  initial: { opacity: LCP_SAFE_OPACITY },
  animate: { opacity: 1 },
  transition: { duration: opts.duration ?? 1, ease: EASING, delay },
})

// Use for LCP-sized elements (e.g. hero h1) where any transform-driven
// position change can register against CLS. Opacity-only entrance.
export const fadeOnlyInLcpSafe = (
  delay = 0,
  opts: { duration?: number } = {},
) => ({
  initial: { opacity: LCP_SAFE_OPACITY },
  animate: { opacity: 1 },
  transition: { duration: opts.duration ?? 0.6, ease: EASING, delay },
})
