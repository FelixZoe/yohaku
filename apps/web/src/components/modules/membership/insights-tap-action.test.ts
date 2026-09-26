import { describe, expect, it } from 'vitest'

import { insightsTapAction } from './insights-tap-action'

describe('insightsTapAction', () => {
  it('opens Yohaku when the article is not locked', () => {
    expect(
      insightsTapAction({
        checkoutEnabled: true,
        locked: false,
        loggedIn: false,
      }),
    ).toBe('open')
  })

  it('sends signed-out readers to log in when locked', () => {
    expect(
      insightsTapAction({
        checkoutEnabled: true,
        locked: true,
        loggedIn: false,
      }),
    ).toBe('login')
  })

  it('starts checkout when locked and the reader can buy', () => {
    expect(
      insightsTapAction({
        checkoutEnabled: true,
        locked: true,
        loggedIn: true,
      }),
    ).toBe('subscribe')
  })

  it('does nothing when locked and checkout is unavailable', () => {
    expect(
      insightsTapAction({
        checkoutEnabled: false,
        locked: true,
        loggedIn: true,
      }),
    ).toBe('none')
  })
})
