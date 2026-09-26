import type { CompanionPublicPresenceResultV2 } from '@mx-space/api-client'

import { apiClient } from '~/lib/request'
import type { PublicLiveDeskStateV2 } from '~/models/live-desk'

import { normalizePublicLiveDeskState } from './normalize'

export const liveDeskPublicStateQueryKey = [
  'companion',
  'presence',
  'public',
] as const

export const normalizePublicLiveDeskReadResult = (
  value: unknown,
): PublicLiveDeskStateV2 => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid Live Desk read result: expected an object')
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'state')) {
    throw new TypeError('Invalid Live Desk read result: state is missing')
  }

  return normalizePublicLiveDeskState(
    (value as CompanionPublicPresenceResultV2).state,
  )
}

export const fetchPublicLiveDeskState =
  async (): Promise<PublicLiveDeskStateV2> => {
    const result = await apiClient.companion.getPublicPresence()

    return normalizePublicLiveDeskReadResult(result)
  }

export const liveDeskPublicStateQueryOptions = () => ({
  enabled: false,
  meta: { persist: false },
  queryFn: fetchPublicLiveDeskState,
  queryKey: liveDeskPublicStateQueryKey,
  refetchOnMount: 'always' as const,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  retry: false,
  staleTime: Number.POSITIVE_INFINITY,
})
