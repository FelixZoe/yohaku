import { describe, expect, it } from 'vitest'

import { resolvePaywallCtas } from './paywall-ctas'

const prices = { sponsor: '$5.00', article: '$2.99' }

describe('resolvePaywallCtas', () => {
  it('signed in with both channels: sponsor primary, purchase secondary', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: true,
        membershipAvailable: true,
        purchaseAvailable: true,
        prices,
      }),
    ).toEqual({
      ctas: [
        { kind: 'sponsor', primary: true },
        { kind: 'purchase', primary: false },
      ],
      guestHint: [],
    })
  })

  it('membership only: sponsor cta alone', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: true,
        membershipAvailable: true,
        purchaseAvailable: false,
        prices,
      }).ctas,
    ).toEqual([{ kind: 'sponsor', primary: true }])
  })

  it('purchase only: purchase becomes primary', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: true,
        membershipAvailable: false,
        purchaseAvailable: true,
        prices,
      }).ctas,
    ).toEqual([{ kind: 'purchase', primary: true }])
  })

  it('neither channel: renders nothing', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: false,
        membershipAvailable: false,
        purchaseAvailable: false,
        prices,
      }),
    ).toEqual({ ctas: [], guestHint: [] })
  })

  it('guest: single login cta with both prices hinted', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: false,
        membershipAvailable: true,
        purchaseAvailable: true,
        prices,
      }),
    ).toEqual({
      ctas: [{ kind: 'login' }],
      guestHint: ['purchase', 'sponsor'],
    })
  })

  it('guest with membership only hints sponsor price only', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: false,
        membershipAvailable: true,
        purchaseAvailable: false,
        prices,
      }).guestHint,
    ).toEqual(['sponsor'])
  })

  it('guest hint omits channels without a price', () => {
    expect(
      resolvePaywallCtas({
        loggedIn: false,
        membershipAvailable: true,
        purchaseAvailable: true,
        prices: { article: '$2.99' },
      }).guestHint,
    ).toEqual(['purchase'])
  })
})
