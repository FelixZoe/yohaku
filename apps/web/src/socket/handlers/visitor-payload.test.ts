import { describe, expect, it } from 'vitest'

import { resolveVisitorOnlineCount } from './visitor-payload'

describe('resolveVisitorOnlineCount', () => {
  it('reads the current core payload shape', () => {
    expect(
      resolveVisitorOnlineCount({
        online: 7,
        timestamp: '2026-03-15T09:00:00.000Z',
      }),
    ).toBe(7)
  })

  it('accepts onlineCount aliases for compatibility', () => {
    expect(resolveVisitorOnlineCount({ onlineCount: 12 })).toBe(12)
    expect(resolveVisitorOnlineCount({ online_count: 18 })).toBe(18)
    expect(resolveVisitorOnlineCount({ count: 24 })).toBe(24)
  })

  it('ignores invalid payloads', () => {
    expect(resolveVisitorOnlineCount(null)).toBeNull()
    expect(resolveVisitorOnlineCount({})).toBeNull()
    expect(resolveVisitorOnlineCount({ online: Number.NaN })).toBeNull()
    expect(resolveVisitorOnlineCount({ online: '9' })).toBeNull()
  })
})
