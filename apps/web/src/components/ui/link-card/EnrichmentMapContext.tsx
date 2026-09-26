'use client'

import type { FC, ReactNode } from 'react'
import { createContext, use, useMemo } from 'react'

import type { EnrichmentResult } from '~/models/enrichment'

export type EnrichmentMap = Record<string, EnrichmentResult>

const EnrichmentMapContext = createContext<EnrichmentMap>({})

export const EnrichmentMapProvider: FC<{
  value: EnrichmentMap | null | undefined
  children: ReactNode
}> = ({ value, children }) => {
  const stable = useMemo(() => value ?? {}, [value])
  return <EnrichmentMapContext value={stable}>{children}</EnrichmentMapContext>
}

export function useEnrichmentMap(): EnrichmentMap {
  return use(EnrichmentMapContext)
}

export function useEnrichmentForUrl(url: string): EnrichmentResult | undefined {
  return useEnrichmentMap()[url]
}
