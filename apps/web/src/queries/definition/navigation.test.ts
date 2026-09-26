import { describe, expect, it } from 'vitest'

import { buildNavPostsPayload, mapNavigationPages } from './navigation'

describe('mapNavigationPages', () => {
  it('sorts pages by order ascending and keeps only header fields', () => {
    expect(
      mapNavigationPages([
        {
          id: 'b',
          order: 2,
          slug: 'stack',
          title: 'Stack',
        },
        {
          id: 'a',
          order: 1,
          slug: 'about',
          title: 'About',
        },
      ]),
    ).toEqual([
      {
        id: 'a',
        order: 1,
        slug: 'about',
        title: 'About',
      },
      {
        id: 'b',
        order: 2,
        slug: 'stack',
        title: 'Stack',
      },
    ])
  })
})

describe('buildNavPostsPayload', () => {
  it('uses requested slug and trims recent posts to four items', () => {
    expect(
      buildNavPostsPayload({
        categories: [
          {
            count: 3,
            id: 'cat-1',
            name: 'Dev',
            slug: 'dev',
          },
        ],
        requestedSlug: 'dev',
        selectedCategory: {
          children: Array.from({ length: 5 }, (_, index) => ({
            category: {
              name: 'Dev',
              slug: 'dev',
            },
            createdAt: `2025-01-0${index + 1}`,
            id: `post-${index}`,
            slug: `post-${index}`,
            title: `Post ${index}`,
          })),
        },
      }),
    ).toEqual({
      categories: [
        {
          count: 3,
          id: 'cat-1',
          name: 'Dev',
          slug: 'dev',
        },
      ],
      recentPosts: [
        expect.objectContaining({ id: 'post-0' }),
        expect.objectContaining({ id: 'post-1' }),
        expect.objectContaining({ id: 'post-2' }),
        expect.objectContaining({ id: 'post-3' }),
      ],
      selectedSlug: 'dev',
    })
  })

  it('falls back to the first category slug when none is requested', () => {
    expect(
      buildNavPostsPayload({
        categories: [
          {
            count: 1,
            id: 'cat-1',
            name: 'Dev',
            slug: 'dev',
          },
          {
            count: 1,
            id: 'cat-2',
            name: 'Life',
            slug: 'life',
          },
        ],
        selectedCategory: null,
      }).selectedSlug,
    ).toBe('dev')
  })
})
