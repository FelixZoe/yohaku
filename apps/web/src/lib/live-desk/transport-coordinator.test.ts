import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getVisibleLiveDeskProjection } from './reducer'
import {
  type LiveDeskResyncReason,
  LiveDeskTransportCoordinator,
} from './transport-coordinator'

const EPOCH_A = '01K0A5P1KD0QAFMZKVFNFC7AFN'
const EPOCH_B = '01K0A5P1KD0QAFMZKVFNFC7AFP'
const UPDATED_AT = '2026-07-16T12:00:00.000Z'

const createState = ({
  epoch = EPOCH_A,
  expiresAt = '2026-07-16T12:01:30.000Z',
  projection = 'active',
  revision = 1,
}: {
  epoch?: string
  expiresAt?: string
  projection?: 'active' | 'none'
  revision?: number
} = {}) => ({
  epoch,
  projection:
    projection === 'none'
      ? null
      : {
          application: {
            activity: null,
            displayName: 'Xcode',
            icon: null,
            window: null,
          },
          availability: 'active',
          expiresAt,
          media: null,
          updatedAt: UPDATED_AT,
        },
  revision,
  schemaVersion: 2,
})

const createHarness = () => {
  const committed: ReturnType<LiveDeskTransportCoordinator['getState']>[] = []
  const resyncReasons: LiveDeskResyncReason[] = []
  const coordinator = new LiveDeskTransportCoordinator({
    onResync: (reason) => resyncReasons.push(reason),
    onStateChange: (state) => committed.push(state),
  })

  return { committed, coordinator, resyncReasons }
}

describe('LiveDeskTransportCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(UPDATED_AT))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts disabled and ignores unsolicited socket state', () => {
    const { committed, coordinator, resyncReasons } = createHarness()

    expect(coordinator.getState().phase).toBe('disabled')
    expect(coordinator.acceptSocket(createState())).toEqual({
      accepted: false,
      reason: 'disabled',
    })
    expect(committed).toEqual([])
    expect(resyncReasons).toEqual([])
  })

  it('normalizes REST and socket baselines into the same public state', () => {
    const rest = createHarness()
    const socket = createHarness()
    rest.coordinator.setEnabled(true)
    socket.coordinator.setEnabled(true)

    rest.coordinator.acceptRest(createState())
    socket.coordinator.acceptSocket(createState())

    expect(rest.coordinator.getState().publicState).toEqual(
      socket.coordinator.getState().publicState,
    )
    expect(rest.coordinator.getState().transport).toBe('rest')
    expect(socket.coordinator.getState().transport).toBe('socket')
    expect(socket.resyncReasons).toEqual(['socket-without-baseline'])
  })

  it('accepts a complete state after a revision gap and requests REST confirmation', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)
    coordinator.acceptRest(createState({ revision: 4 }))

    const result = coordinator.acceptSocket(createState({ revision: 7 }))

    expect(result).toMatchObject({
      accepted: true,
      resyncReason: 'revision-gap',
    })
    expect(coordinator.getState().publicState?.revision).toBe(7)
    expect(resyncReasons).toEqual(['revision-gap'])
  })

  it('rejects duplicate and stale revisions without regressing state', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)
    coordinator.acceptRest(createState({ revision: 4 }))

    expect(coordinator.acceptSocket(createState({ revision: 4 }))).toEqual({
      accepted: false,
      reason: 'duplicate',
    })
    expect(coordinator.acceptSocket(createState({ revision: 3 }))).toEqual({
      accepted: false,
      reason: 'stale',
    })
    expect(coordinator.getState().publicState?.revision).toBe(4)
    expect(resyncReasons).toEqual([])
  })

  it('accepts a rebuilt epoch and requests a new REST baseline', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)
    coordinator.acceptRest(createState({ revision: 900 }))

    coordinator.acceptSocket(createState({ epoch: EPOCH_B, revision: 1 }))

    expect(coordinator.getState().publicState).toMatchObject({
      epoch: EPOCH_B,
      revision: 1,
    })
    expect(resyncReasons).toEqual(['epoch-changed'])
  })

  it('requests a REST baseline whenever the socket connects', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)

    coordinator.handleSocketConnected()

    expect(resyncReasons).toEqual(['socket-connected'])
  })

  it('hides the projection at lease expiry and requests reconciliation', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)
    coordinator.acceptRest(
      createState({ expiresAt: '2026-07-16T12:00:01.000Z' }),
    )

    vi.advanceTimersByTime(1_000)

    expect(coordinator.getState().phase).toBe('offline')
    expect(getVisibleLiveDeskProjection(coordinator.getState())).toBeNull()
    expect(resyncReasons).toEqual(['expired'])
  })

  it('cancels the previous expiry when a newer null projection arrives', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)
    coordinator.acceptRest(
      createState({ expiresAt: '2026-07-16T12:00:01.000Z' }),
    )
    coordinator.acceptSocket(createState({ projection: 'none', revision: 2 }))

    vi.advanceTimersByTime(1_000)

    expect(coordinator.getState().phase).toBe('idle')
    expect(coordinator.getState().publicState?.projection).toBeNull()
    expect(resyncReasons).toEqual([])
  })

  it('falls back to REST when a socket event fails canonical validation', () => {
    const { coordinator, resyncReasons } = createHarness()
    coordinator.setEnabled(true)

    expect(
      coordinator.acceptSocket({ ...createState(), deviceId: 'private' }),
    ).toEqual({ accepted: false, reason: 'invalid' })
    expect(coordinator.getState().publicState).toBeNull()
    expect(resyncReasons).toEqual(['invalid-socket-state'])
  })
})
