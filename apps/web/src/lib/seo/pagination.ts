export type PaginationPageParam = string | string[] | undefined

export const resolveCanonicalPageNumber = (
  page: PaginationPageParam,
): number | null => {
  const value = Array.isArray(page) ? page[0] : page
  if (!value || !/^\d+$/.test(value)) return null

  const pageNumber = Number(value)
  return Number.isSafeInteger(pageNumber) && pageNumber > 1 ? pageNumber : null
}

export const buildPaginatedCanonicalPath = (
  basePath: string,
  page: PaginationPageParam,
) => {
  const pageNumber = resolveCanonicalPageNumber(page)
  return pageNumber ? `${basePath}?page=${pageNumber}` : basePath
}

/**
 * Empty pages after the first page are out-of-range resources, not valid list
 * views. Returning a 404 prevents them from becoming indexable soft-404s.
 */
export const isOutOfRangePaginationPage = (
  page: PaginationPageParam,
  itemCount: number,
) => resolveCanonicalPageNumber(page) !== null && itemCount === 0
