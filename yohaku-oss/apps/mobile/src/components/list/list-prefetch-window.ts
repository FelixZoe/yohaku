// Keep the former native list's two-row body prefetch on either side.
export function listPrefetchWindow<T>(
  items: T[],
  visible: { index: number | null; isViewable: boolean }[],
): T[] {
  const indices = visible.flatMap(({ index, isViewable }) =>
    isViewable && index !== null && index >= 0 && index < items.length
      ? [index]
      : [],
  )
  if (indices.length === 0) return []
  return items.slice(
    Math.max(0, Math.min(...indices) - 2),
    Math.max(...indices) + 3,
  )
}
