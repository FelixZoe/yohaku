export type CapsuleOverlay = 'expanded' | 'lang' | 'menu' | 'none' | 'tts'
export type CapsuleVisualState =
  'dot' | 'expanded' | 'idle' | 'lang' | 'menu' | 'narrating' | 'ticket'
export type CapsuleScrollAction = 'collapse' | 'none' | 'restore'

export const COLLAPSE_SCROLL_THRESHOLD = 160
export const COLLAPSE_SCROLL_DELTA = 2
export const COLLAPSE_IDLE_RESTORE_MS = 1200

export const resolveCapsuleState = ({
  collapsed,
  hasLive,
  isNarrating = false,
  overlay,
}: {
  collapsed: boolean
  hasLive: boolean
  isNarrating?: boolean
  overlay: CapsuleOverlay
}): CapsuleVisualState => {
  const effectiveOverlay = overlay === 'expanded' && !hasLive ? 'none' : overlay
  if (effectiveOverlay === 'menu') return 'menu'
  if (effectiveOverlay === 'lang') return 'lang'
  if (effectiveOverlay === 'expanded') return 'expanded'
  if (effectiveOverlay === 'tts') return 'narrating'
  if (collapsed) return 'dot'
  if (isNarrating) return 'narrating'
  return hasLive ? 'ticket' : 'idle'
}

export const toggleMenuOverlay = (overlay: CapsuleOverlay): CapsuleOverlay =>
  overlay === 'none' ? 'menu' : 'none'

export const overlayOnPrimaryTap = (
  overlay: CapsuleOverlay,
  hasLive: boolean,
  isNarrating = false,
): CapsuleOverlay => {
  if (overlay !== 'none') return 'none'
  if (isNarrating) return 'tts'
  return hasLive ? 'expanded' : 'menu'
}

export const resolveScrollAction = (
  y: number,
  delta: number,
  threshold = COLLAPSE_SCROLL_THRESHOLD,
): CapsuleScrollAction => {
  if (y <= threshold) return 'restore'
  if (delta > COLLAPSE_SCROLL_DELTA) return 'collapse'
  if (delta < -COLLAPSE_SCROLL_DELTA) return 'restore'
  return 'none'
}
