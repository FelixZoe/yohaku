import { describe, expect, it } from 'vitest'

import { resolveAuthBaseURL } from './auth-base-url'

describe('resolveAuthBaseURL', () => {
  it('keeps an absolute API URL and appends the auth endpoint', () => {
    expect(resolveAuthBaseURL('https://mx.innei.in/api/v3')).toBe(
      'https://mx.innei.in/api/v3/auth',
    )
  })

  it('resolves a relative API URL against the current site origin', () => {
    expect(resolveAuthBaseURL('/api/v3', 'https://innei.in')).toBe(
      'https://innei.in/api/v3/auth',
    )
  })

  it('falls back to the site origin when the API URL is empty', () => {
    expect(resolveAuthBaseURL('', 'https://innei.in')).toBe(
      'https://innei.in/auth',
    )
  })

  it('allows the auth client module to evaluate with the relative default API URL', async () => {
    await expect(import('./authjs')).resolves.toHaveProperty('authClient')
  })
})
