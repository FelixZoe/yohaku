import { describe, expect, it } from 'vitest'

import { getDefaultLinkSections } from './config'

const t = (key: string) => key

const hrefsOf = (sections: ReturnType<typeof getDefaultLinkSections>) =>
  sections.flatMap((section) => section.links.map((link) => link.href))

describe('getDefaultLinkSections', () => {
  it('does not expose another deployment owner contact links by default', () => {
    const hrefs = hrefsOf(getDefaultLinkSections(t))

    expect(hrefs).not.toContain('mailto:i@innei.in')
    expect(hrefs).not.toContain('https://github.com/innei')
    expect(hrefs).not.toContain('https://status.shizuri.net/status/main')
  })

  it('builds contact links from the configured social identities', () => {
    const hrefs = hrefsOf(
      getDefaultLinkSections(t, {
        email: 'owner@example.com',
        github: 'site-owner',
      }),
    )

    expect(hrefs).toContain('mailto:owner@example.com')
    expect(hrefs).toContain('https://github.com/site-owner')
  })
})
