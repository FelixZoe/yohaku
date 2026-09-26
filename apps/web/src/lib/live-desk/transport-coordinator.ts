import type {
  LiveDeskState,
  LiveDeskTransport,
  PublicLiveDeskStateV2,
} from '~/models/live-desk'
import { EventTypes } from '~/types/events'

import { normalizePublicLiveDeskState } from './normalize'
import {
  disabledLiveDeskState,
  initialLiveDeskState,
  reduceLiveDeskState,
} from './reducer'

export const COMPANION_PRESENCE_CHANGED_EVENT =
  EventTypes.COMPANION_PRESENCE_CHANGED

export type LiveDeskResyncReason =
  | 'epoch-changed'
  | 'expired'
  | 'invalid-socket-state'
  | 'revision-gap'
  | 'socket-connected'
  | 'socket-without-baseline'

export type LiveDeskApplyResult =
  | {
      readonly accepted: false
      readonly reason: 'disabled' | 'duplicate' | 'invalid' | 'stale'
    }
  | {
      readonly accepted: true
      readonly resyncReason: LiveDeskResyncReason | null
      readonly state: LiveDeskState
    }

interface LiveDeskScheduler {
  clearTimeout(handle: unknown): void
  setTimeout(callback: () => void, delayMs: number): unknown
}

export interface LiveDeskTransportCoordinatorOptions {
  readonly now?: () => number
  readonly onResync: (reason: LiveDeskResyncReason) => void
  readonly onStateChange: (state: LiveDeskState) => void
  readonly scheduler?: LiveDeskScheduler
}

const browserScheduler: LiveDeskScheduler = {
  clearTimeout: (handle) => globalThis.clearTimeout(handle as number),
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
}

export class LiveDeskTransportCoordinator {
  private enabled = false
  private expiryTimer: unknown = null
  private readonly now: () => number
  private readonly onResync: (reason: LiveDeskResyncReason) => void
  private readonly onStateChange: (state: LiveDeskState) => void
  private readonly scheduler: LiveDeskScheduler
  private state = disabledLiveDeskState

  constructor(options: LiveDeskTransportCoordinatorOptions) {
    this.now = options.now ?? Date.now
    this.onResync = options.onResync
    this.onStateChange = options.onStateChange
    this.scheduler = options.scheduler ?? browserScheduler
  }

  getState(): LiveDeskState {
    return this.state
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return

    this.enabled = enabled
    this.cancelExpiry()
    this.commit(enabled ? initialLiveDeskState : disabledLiveDeskState)
  }

  acceptRest(value: unknown): LiveDeskApplyResult {
    if (!this.enabled) return { accepted: false, reason: 'disabled' }

    return this.apply(normalizePublicLiveDeskState(value), 'rest')
  }

  acceptSocket(value: unknown): LiveDeskApplyResult {
    if (!this.enabled) return { accepted: false, reason: 'disabled' }

    let incoming: PublicLiveDeskStateV2
    try {
      incoming = normalizePublicLiveDeskState(value)
    } catch {
      this.onResync('invalid-socket-state')
      return { accepted: false, reason: 'invalid' }
    }

    return this.apply(incoming, 'socket')
  }

  handleRestError() {
    if (!this.enabled || this.state.publicState !== null) return

    this.commit({
      phase: 'offline',
      publicState: null,
      transport: 'rest',
    })
  }

  handleSocketConnected() {
    if (this.enabled) this.onResync('socket-connected')
  }

  dispose() {
    this.cancelExpiry()
  }

  private apply(
    incoming: PublicLiveDeskStateV2,
    transport: LiveDeskTransport,
  ): LiveDeskApplyResult {
    const previous = this.state.publicState
    const epochChanged = previous !== null && previous.epoch !== incoming.epoch
    const revisionGap =
      previous !== null &&
      previous.epoch === incoming.epoch &&
      incoming.revision > previous.revision + 1

    const next = reduceLiveDeskState(this.state, incoming, transport)
    if (next === this.state) {
      return {
        accepted: false,
        reason:
          previous?.epoch === incoming.epoch &&
          previous.revision === incoming.revision
            ? 'duplicate'
            : 'stale',
      }
    }

    const expiresAt = incoming.projection
      ? Date.parse(incoming.projection.expiresAt)
      : null
    const alreadyExpired = expiresAt !== null && expiresAt <= this.now()
    const committedState = alreadyExpired
      ? ({ ...next, phase: 'offline' } satisfies LiveDeskState)
      : next

    this.commit(committedState)
    this.scheduleExpiry(incoming)

    let resyncReason: LiveDeskResyncReason | null = null
    if (alreadyExpired) {
      resyncReason = 'expired'
    } else if (transport === 'socket' && previous === null) {
      resyncReason = 'socket-without-baseline'
    } else if (transport === 'socket' && epochChanged) {
      resyncReason = 'epoch-changed'
    } else if (transport === 'socket' && revisionGap) {
      resyncReason = 'revision-gap'
    }

    if (resyncReason) this.onResync(resyncReason)

    return { accepted: true, resyncReason, state: committedState }
  }

  private scheduleExpiry(state: PublicLiveDeskStateV2) {
    this.cancelExpiry()
    if (!state.projection) return

    const expiresAt = Date.parse(state.projection.expiresAt)
    const remainingMs = expiresAt - this.now()
    if (remainingMs <= 0) return

    const expectedEpoch = state.epoch
    const expectedRevision = state.revision
    this.expiryTimer = this.scheduler.setTimeout(() => {
      this.expiryTimer = null
      this.expire(expectedEpoch, expectedRevision)
    }, remainingMs)
  }

  private expire(expectedEpoch: string, expectedRevision: number) {
    const publicState = this.state.publicState
    const projection = publicState?.projection
    if (
      !this.enabled ||
      !publicState ||
      !projection ||
      publicState.epoch !== expectedEpoch ||
      publicState.revision !== expectedRevision
    ) {
      return
    }

    const remainingMs = Date.parse(projection.expiresAt) - this.now()
    if (remainingMs > 0) {
      this.scheduleExpiry(publicState)
      return
    }

    this.commit({ ...this.state, phase: 'offline' })
    this.onResync('expired')
  }

  private cancelExpiry() {
    if (this.expiryTimer === null) return

    this.scheduler.clearTimeout(this.expiryTimer)
    this.expiryTimer = null
  }

  private commit(state: LiveDeskState) {
    this.state = state
    this.onStateChange(state)
  }
}
