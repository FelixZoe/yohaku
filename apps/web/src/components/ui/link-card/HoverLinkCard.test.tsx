import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { EnrichmentResult } from '~/models/enrichment'

import { HoverLinkCard } from './HoverLinkCard'

const baseData: EnrichmentResult = {
  category: 'web',
  fetchedAt: '2026-05-01T00:00:00Z',
  title: 'Lexical Editor',
  url: 'https://lexical.dev/docs',
}

const withPreview: EnrichmentResult = {
  ...baseData,
  description: 'An extensible JavaScript web text-editor framework.',
  previewImage: {
    url: 'https://example.com/og.png',
    width: 1200,
    height: 628,
  },
}

describe('HoverLinkCard', () => {
  it('renders an <a> element with href, target=_blank, rel=noopener', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={baseData} />)
    expect(html).toMatch(/^<a\b/)
    expect(html).toContain('href="https://lexical.dev/docs"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener"')
  })

  it('renders the title', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={baseData} />)
    expect(html).toContain('Lexical Editor')
  })

  it('renders the description with line-clamp when present', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={withPreview} />)
    expect(html).toContain(
      'An extensible JavaScript web text-editor framework.',
    )
    expect(html).toContain('line-clamp-3')
  })

  it('omits description block when description is absent', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={baseData} />)
    expect(html).not.toContain('line-clamp-3')
  })

  it('renders <img> when previewImage.url is present', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={withPreview} />)
    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/og.png"')
  })

  it('renders no <img> when no image source is present', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={baseData} />)
    expect(html).not.toContain('<img')
  })

  it('renders host derived from data.url in the meta row', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={baseData} />)
    expect(html).toContain('lexical.dev')
  })

  it('renders subtype in the meta row when present', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard data={{ ...baseData, subtype: 'doc' }} />,
    )
    expect(html).toContain('lexical.dev')
    expect(html).toContain('doc')
  })

  it('renders previewImage when captureImage is absent', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={withPreview} />)
    expect(html).toContain('src="https://example.com/og.png"')
  })

  it('renders captureImage when only captureImage is present', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard
        data={{
          ...baseData,
          captureImage: {
            url: 'https://cdn.example.com/capture.webp',
            width: 1280,
            height: 720,
          },
        }}
      />,
    )
    expect(html).toContain('src="https://cdn.example.com/capture.webp"')
  })

  it('prefers captureImage over previewImage (hover = real destination)', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard
        data={{
          ...withPreview,
          captureImage: {
            url: 'https://cdn.example.com/capture.webp',
            width: 1280,
            height: 720,
          },
        }}
      />,
    )
    expect(html).toContain('src="https://cdn.example.com/capture.webp"')
    expect(html).not.toContain('https://example.com/og.png')
  })

  it('falls back to thumbnailImage when capture and preview are absent', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard
        data={{
          ...baseData,
          thumbnailImage: { url: 'https://example.com/thumb.png' },
        }}
      />,
    )
    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/thumb.png"')
  })

  it('prefers previewImage over thumbnailImage', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard
        data={{
          ...withPreview,
          thumbnailImage: { url: 'https://example.com/thumb.png' },
        }}
      />,
    )
    expect(html).toContain('src="https://example.com/og.png"')
    expect(html).not.toContain('https://example.com/thumb.png')
  })
})

describe('HoverLinkCard accent injection', () => {
  it('injects --color-accent on the anchor when data.color is valid hex', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard data={{ ...baseData, color: '#abcdef' }} />,
    )
    expect(html).toContain('--color-accent:#abcdef')
  })

  it('falls back to captureImage palette dominant when data.color is missing', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard
        data={{
          ...baseData,
          captureImage: {
            url: 'https://cdn.example.com/capture.webp',
            width: 1280,
            height: 720,
            palette: { dominant: '#112233' },
          },
        }}
      />,
    )
    expect(html).toContain('--color-accent:#112233')
  })

  it('prefers data.color over captureImage palette dominant when both are valid', () => {
    const html = renderToStaticMarkup(
      <HoverLinkCard
        data={{
          ...baseData,
          color: '#abcdef',
          captureImage: {
            url: 'https://cdn.example.com/capture.webp',
            width: 1280,
            height: 720,
            palette: { dominant: '#112233' },
          },
        }}
      />,
    )
    expect(html).toContain('--color-accent:#abcdef')
    expect(html).not.toContain('--color-accent:#112233')
  })

  it('emits no --color-accent when neither color nor palette is valid', () => {
    const html = renderToStaticMarkup(<HoverLinkCard data={baseData} />)
    expect(html).not.toMatch(/style="[^"]*--color-accent:/)
  })
})
