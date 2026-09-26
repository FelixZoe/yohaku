import { describe, expect, it } from 'vitest'

import {
  entitlementReasonOf,
  shouldUnlockPaywalledContent,
} from './should-unlock-paywall'

describe('shouldUnlockPaywalledContent', () => {
  it('refetches when the viewer is the owner', () => {
    expect(
      shouldUnlockPaywalledContent({
        reason: 'locked',
        isMember: false,
        isOwner: true,
      }),
    ).toBe(true)
  })

  it('refetches when the viewer is an active member', () => {
    expect(
      shouldUnlockPaywalledContent({
        reason: 'locked',
        isMember: true,
        isOwner: false,
      }),
    ).toBe(true)
  })

  it('does not refetch a public article', () => {
    expect(
      shouldUnlockPaywalledContent({
        reason: 'public',
        isMember: false,
        isOwner: true,
      }),
    ).toBe(false)
  })

  it('does not refetch when the server already granted access', () => {
    for (const reason of [
      'owner',
      'purchase',
      'membership',
      'free-window',
    ] as const) {
      expect(
        shouldUnlockPaywalledContent({ reason, isMember: true, isOwner: true }),
      ).toBe(false)
    }
  })

  it('does not refetch for an anonymous reader', () => {
    expect(
      shouldUnlockPaywalledContent({
        reason: 'locked',
        isMember: false,
        isOwner: false,
      }),
    ).toBe(false)
  })

  it('does not refetch a non-premium article without paywall meta', () => {
    expect(
      shouldUnlockPaywalledContent({
        reason: undefined,
        isMember: true,
        isOwner: true,
      }),
    ).toBe(false)
  })
})

describe('entitlementReasonOf', () => {
  it('prefers the server reason', () => {
    expect(
      entitlementReasonOf({
        locked: false,
        entitlement: { reason: 'purchase' },
      }),
    ).toBe('purchase')
  })

  it('treats a locked payload without entitlement as locked', () => {
    expect(
      entitlementReasonOf({ locked: true, entitlement: undefined } as any),
    ).toBe('locked')
  })

  it('returns undefined without paywall meta', () => {
    expect(entitlementReasonOf(undefined)).toBeUndefined()
    expect(entitlementReasonOf({ locked: false } as any)).toBeUndefined()
  })
})
