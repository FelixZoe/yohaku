export const PAYWALL_INTENT_KEY = 'yohaku:paywall-intent'

export type PaywallIntent =
  | { type: 'paywall'; path: string }
  | { type: 'membership'; path: string }
  | { type: 'article-purchase'; path: string; postId: string }

export const readPaywallIntent = (): PaywallIntent | null => {
  try {
    const raw = sessionStorage.getItem(PAYWALL_INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.type === 'string' && typeof parsed?.path === 'string'
      ? (parsed as PaywallIntent)
      : null
  } catch {
    return null
  }
}

export const writePaywallIntent = (intent: PaywallIntent | null) => {
  try {
    if (intent === null) sessionStorage.removeItem(PAYWALL_INTENT_KEY)
    else sessionStorage.setItem(PAYWALL_INTENT_KEY, JSON.stringify(intent))
  } catch {}
}
