import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scheduleFreeWindowExpiry } from './free-window-expiry'

const HOUR = 60 * 60 * 1000

describe('scheduleFreeWindowExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-14T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires one second after freeUntil', () => {
    const onExpire = vi.fn()
    scheduleFreeWindowExpiry('2026-09-14T02:00:00Z', onExpire)
    vi.advanceTimersByTime(2 * HOUR)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('fires after the grace period when freeUntil is already past', () => {
    const onExpire = vi.fn()
    scheduleFreeWindowExpiry('2026-09-13T00:00:00Z', onExpire)
    vi.advanceTimersByTime(999)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not schedule when freeUntil is more than 24h away', () => {
    const onExpire = vi.fn()
    const cancel = scheduleFreeWindowExpiry('2026-09-15T00:00:01Z', onExpire)
    expect(cancel).toBeUndefined()
    vi.advanceTimersByTime(25 * HOUR)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('does not schedule for an invalid date', () => {
    expect(scheduleFreeWindowExpiry('nope', vi.fn())).toBeUndefined()
  })

  it('cancel clears the pending timer', () => {
    const onExpire = vi.fn()
    const cancel = scheduleFreeWindowExpiry('2026-09-14T01:00:00Z', onExpire)
    cancel?.()
    vi.advanceTimersByTime(2 * HOUR)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
