import type { EnrichmentMap, EnrichmentResult } from '@mx-space/api-client'

export type RecentlyVerbKey =
  | 'musings_verb_watched'
  | 'musings_verb_read'
  | 'musings_verb_listened'
  | 'musings_verb_studied'
  | 'musings_verb_linked_to'

export type EnrichedRecentlyLink = {
  verbKey: RecentlyVerbKey
  title: string
  url: string
}

export type ParsedRecently =
  | { kind: 'plain'; content: string }
  | {
      kind: 'enriched'
      description: string | null
      link: EnrichedRecentlyLink
    }

export const pickRecentlyVerbKey = (
  enrichment: EnrichmentResult,
): RecentlyVerbKey => {
  const category = enrichment.category ?? ''
  const subtype = enrichment.subtype ?? ''
  if (category === 'media') {
    if (subtype === 'movie' || subtype === 'tv') return 'musings_verb_watched'
    if (subtype === 'book') return 'musings_verb_read'
    if (subtype === 'music' || subtype === 'album' || subtype === 'song')
      return 'musings_verb_listened'
  }
  if (category === 'book') return 'musings_verb_read'
  if (category === 'music') return 'musings_verb_listened'
  if (category === 'academic') return 'musings_verb_studied'
  return 'musings_verb_linked_to'
}

const isHttpUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const resolveLink = (
  candidate: string,
  enrichments: EnrichmentMap | undefined,
): EnrichedRecentlyLink | null => {
  if (!isHttpUrl(candidate)) return null
  const enrichment = enrichments?.[candidate]
  if (!enrichment?.title || !enrichment.url) return null
  return {
    verbKey: pickRecentlyVerbKey(enrichment),
    title: enrichment.title,
    url: enrichment.url,
  }
}

export const parseRecentlyContent = (
  content: string,
  enrichments?: EnrichmentMap,
): ParsedRecently => {
  const original = content ?? ''
  const trimmed = original.trim()
  if (!trimmed) return { kind: 'plain', content: original }

  const wholeLink = resolveLink(trimmed, enrichments)
  if (wholeLink) {
    return { kind: 'enriched', description: null, link: wholeLink }
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length >= 2) {
    for (let i = 0; i < paragraphs.length; i++) {
      const link = resolveLink(paragraphs[i], enrichments)
      if (link) {
        const description = paragraphs
          .filter((_, idx) => idx !== i)
          .join('\n\n')
        return {
          kind: 'enriched',
          description: description || null,
          link,
        }
      }
    }
  }

  return { kind: 'plain', content: original }
}
