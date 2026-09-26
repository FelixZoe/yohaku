import { describe, expect, it, vi } from 'vitest'

import getRobots from '~/app/robots'
import { apiClient } from '~/lib/request'

vi.mock('~/lib/request', () => ({
  apiClient: {
    aggregate: {
      getSiteMetadata: vi.fn(async () => ({
        url: { webUrl: 'https://innei.in' },
      })),
    },
  },
}))

describe('robots metadata route', () => {
  it('allows crawlers to render assets and observe route-level noindex', async () => {
    const result = await getRobots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallow = rules.flatMap((rule) => rule.disallow ?? [])

    expect(rules).toContainEqual({ userAgent: '*', allow: '/' })
    expect(disallow).not.toContain('/preview')
    expect(disallow).not.toContain('/en/preview')
    expect(disallow).not.toContain('/_next')
    expect(result.sitemap).toBe('https://innei.in/sitemap')
  })

  it('does not point crawlers at another deployment when site metadata is unavailable', async () => {
    vi.mocked(apiClient.aggregate.getSiteMetadata).mockRejectedValueOnce(
      new Error('unavailable'),
    )

    expect((await getRobots()).sitemap).toBeUndefined()
  })
})
