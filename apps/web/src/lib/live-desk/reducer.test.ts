import { describe, expect, it } from 'vitest'

import type {
  PublicLiveDeskProjectionV2,
  PublicLiveDeskStateV2,
} from '~/models/live-desk'

import {
  initialLiveDeskState,
  reconcilePublicLiveDeskState,
  reduceLiveDeskState,
} from './reducer'

const createActiveProjection = (): PublicLiveDeskProjectionV2 => ({
  application: {
    activity: null,
    displayName: 'Xcode',
    icon: null,
    window: null,
  },
  availability: 'active',
  expiresAt: '2026-07-16T12:01:30.180Z',
  media: null,
  updatedAt: '2026-07-16T12:00:00.180Z',
})

const createState = (
  epoch: string,
  revision: number,
  projection: PublicLiveDeskProjectionV2 | null = null,
): PublicLiveDeskStateV2 => ({
  epoch,
  projection,
  revision,
  schemaVersion: 2,
})

describe('reconcilePublicLiveDeskState', () => {
  it('accepts the first valid state', () => {
    const incoming = createState('epoch-a', 1)

    expect(reconcilePublicLiveDeskState(null, incoming)).toEqual({
      accepted: true,
      reason: 'initial',
      state: incoming,
    })
  })

  it('accepts a larger revision within the same epoch', () => {
    const current = createState('epoch-a', 3)
    const incoming = createState('epoch-a', 4)

    expect(reconcilePublicLiveDeskState(current, incoming)).toEqual({
      accepted: true,
      reason: 'revision-advanced',
      state: incoming,
    })
  })

  it('rejects duplicate and stale revisions without replacing current state', () => {
    const current = createState('epoch-a', 4)
    const duplicate = reconcilePublicLiveDeskState(
      current,
      createState('epoch-a', 4),
    )
    const stale = reconcilePublicLiveDeskState(
      current,
      createState('epoch-a', 3),
    )

    expect(duplicate.accepted).toBe(false)
    expect(duplicate.reason).toBe('duplicate')
    expect(duplicate.state).toBe(current)
    expect(stale.accepted).toBe(false)
    expect(stale.reason).toBe('stale')
    expect(stale.state).toBe(current)
  })

  it('accepts a new epoch even when its revision is numerically smaller', () => {
    const current = createState('epoch-a', 900)
    const incoming = createState('epoch-b', 1)

    expect(reconcilePublicLiveDeskState(current, incoming)).toEqual({
      accepted: true,
      reason: 'epoch-changed',
      state: incoming,
    })
  })
})

describe('reduceLiveDeskState', () => {
  it('derives active phase and records the accepted transport', () => {
    const incoming = createState('epoch-a', 1, createActiveProjection())

    expect(
      reduceLiveDeskState(initialLiveDeskState, incoming, 'socket'),
    ).toEqual({
      phase: 'active',
      publicState: incoming,
      transport: 'socket',
    })
  })

  it('treats a valid null projection as idle rather than unresolved', () => {
    const incoming = createState('epoch-a', 1)

    expect(reduceLiveDeskState(initialLiveDeskState, incoming, 'rest')).toEqual(
      {
        phase: 'idle',
        publicState: incoming,
        transport: 'rest',
      },
    )
  })

  it('preserves the complete client state when an incoming revision is stale', () => {
    const currentPublicState = createState(
      'epoch-a',
      5,
      createActiveProjection(),
    )
    const current = {
      phase: 'active',
      publicState: currentPublicState,
      transport: 'socket',
    } as const

    expect(
      reduceLiveDeskState(current, createState('epoch-a', 4), 'rest'),
    ).toBe(current)
  })
})
