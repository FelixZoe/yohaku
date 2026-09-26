import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLinkCardEnrichment } from '~/components/ui/link-card'
import { resolveEnrichmentFromUrl } from '~/lib/enrichment/resolve'
import type { EnrichmentResult } from '~/models/enrichment'

import { useInlineLinkEnrichment } from './use-inline-link-enrichment'

vi.mock('~/lib/enrichment/resolve', () => ({
  resolveEnrichmentFromUrl: vi.fn(),
}))

vi.mock('~/components/ui/link-card', () => ({
  useLinkCardEnrichment: vi.fn(),
}))

const useQueryMock = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}))

const sampleEnrichment: EnrichmentResult = {
  category: 'media',
  fetchedAt: '2026-05-07T00:00:00Z',
  title: 'Sample',
  url: 'https://example.com/sample',
}

function captureLastOptions() {
  const last = useQueryMock.mock.calls.at(-1)
  if (!last) throw new Error('useQuery was not called')
  return last[0] as {
    queryKey: unknown[]
    queryFn: () => Promise<EnrichmentResult | null>
    enabled: boolean
    initialData: EnrichmentResult | undefined
    staleTime:
      | number
      | ((q: {
          state: { data: EnrichmentResult | null | undefined }
        }) => number)
    gcTime: number
    retry: false
    refetchOnWindowFocus: false
  }
}

beforeEach(() => {
  vi.mocked(resolveEnrichmentFromUrl).mockReset()
  vi.mocked(useLinkCardEnrichment).mockReset()
  useQueryMock.mockReset()
  useQueryMock.mockReturnValue({ data: undefined })
})

describe('useInlineLinkEnrichment', () => {
  it('uses SSR initialData when EnrichmentMap has the URL and skips fetching', async () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(sampleEnrichment)
    useQueryMock.mockReturnValue({ data: sampleEnrichment })

    const result = useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    expect(options.initialData).toEqual(sampleEnrichment)
    expect(options.queryKey).toEqual([
      'enrichment',
      'https://example.com/sample',
    ])
    expect(result.data).toEqual(sampleEnrichment)
    expect(resolveEnrichmentFromUrl).not.toHaveBeenCalled()
  })

  it('converts SSR null to undefined initialData so the query can run', () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)

    useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    expect(options.initialData).toBeUndefined()
  })

  it('passes enabled=false through when the consumer gate is closed', () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)

    useInlineLinkEnrichment('https://example.com/sample', false)

    const options = captureLastOptions()
    expect(options.enabled).toBe(false)
    expect(resolveEnrichmentFromUrl).not.toHaveBeenCalled()
  })

  it('passes enabled=false when the URL is empty even if consumer enabled is true', () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)

    useInlineLinkEnrichment('', true)

    const options = captureLastOptions()
    expect(options.enabled).toBe(false)
    expect(resolveEnrichmentFromUrl).not.toHaveBeenCalled()
  })

  it('queryFn calls resolveEnrichmentFromUrl with the URL and unwraps enrichment', async () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)
    vi.mocked(resolveEnrichmentFromUrl).mockResolvedValueOnce({
      enrichment: sampleEnrichment,
    })

    useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    const data = await options.queryFn()

    expect(resolveEnrichmentFromUrl).toHaveBeenCalledTimes(1)
    expect(resolveEnrichmentFromUrl).toHaveBeenCalledWith(
      'https://example.com/sample',
    )
    expect(data).toEqual(sampleEnrichment)
  })

  it('queryFn returns null when resolveEnrichmentFromUrl resolves to null', async () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)
    vi.mocked(resolveEnrichmentFromUrl).mockResolvedValueOnce(null)

    useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    const data = await options.queryFn()

    expect(data).toBeNull()
  })

  it('configures retry=false and refetchOnWindowFocus=false', () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)

    useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    expect(options.retry).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it('keeps successful enrichments fresh forever but treats null/undefined as immediately stale', () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)

    useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    expect(options.gcTime).toBe(1000 * 60 * 30)
    if (typeof options.staleTime !== 'function') {
      throw new TypeError('expected staleTime to be a function')
    }
    expect(options.staleTime({ state: { data: sampleEnrichment } })).toBe(
      Infinity,
    )
    expect(options.staleTime({ state: { data: null } })).toBe(0)
    expect(options.staleTime({ state: { data: undefined } })).toBe(0)
  })

  it('propagates queryFn errors so React Query enters error state instead of caching null', async () => {
    vi.mocked(useLinkCardEnrichment).mockReturnValue(null)
    vi.mocked(resolveEnrichmentFromUrl).mockRejectedValueOnce(
      new Error('network'),
    )

    useInlineLinkEnrichment('https://example.com/sample', true)

    const options = captureLastOptions()
    await expect(options.queryFn()).rejects.toThrow('network')
    expect(resolveEnrichmentFromUrl).toHaveBeenCalledTimes(1)
    expect(options.retry).toBe(false)
  })
})
