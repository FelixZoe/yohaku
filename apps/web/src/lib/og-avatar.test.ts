import { describe, expect, it } from 'vitest'

import { resolveOgAvatar } from './og-avatar'

describe('resolveOgAvatar', () => {
  it('appends size param to github avatar urls', () => {
    expect(
      resolveOgAvatar(
        'https://avatars.githubusercontent.com/u/41265413?v=4',
        120,
      ),
    ).toBe('https://avatars.githubusercontent.com/u/41265413?v=4&s=120')
  })

  it('replaces an existing size param', () => {
    expect(
      resolveOgAvatar(
        'https://avatars.githubusercontent.com/u/1?s=460&v=4',
        48,
      ),
    ).toBe('https://avatars.githubusercontent.com/u/1?s=48&v=4')
  })

  it('leaves non-github urls untouched', () => {
    const url =
      'https://github.com/Innei/static/blob/master/avatar128x128.png?raw=true'
    expect(resolveOgAvatar(url, 120)).toBe(url)
  })

  it('passes through invalid urls', () => {
    expect(resolveOgAvatar('not a url', 120)).toBe('not a url')
  })
})
