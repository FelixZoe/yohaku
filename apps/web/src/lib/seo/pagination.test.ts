import { describe, expect, it } from 'vitest'

import {
  buildPaginatedCanonicalPath,
  isOutOfRangePaginationPage,
  resolveCanonicalPageNumber,
} from './pagination'

describe('pagination canonical paths', () => {
  it.each([undefined, '', '0', '1', '-2', '2foo', '1.5'])(
    'consolidates non-content page parameter %s to the first page',
    (page) => {
      expect(buildPaginatedCanonicalPath('/posts', page)).toBe('/posts')
      expect(resolveCanonicalPageNumber(page)).toBeNull()
    },
  )

  it('keeps a real result page self-canonical', () => {
    expect(buildPaginatedCanonicalPath('/posts', '2')).toBe('/posts?page=2')
  })

  it('normalizes leading zeroes and uses the first repeated value', () => {
    expect(buildPaginatedCanonicalPath('/notes', ['002', '3'])).toBe(
      '/notes?page=2',
    )
  })

  it('classifies an empty page after page one as out of range', () => {
    expect(isOutOfRangePaginationPage('99999', 0)).toBe(true)
    expect(isOutOfRangePaginationPage('2', 1)).toBe(false)
    expect(isOutOfRangePaginationPage('1', 0)).toBe(false)
    expect(isOutOfRangePaginationPage(undefined, 0)).toBe(false)
  })
})
