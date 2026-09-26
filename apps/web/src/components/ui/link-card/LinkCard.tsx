'use client'

import type { FC, ReactNode } from 'react'

import type { EnrichmentResult } from '~/models/enrichment'

import { LinkCardVariant } from './dispatch'
import { useEnrichmentForUrl } from './EnrichmentMapContext'

export interface LinkCardProps {
  className?: string
  /**
   * Rendered when no enrichment is available for the URL. Useful for falling
   * back to a plain link in markdown block-link renderers — without it an
   * unmatched URL collapses silently.
   */
  fallback?: ReactNode
  url: string
}

/**
 * Reads the inline `EnrichmentMapProvider` populated by the article API.
 *
 * The backend hydrates link-card data into `data.enrichments` server-side, so
 * the inline map is the single source of truth — no client-side
 * `/enrichment/resolve` fetch is performed here. URLs without a provider
 * match (or that the backend hasn't extracted yet) deliberately surface as
 * `null` so callers can render a plain link without a hydration flash.
 */
export function useLinkCardEnrichment(url: string): EnrichmentResult | null {
  return useEnrichmentForUrl(url) ?? null
}

/**
 * Unified link card. Reads from the page-level `EnrichmentMapProvider` only —
 * the backend hydrates the inline map, so we never need to fetch on the
 * client. URLs missing from the map fall through to {@link fallback}.
 */
export const LinkCard: FC<LinkCardProps> = ({ url, className, fallback }) => {
  const result = useLinkCardEnrichment(url)
  if (result) return <LinkCardVariant className={className} data={result} />
  return <>{fallback ?? null}</>
}
