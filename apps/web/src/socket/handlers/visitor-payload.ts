const onlineCountKeys = [
  'online',
  'onlineCount',
  'online_count',
  'count',
] as const

export const resolveVisitorOnlineCount = (
  payload: Record<string, unknown> | null | undefined,
) => {
  if (!payload) {
    return null
  }

  for (const key of onlineCountKeys) {
    const value = payload[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}
