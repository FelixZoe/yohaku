import type { AggregateRoot } from '@mx-space/api-client'

import { camelcaseKeysWithUrlSkip } from '~/lib/camelcase'
import { isRecord } from '~/lib/is-record'

/**
 * The raw aggregate endpoint uses the API response envelope instead of the
 * already-unwrapped shape returned by apiClient controller methods.
 */
export const unwrapFeedAggregate = (payload: unknown): AggregateRoot => {
  const normalized = camelcaseKeysWithUrlSkip<unknown>(payload)
  const aggregate = isRecord(normalized) ? normalized.data : undefined

  if (
    !isRecord(aggregate) ||
    !isRecord(aggregate.seo) ||
    !isRecord(aggregate.url)
  ) {
    throw new TypeError('Invalid aggregate response envelope')
  }

  return aggregate as unknown as AggregateRoot
}
