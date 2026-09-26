import { describe, expect, it } from 'vitest'

import { withoutPeekParam, withPeekParam } from './peek-url'

describe('withPeekParam', () => {
  it('keeps the params the page filters on', () => {
    expect(
      withPeekParam('https://innei.in/timeline?type=note', '/notes/123'),
    ).toBe('/timeline?type=note&peek-to=%2Fnotes%2F123')
  })

  it('keeps view and memory params', () => {
    expect(
      withPeekParam(
        'https://innei.in/timeline?memory=1&view=dense',
        '/posts/a/b',
      ),
    ).toBe('/timeline?memory=1&view=dense&peek-to=%2Fposts%2Fa%2Fb')
  })

  it('replaces a stale peek target instead of appending', () => {
    expect(
      withPeekParam(
        'https://innei.in/timeline?type=note&peek-to=%2Fnotes%2F1',
        '/notes/2',
      ),
    ).toBe('/timeline?type=note&peek-to=%2Fnotes%2F2')
  })
})

describe('withoutPeekParam', () => {
  it('drops only the peek target', () => {
    expect(
      withoutPeekParam(
        'https://innei.in/timeline?type=note&peek-to=%2Fnotes%2F123',
      ),
    ).toBe('/timeline?type=note')
  })

  it('leaves a bare pathname alone', () => {
    expect(withoutPeekParam('https://innei.in/timeline')).toBe('/timeline')
  })
})
