import { useQuery } from '@tanstack/react-query'

import { useLinkCardEnrichment } from '~/components/ui/link-card'
import { resolveEnrichmentFromUrl } from '~/lib/enrichment/resolve'
import type { EnrichmentResult } from '~/models/enrichment'

export function useInlineLinkEnrichment(url: string, enabled: boolean) {
  const ssrPrehydrated = useLinkCardEnrichment(url)

  return useQuery<EnrichmentResult | null>({
    queryKey: ['enrichment', url],
    queryFn: () =>
      resolveEnrichmentFromUrl(url).then((r) => r?.enrichment ?? null),
    enabled: enabled && url.length > 0,
    initialData: ssrPrehydrated ?? undefined,
    staleTime: (q) => (q.state.data ? Infinity : 0),
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
