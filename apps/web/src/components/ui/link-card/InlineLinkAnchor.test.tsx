import type { FC, PropsWithChildren } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EnrichmentResult } from '~/models/enrichment'

const isExternalHttpUrlMock = vi.fn<(href: string, host: string) => boolean>()
const useIsMobileMock = vi.fn<() => boolean>()
const useInlineLinkEnrichmentMock =
  vi.fn<
    (
      url: string,
      enabled: boolean,
    ) => { data: EnrichmentResult | null | undefined }
  >()

vi.mock('~/atoms/hooks/viewport', () => ({
  useIsMobile: () => useIsMobileMock(),
}))

vi.mock('~/lib/link-eligibility', () => ({
  isExternalHttpUrl: (href: string, host: string) =>
    isExternalHttpUrlMock(href, host),
}))

vi.mock('~/queries/hooks/use-inline-link-enrichment', () => ({
  useInlineLinkEnrichment: (url: string, enabled: boolean) =>
    useInlineLinkEnrichmentMock(url, enabled),
}))

vi.mock('~/components/ui/portal', () => ({
  RootPortal: (({ children }) => <>{children}</>) satisfies FC<
    PropsWithChildren<{ to?: HTMLElement }>
  >,
}))

vi.mock('motion/react', async () => {
  const React = await import('react')
  const AnimatePresence = (({ children }) =>
    React.createElement(
      React.Fragment,
      null,
      children,
    )) satisfies FC<PropsWithChildren>

  const proxy: any = new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...rest }: any) =>
          React.createElement('div', rest, children),
    },
  )
  return { AnimatePresence, m: proxy }
})

const sampleEnrichment: EnrichmentResult = {
  category: 'web',
  fetchedAt: '2026-05-01T00:00:00Z',
  title: 'External Page',
  url: 'https://example.com/path',
}

beforeEach(() => {
  isExternalHttpUrlMock.mockReset()
  useIsMobileMock.mockReset()
  useInlineLinkEnrichmentMock.mockReset()
})

async function importComponent() {
  const mod = await import('./InlineLinkAnchor')
  return mod.InlineLinkAnchor
}

describe('InlineLinkAnchor', () => {
  it('renders a bare anchor for non-external URLs (e.g. mailto:)', async () => {
    isExternalHttpUrlMock.mockReturnValue(false)
    useIsMobileMock.mockReturnValue(false)
    useInlineLinkEnrichmentMock.mockReturnValue({ data: undefined })

    const InlineLinkAnchor = await importComponent()
    const html = renderToStaticMarkup(
      <InlineLinkAnchor
        className="link"
        href="mailto:foo@bar.com"
        rel="noopener"
        target="_blank"
      >
        contact
      </InlineLinkAnchor>,
    )

    expect(html).toBe(
      '<a class="link" href="mailto:foo@bar.com" rel="noopener" target="_blank">contact</a>',
    )
    expect(html).not.toContain('float-popover')
  })

  it('renders a bare anchor on mobile even when eligible', async () => {
    isExternalHttpUrlMock.mockReturnValue(true)
    useIsMobileMock.mockReturnValue(true)
    useInlineLinkEnrichmentMock.mockReturnValue({ data: sampleEnrichment })

    const InlineLinkAnchor = await importComponent()
    const html = renderToStaticMarkup(
      <InlineLinkAnchor
        className="link"
        href="https://example.com/path"
        rel="noopener"
        target="_blank"
      >
        page
      </InlineLinkAnchor>,
    )

    expect(html).toBe(
      '<a class="link" href="https://example.com/path" rel="noopener" target="_blank">page</a>',
    )
    expect(html).not.toContain('float-popover')
  })

  it('renders trigger without popover when external + not hovering', async () => {
    isExternalHttpUrlMock.mockReturnValue(true)
    useIsMobileMock.mockReturnValue(false)
    useInlineLinkEnrichmentMock.mockReturnValue({ data: undefined })

    const InlineLinkAnchor = await importComponent()
    const html = renderToStaticMarkup(
      <InlineLinkAnchor className="link" href="https://example.com/path">
        page
      </InlineLinkAnchor>,
    )

    expect(html).toContain('<a class="link" href="https://example.com/path"')
    expect(html).not.toContain('float-popover')
    expect(html).not.toContain('External Page')
  })

  it('renders trigger without popover when hovering but data null', async () => {
    isExternalHttpUrlMock.mockReturnValue(true)
    useIsMobileMock.mockReturnValue(false)
    // The hook returned null (success but provider had nothing).
    // SSR pass starts with hovered=false anyway, so popover never opens.
    useInlineLinkEnrichmentMock.mockReturnValue({ data: null })

    const InlineLinkAnchor = await importComponent()
    const html = renderToStaticMarkup(
      <InlineLinkAnchor className="link" href="https://example.com/path">
        page
      </InlineLinkAnchor>,
    )

    expect(html).not.toContain('float-popover')
    expect(html).not.toContain('External Page')
  })

  it('queries the enrichment hook with the href and initial enabled=false', async () => {
    isExternalHttpUrlMock.mockReturnValue(true)
    useIsMobileMock.mockReturnValue(false)
    useInlineLinkEnrichmentMock.mockReturnValue({ data: undefined })

    const InlineLinkAnchor = await importComponent()
    renderToStaticMarkup(
      <InlineLinkAnchor className="link" href="https://example.com/path">
        page
      </InlineLinkAnchor>,
    )

    expect(useInlineLinkEnrichmentMock).toHaveBeenCalled()
    const [calledHref, calledEnabled] =
      useInlineLinkEnrichmentMock.mock.calls[0]
    expect(calledHref).toBe('https://example.com/path')
    // On the SSR pass: hovered starts false and eligible flips true only after
    // the post-mount effect; the first synchronous render passes enabled=false.
    expect(calledEnabled).toBe(false)
  })

  it('passes className/rel/target through on the bare-anchor path', async () => {
    isExternalHttpUrlMock.mockReturnValue(false)
    useIsMobileMock.mockReturnValue(false)
    useInlineLinkEnrichmentMock.mockReturnValue({ data: undefined })

    const InlineLinkAnchor = await importComponent()
    const html = renderToStaticMarkup(
      <InlineLinkAnchor
        className="my-class"
        href="https://same.example.com/page"
        rel="nofollow"
        target="_self"
      >
        text
      </InlineLinkAnchor>,
    )

    expect(html).toContain('class="my-class"')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('target="_self"')
  })
})
