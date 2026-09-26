import { apiClient } from '~/lib/fetch/fetch.client'
import type { EnrichmentResult } from '~/models/enrichment'

/**
 * Hit core's /enrichment/resolve to obtain normalized enrichment data
 * for a URL. Returns null if the URL is not parsable or no provider matches.
 */
export async function resolveEnrichmentFromUrl(
  urlString: string,
): Promise<{ enrichment: EnrichmentResult } | null> {
  try {
    new URL(urlString)
  } catch {
    return null
  }

  const enrichment = await apiClient.enrichment.resolveByUrl(urlString)
  if (!enrichment?.category) return null
  return { enrichment }
}
