export const AGGREGATE_CACHE_TAG = 'aggregate'

export const withCacheTag = (
  tag: string,
  next?: RequestInit['next'],
): NonNullable<RequestInit['next']> => ({
  ...next,
  tags: [...new Set([...(next?.tags || []), tag])],
})
