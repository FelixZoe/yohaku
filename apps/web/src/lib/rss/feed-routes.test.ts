import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as getSaysFeed } from '~/app/[locale]/says/feed/route'
import { GET as getThinkingFeed } from '~/app/[locale]/thinking/feed/route'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('~/lib/request', () => ({
  apiClient: {
    aggregate: {
      proxy: {
        toString: () => 'https://api.example.com/aggregate',
      },
    },
    recently: {
      getList: vi.fn(async () => []),
    },
    say: {
      getAllPaginated: vi.fn(async () => ({ data: [] })),
    },
  },
}))

const aggregateResponse = {
  data: {
    seo: {
      title: 'Innei',
      description: 'Personal blog',
    },
    url: {
      web_url: 'https://innei.in/',
    },
  },
}

describe('section RSS route handlers', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(aggregateResponse)),
    )
  })

  it('emits a localized thinking feed from the wrapped aggregate response', async () => {
    const response = await getThinkingFeed(new Request('https://innei.in'), {
      params: Promise.resolve({ locale: 'en' }),
    })
    const xml = await response.text()

    expect(response.headers.get('content-type')).toBe('application/xml')
    expect(xml).toContain('https://innei.in/en/thinking/feed')
    expect(xml).toContain('https://innei.in/en/thinking')
  })

  it('emits a localized says feed from the wrapped aggregate response', async () => {
    const response = await getSaysFeed(new Request('https://innei.in'), {
      params: Promise.resolve({ locale: 'ja' }),
    })
    const xml = await response.text()

    expect(response.headers.get('content-type')).toBe('application/xml')
    expect(xml).toContain('https://innei.in/ja/says/feed')
    expect(xml).toContain('https://innei.in/ja/says')
  })

  it('keeps the default-locale feed URL unprefixed', async () => {
    const response = await getThinkingFeed(new Request('https://innei.in'), {
      params: Promise.resolve({ locale: 'zh' }),
    })
    const xml = await response.text()

    expect(xml).toContain('https://innei.in/thinking/feed')
    expect(xml).not.toContain('https://innei.in/zh/thinking/feed')
  })
})
