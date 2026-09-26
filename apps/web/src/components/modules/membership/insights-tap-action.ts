export type InsightsTapAction = 'login' | 'none' | 'open' | 'subscribe'

export function insightsTapAction(input: {
  checkoutEnabled: boolean
  locked: boolean
  loggedIn: boolean
}): InsightsTapAction {
  if (!input.locked) return 'open'
  if (!input.loggedIn) return 'login'
  if (input.checkoutEnabled) return 'subscribe'
  return 'none'
}
