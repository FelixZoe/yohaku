import type { QueryClient } from '@tanstack/react-query'

import { setLiveDeskState } from '~/atoms/live-desk'
import type { LiveDeskState } from '~/models/live-desk'

import { liveDeskPublicStateQueryKey } from './query'

/**
 * The sole adapter allowed to converge Live Desk's React Query cache and Jotai
 * projection. Transport handlers must commit through this boundary.
 */
export const writeLiveDeskState = (
  queryClient: QueryClient,
  state: LiveDeskState,
) => {
  if (state.phase === 'disabled') {
    queryClient.removeQueries({
      exact: true,
      queryKey: liveDeskPublicStateQueryKey,
    })
  } else if (state.publicState !== null) {
    queryClient.setQueryData(liveDeskPublicStateQueryKey, state.publicState)
  }

  setLiveDeskState(state)
}
