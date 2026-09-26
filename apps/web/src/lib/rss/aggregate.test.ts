import { describe, expect, it } from 'vitest'

import { unwrapFeedAggregate } from './aggregate'

describe('unwrapFeedAggregate', () => {
  it('unwraps and normalizes the raw aggregate API response used by feeds', () => {
    const aggregate = unwrapFeedAggregate({
      data: {
        seo: {
          title: 'Innei',
          description: 'Personal blog',
        },
        url: {
          web_url: 'https://innei.in',
        },
      },
    })

    expect(aggregate.seo.title).toBe('Innei')
    expect(aggregate.url.webUrl).toBe('https://innei.in')
  })

  it('rejects an unwrapped response before a feed can emit invalid XML', () => {
    expect(() =>
      unwrapFeedAggregate({
        seo: { title: 'Innei' },
        url: { web_url: 'https://innei.in' },
      }),
    ).toThrow('Invalid aggregate response envelope')
  })
})
