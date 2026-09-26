import { describe, expect, it } from 'vitest'

import { isUnprefixedContentDetailPath } from './content-route'

describe('isUnprefixedContentDetailPath', () => {
  it.each([
    '/posts/tech/canonical-slug',
    '/posts/programming/legacy-slug/',
    '/notes/216',
    '/notes/2026/6/28/stay-in-the-game',
  ])('keeps the default-locale canonical stable for %s', (pathname) => {
    expect(isUnprefixedContentDetailPath(pathname)).toBe(true)
  })

  it.each([
    '/',
    '/posts',
    '/posts?page=2',
    '/notes',
    '/notes/series',
    '/ko/posts/tech/canonical-slug',
    '/en/notes/216',
    '/about',
  ])('leaves locale detection unchanged for %s', (pathname) => {
    expect(isUnprefixedContentDetailPath(pathname)).toBe(false)
  })
})
