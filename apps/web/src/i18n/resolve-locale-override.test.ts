import { describe, expect, it } from 'vitest'

import { resolveLocaleOverride } from './resolve-locale-override'

describe('resolveLocaleOverride', () => {
  it('prefers an explicit locale over the request locale', async () => {
    let called = false

    const locale = await resolveLocaleOverride('ja', async () => {
      called = true
      return 'en'
    })

    expect(locale).toBe('ja')
    expect(called).toBe(false)
  })

  it('falls back to the request locale when no explicit locale is passed', async () => {
    const locale = await resolveLocaleOverride(undefined, async () => 'en')

    expect(locale).toBe('en')
  })
})
