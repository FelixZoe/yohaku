import type {
  LiveDeskState,
  LiveDeskTransport,
  PublicLiveDeskProjectionV2,
  PublicLiveDeskStateV2,
} from '~/models/live-desk'

export type PublicLiveDeskStateAcceptanceReason =
  'epoch-changed' | 'initial' | 'revision-advanced'

export type PublicLiveDeskStateRejectionReason = 'duplicate' | 'stale'

export type PublicLiveDeskStateReconcileResult =
  | {
      readonly accepted: false
      readonly reason: PublicLiveDeskStateRejectionReason
      readonly state: PublicLiveDeskStateV2
    }
  | {
      readonly accepted: true
      readonly reason: PublicLiveDeskStateAcceptanceReason
      readonly state: PublicLiveDeskStateV2
    }

export const initialLiveDeskState: LiveDeskState = {
  phase: 'loading',
  publicState: null,
  transport: 'rest',
}

export const disabledLiveDeskState: LiveDeskState = {
  phase: 'disabled',
  publicState: null,
  transport: 'rest',
}

export const reconcilePublicLiveDeskState = (
  current: PublicLiveDeskStateV2 | null,
  incoming: PublicLiveDeskStateV2,
): PublicLiveDeskStateReconcileResult => {
  if (current === null) {
    return { accepted: true, reason: 'initial', state: incoming }
  }

  if (current.epoch !== incoming.epoch) {
    return { accepted: true, reason: 'epoch-changed', state: incoming }
  }

  if (incoming.revision > current.revision) {
    return { accepted: true, reason: 'revision-advanced', state: incoming }
  }

  return {
    accepted: false,
    reason: incoming.revision === current.revision ? 'duplicate' : 'stale',
    state: current,
  }
}

export const reduceLiveDeskState = (
  current: LiveDeskState,
  incoming: PublicLiveDeskStateV2,
  transport: LiveDeskTransport,
): LiveDeskState => {
  const result = reconcilePublicLiveDeskState(current.publicState, incoming)
  if (!result.accepted) return current

  return {
    phase: incoming.projection?.availability === 'active' ? 'active' : 'idle',
    publicState: result.state,
    transport,
  }
}

export const getVisibleLiveDeskProjection = (
  state: LiveDeskState,
): PublicLiveDeskProjectionV2 | null => {
  if (state.phase !== 'active' && state.phase !== 'idle') return null

  return state.publicState?.projection ?? null
}
