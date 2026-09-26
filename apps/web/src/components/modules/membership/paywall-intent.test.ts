import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PAYWALL_INTENT_KEY,
  readPaywallIntent,
  writePaywallIntent,
} from './paywall-intent'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('paywall intent', () => {
  it('round-trips an intent under the new key', () => {
    writePaywallIntent({ type: 'paywall', path: '/posts/a/b' })
    expect(store.has(PAYWALL_INTENT_KEY)).toBe(true)
    expect(readPaywallIntent()).toEqual({ type: 'paywall', path: '/posts/a/b' })
  })

  it('clears on null', () => {
    writePaywallIntent({ type: 'article-purchase', path: '/p', postId: '1' })
    writePaywallIntent(null)
    expect(readPaywallIntent()).toBeNull()
  })

  it('ignores malformed storage', () => {
    store.set(PAYWALL_INTENT_KEY, '{oops')
    expect(readPaywallIntent()).toBeNull()
    store.set(PAYWALL_INTENT_KEY, JSON.stringify({ path: '/x' }))
    expect(readPaywallIntent()).toBeNull()
  })

  it('swallows storage errors', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() =>
      writePaywallIntent({ type: 'paywall', path: '/' }),
    ).not.toThrow()
    expect(readPaywallIntent()).toBeNull()
  })
})
