export interface TagGlossaryPair {
  source: string
  translated: string
}

export const tagGlossaryPairsOf = (
  meta: unknown,
): TagGlossaryPair[] | undefined => {
  if (!meta || typeof meta !== 'object') return undefined
  const glossary = (meta as { glossary?: unknown }).glossary
  if (!glossary || typeof glossary !== 'object') return undefined
  const tags = (glossary as { tags?: unknown }).tags
  return Array.isArray(tags) ? (tags as TagGlossaryPair[]) : undefined
}

export type TagLabeler = (tag: string) => string

export const createTagLabeler = (pairs?: TagGlossaryPair[]): TagLabeler => {
  if (!pairs?.length) return (tag) => tag
  const map = new Map(pairs.map((pair) => [pair.source, pair.translated]))
  return (tag) => map.get(tag) ?? tag
}
