const MAX_DELAY_MS = 24 * 60 * 60 * 1000
const GRACE_MS = 1000

export const scheduleFreeWindowExpiry = (
  freeUntil: string,
  onExpire: () => void,
  now = Date.now(),
): (() => void) | undefined => {
  const until = new Date(freeUntil).getTime()
  if (Number.isNaN(until)) return
  const delay = Math.max(0, until - now)
  if (delay > MAX_DELAY_MS) return
  const timer = setTimeout(onExpire, delay + GRACE_MS)
  return () => clearTimeout(timer)
}
