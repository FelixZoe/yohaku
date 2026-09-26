import { describe, expect, it } from 'vitest'

import { canonicalizeSitemapNoteUrls } from './sitemap'

describe('canonicalizeSitemapNoteUrls', () => {
  it('emits canonical note URLs while preserving entries without a canonical route', () => {
    const entries = [
      {
        url: 'https://innei.in/notes/42',
        published_at: '2026-03-15T03:00:00.000Z',
      },
      { url: 'https://innei.in/notes/43' },
      { url: 'https://innei.in/notes/44' },
      { url: 'https://innei.in/notes/45' },
      { url: 'https://innei.in/notes/2025/1/2/already-canonical' },
      { url: 'https://innei.in/posts/tech/unchanged' },
    ]

    const result = canonicalizeSitemapNoteUrls(entries, [
      {
        nid: 42,
        slug: 'hello-note',
        createdAt: '2026-03-14T20:00:00.000-08:00',
      },
      { nid: 43, createdAt: '2026-03-14T12:00:00.000Z' },
      { nid: 44, slug: 'missing-date' },
    ])

    expect(result.map((entry) => entry.url)).toEqual([
      'https://innei.in/notes/2026/3/15/hello-note',
      'https://innei.in/notes/43',
      'https://innei.in/notes/44',
      'https://innei.in/notes/45',
      'https://innei.in/notes/2025/1/2/already-canonical',
      'https://innei.in/posts/tech/unchanged',
    ])
    expect(result[0].published_at).toBe('2026-03-15T03:00:00.000Z')
  })

  it('supports relative sitemap note URLs', () => {
    expect(
      canonicalizeSitemapNoteUrls(
        [{ url: '/notes/42' }],
        [
          {
            nid: 42,
            slug: 'hello-note',
            createdAt: '2026-03-14T12:00:00.000Z',
          },
        ],
      ),
    ).toEqual([{ url: '/notes/2026/3/14/hello-note' }])
  })
})
