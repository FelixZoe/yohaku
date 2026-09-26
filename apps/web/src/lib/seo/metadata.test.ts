import type { Metadata } from 'next'
import { describe, expect, it } from 'vitest'

import {
  assemblePageMetadata,
  resolveTwitterCreator,
  SEO_TITLE_SEPARATOR,
} from './metadata'

const seo = {
  title: 'Site Title',
  description: 'Site description',
}

const openGraphOf = (metadata: Metadata) =>
  metadata.openGraph as Record<string, unknown> | null | undefined

const twitterOf = (metadata: Metadata) =>
  metadata.twitter as Record<string, unknown> | null | undefined

describe('assemblePageMetadata', () => {
  it('builds an unprefixed canonical for the default locale', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(metadata.alternates?.canonical).toBe('/posts')
  })

  it('prefixes the canonical for a non-default locale', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'en',
      path: '/posts',
    })

    expect(metadata.alternates?.canonical).toBe('/en/posts')
  })

  it('does not emit a trailing slash for a non-default locale homepage', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'en',
      path: '/',
    })

    expect(metadata.alternates?.canonical).toBe('/en')
    expect(metadata.alternates?.languages).toMatchObject({
      en: '/en',
      ja: '/ja',
      ko: '/ko',
      'zh-TW': '/zh-TW',
    })
  })

  it('includes all five SEO locale codes plus x-default when translations are not restricted', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(metadata.alternates?.languages).toEqual({
      'zh-CN': '/posts',
      'zh-TW': '/zh-TW/posts',
      en: '/en/posts',
      ja: '/ja/posts',
      ko: '/ko/posts',
      'x-default': '/posts',
    })
  })

  it('restricts the languages map to the source and available translations', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts/tech/hello',
      translations: {
        sourceLang: 'zh',
        availableTranslations: ['en'],
      },
    })

    expect(metadata.alternates?.languages).toEqual({
      'zh-CN': '/posts/tech/hello',
      en: '/en/posts/tech/hello',
      'x-default': '/posts/tech/hello',
    })
  })

  it('points x-default at the source language when the default locale is unavailable', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'en',
      path: '/posts/tech/hello',
      translations: {
        sourceLang: 'en',
        availableTranslations: ['ja'],
      },
    })

    expect(metadata.alternates?.languages).toEqual({
      en: '/en/posts/tech/hello',
      ja: '/ja/posts/tech/hello',
      'x-default': '/en/posts/tech/hello',
    })
  })

  it('always includes the RSS feed alternate type and merges extra types', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/says',
      types: {
        'application/atom+xml': [{ url: 'says/feed', title: 'Says Atom' }],
      },
    })

    expect(metadata.alternates?.types).toEqual({
      'application/rss+xml': [{ url: 'feed', title: 'RSS Subscribe' }],
      'application/atom+xml': [{ url: 'says/feed', title: 'Says Atom' }],
    })
  })

  it('merges a caller rss+xml entry with the mandated main feed instead of replacing it', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/says',
      types: {
        'application/rss+xml': [{ url: 'says/feed', title: 'Says RSS' }],
      },
    })

    expect(metadata.alternates?.types).toEqual({
      'application/rss+xml': [
        { url: 'feed', title: 'RSS Subscribe' },
        { url: 'says/feed', title: 'Says RSS' },
      ],
    })
  })

  it('always includes the RSS feed alternate type when no extra types are given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(metadata.alternates?.types).toEqual({
      'application/rss+xml': [{ url: 'feed', title: 'RSS Subscribe' }],
    })
  })

  it('defaults the description to seo.description', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(metadata.description).toBe('Site description')
    expect(metadata.openGraph?.description).toBe('Site description')
    expect(metadata.twitter?.description).toBe('Site description')
  })

  it('prefers an explicit description over seo.description', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
      description: 'Page-specific description',
    })

    expect(metadata.description).toBe('Page-specific description')
    expect(metadata.openGraph?.description).toBe('Page-specific description')
    expect(metadata.twitter?.description).toBe('Page-specific description')
  })

  it('formats a page description with the dynamic site name', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
      description: ({ siteName }) => `${siteName} posts`,
    })

    expect(metadata.description).toBe('Site Title posts')
    expect(metadata.openGraph?.description).toBe('Site Title posts')
    expect(metadata.twitter?.description).toBe('Site Title posts')
  })

  it('passes through og.type', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts/tech/hello',
      title: 'Hello Post',
      og: { type: 'article' },
    })

    expect(openGraphOf(metadata)?.type).toBe('article')
  })

  it('composes openGraph.title and twitter.title from title + seo.title when a page title is given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts/tech/hello',
      title: 'Hello Post',
    })

    const composed = `Hello Post${SEO_TITLE_SEPARATOR}${seo.title}`
    expect(openGraphOf(metadata)?.title).toEqual({ absolute: composed })
    expect(twitterOf(metadata)?.title).toEqual({ absolute: composed })
  })

  it('falls back openGraph.title and twitter.title to seo.title when no page title is given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(openGraphOf(metadata)?.title).toEqual({ absolute: seo.title })
    expect(twitterOf(metadata)?.title).toEqual({ absolute: seo.title })
  })

  it('sets openGraph.siteName to seo.title and openGraph.url to the canonical path', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'en',
      path: '/posts',
    })

    expect(openGraphOf(metadata)?.siteName).toBe(seo.title)
    expect(openGraphOf(metadata)?.url).toBe('/en/posts')
  })

  it('defaults og.type to website and defaults images to a locale-qualified /home-og on both og and twitter when no og.image is given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(openGraphOf(metadata)?.type).toBe('website')
    expect(metadata.openGraph?.images).toBe('/home-og?lang=zh')
    expect(twitterOf(metadata)?.images).toBe('/home-og?lang=zh')
  })

  it('qualifies the default /home-og image with the given locale', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'en',
      path: '/posts',
    })

    expect(metadata.openGraph?.images).toBe('/home-og?lang=en')
    expect(twitterOf(metadata)?.images).toBe('/home-og?lang=en')
  })

  it('includes og.image on both openGraph and twitter when given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts/tech/hello',
      og: { image: 'https://example.com/og.png' },
    })

    expect(metadata.openGraph?.images).toBe('https://example.com/og.png')
    expect(twitterOf(metadata)?.images).toBe('https://example.com/og.png')
  })

  it('emits twitter.creator when twitterCreator is passed', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
      twitterCreator: '@example',
    })

    expect(twitterOf(metadata)?.creator).toBe('@example')
  })

  it('omits twitter.creator when twitterCreator is not passed', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(metadata.twitter).not.toHaveProperty('creator')
  })

  it('omits the title key when no page title is given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(metadata).not.toHaveProperty('title')
  })

  it('sets the title key when a page title is given', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts/tech/hello',
      title: 'Hello Post',
    })

    expect(metadata.title).toBe('Hello Post')
  })

  it('always sets twitter.card to summary_large_image', () => {
    const metadata = assemblePageMetadata({
      seo,
      locale: 'zh',
      path: '/posts',
    })

    expect(twitterOf(metadata)?.card).toBe('summary_large_image')
  })
})

describe('resolveTwitterCreator', () => {
  it('uses a configured Twitter or X handle', () => {
    expect(resolveTwitterCreator({ twitter: 'configured' })).toBe('@configured')
    expect(resolveTwitterCreator({ x: '@configured-x' })).toBe('@configured-x')
  })

  it('does not emit another deployment owner when no handle is configured', () => {
    expect(resolveTwitterCreator()).toBeUndefined()
    expect(resolveTwitterCreator({})).toBeUndefined()
  })
})
