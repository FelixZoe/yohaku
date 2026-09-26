import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { getLiveDeskState } from '~/atoms/live-desk'
import type { LiveDeskState, PublicLiveDeskStateV2 } from '~/models/live-desk'

import { liveDeskPublicStateQueryKey } from './query'
import { disabledLiveDeskState } from './reducer'
import { writeLiveDeskState } from './state-writer'

const publicState: PublicLiveDeskStateV2 = {
  epoch: '01K0A5P1KD0QAFMZKVFNFC7AFN',
  projection: null,
  revision: 12,
  schemaVersion: 2,
}

describe('writeLiveDeskState', () => {
  it('commits one canonical state to both React Query and Jotai', () => {
    const queryClient = new QueryClient()
    const activeState: LiveDeskState = {
      phase: 'idle',
      publicState,
      transport: 'socket',
    }

    writeLiveDeskState(queryClient, activeState)

    expect(queryClient.getQueryData(liveDeskPublicStateQueryKey)).toBe(
      publicState,
    )
    expect(getLiveDeskState()).toBe(activeState)

    writeLiveDeskState(queryClient, disabledLiveDeskState)

    expect(
      queryClient.getQueryData(liveDeskPublicStateQueryKey),
    ).toBeUndefined()
    expect(getLiveDeskState()).toBe(disabledLiveDeskState)
  })
})
