export type PaywallChannel = 'sponsor' | 'purchase'

export type PaywallCta =
  { kind: 'login' } | { kind: PaywallChannel; primary: boolean }

export type PaywallCtaPlan = {
  ctas: PaywallCta[]
  guestHint: PaywallChannel[]
}

export function resolvePaywallCtas({
  loggedIn,
  membershipAvailable,
  purchaseAvailable,
  prices,
}: {
  loggedIn: boolean
  membershipAvailable: boolean
  purchaseAvailable: boolean
  prices: { sponsor?: string; article?: string }
}): PaywallCtaPlan {
  if (!membershipAvailable && !purchaseAvailable)
    return { ctas: [], guestHint: [] }

  if (!loggedIn) {
    const guestHint: PaywallChannel[] = []
    if (purchaseAvailable && prices.article) guestHint.push('purchase')
    if (membershipAvailable && prices.sponsor) guestHint.push('sponsor')
    return { ctas: [{ kind: 'login' }], guestHint }
  }

  const ctas: PaywallCta[] = []
  if (membershipAvailable) ctas.push({ kind: 'sponsor', primary: true })
  if (purchaseAvailable)
    ctas.push({ kind: 'purchase', primary: !membershipAvailable })
  return { ctas, guestHint: [] }
}
