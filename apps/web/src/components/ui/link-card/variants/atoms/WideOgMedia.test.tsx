import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { EnrichmentImage } from '~/models/enrichment'

import { WideOgMedia } from './WideOgMedia'

const PREVIEW_URL = 'https://cdn.example.com/og.jpg'
const CAPTURE_URL = 'https://cdn.example.com/capture.webp'

// Valid thumbhash from the thumbhash README sample.
const SAMPLE_THUMBHASH = '1QcSHQRnh493V4dIh4eXh1h4kJUI'

const capture: EnrichmentImage = {
  url: CAPTURE_URL,
  width: 1280,
  height: 720,
}

describe('WideOgMedia', () => {
  it('renders nothing when both sources are undefined', () => {
    const html = renderToStaticMarkup(<WideOgMedia alt="alt" />)
    expect(html).toBe('')
  })

  it('renders nothing when previewImage.url is empty and no capture', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="alt" previewImage={{ url: '' }} />,
    )
    expect(html).toBe('')
  })

  it('uses 16/9 default ratio when width/height are missing', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="alt" previewImage={{ url: PREVIEW_URL }} />,
    )
    expect(html).toContain(`src="${PREVIEW_URL}"`)
    expect(html).toContain(`aspect-ratio:${16 / 9}`)
  })

  it('uses raw ratio when within bounds (1200x628 ~ 1.91)', () => {
    const ratio = 1200 / 628
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        previewImage={{ url: PREVIEW_URL, width: 1200, height: 628 }}
      />,
    )
    expect(html).toContain(`aspect-ratio:${ratio}`)
  })

  it('falls back to 16/9 when portrait (ratio < 1)', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        previewImage={{ url: PREVIEW_URL, width: 400, height: 600 }}
      />,
    )
    expect(html).toContain(`aspect-ratio:${16 / 9}`)
  })

  it('caps at 3 when ultra-wide (ratio > 3)', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        previewImage={{ url: PREVIEW_URL, width: 4000, height: 1000 }}
      />,
    )
    expect(html).toContain('aspect-ratio:3')
  })

  it('renders ImagePlaceholder when thumbhash is present', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        previewImage={{
          url: PREVIEW_URL,
          thumbhash: SAMPLE_THUMBHASH,
        }}
      />,
    )
    expect(html).toContain('data:image/png;base64,')
  })

  it('does not render ImagePlaceholder when thumbhash is absent', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="alt" previewImage={{ url: PREVIEW_URL }} />,
    )
    expect(html).not.toContain('data:image/png;base64,')
  })

  it('passes alt through to the <img>', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="Example title" previewImage={{ url: PREVIEW_URL }} />,
    )
    expect(html).toContain('alt="Example title"')
  })

  it('renders captureImage when previewImage is absent', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="alt" captureImage={capture} />,
    )
    expect(html).toContain(`src="${CAPTURE_URL}"`)
  })

  it('renders captureImage when previewImage.url is empty', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        captureImage={capture}
        previewImage={{ url: '' }}
      />,
    )
    expect(html).toContain(`src="${CAPTURE_URL}"`)
  })

  it('uses captureImage width/height for aspect ratio when only capture is set', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="alt" captureImage={capture} />,
    )
    expect(html).toContain(`aspect-ratio:${1280 / 720}`)
  })

  it('uses captureImage thumbhash when only capture is set', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        captureImage={{
          ...capture,
          thumbhash: SAMPLE_THUMBHASH,
        }}
      />,
    )
    expect(html).toContain('data:image/png;base64,')
  })

  it('prefers captureImage over previewImage', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        captureImage={capture}
        previewImage={{ url: PREVIEW_URL }}
      />,
    )
    expect(html).toContain(`src="${CAPTURE_URL}"`)
    expect(html).not.toContain(PREVIEW_URL)
  })

  it('falls back to previewImage when capture is absent', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia alt="alt" previewImage={{ url: PREVIEW_URL }} />,
    )
    expect(html).toContain(`src="${PREVIEW_URL}"`)
  })

  it('falls back to thumbnailImage when capture and preview are absent', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        thumbnailImage={{ url: 'https://cdn.example.com/thumb.png' }}
      />,
    )
    expect(html).toContain('src="https://cdn.example.com/thumb.png"')
  })

  it('prefers previewImage over thumbnailImage', () => {
    const html = renderToStaticMarkup(
      <WideOgMedia
        alt="alt"
        previewImage={{ url: PREVIEW_URL }}
        thumbnailImage={{ url: 'https://cdn.example.com/thumb.png' }}
      />,
    )
    expect(html).toContain(`src="${PREVIEW_URL}"`)
    expect(html).not.toContain('thumb.png')
  })
})
