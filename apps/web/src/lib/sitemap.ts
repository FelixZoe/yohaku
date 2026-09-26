import { buildNoteSeoPath, parseNotePath } from './note-route'

export type SitemapEntry = {
  url: string
  published_at?: string | null
}

export type SitemapNoteRouteData = {
  nid: number | string
  slug?: string | null
  createdAt?: string | Date | null
}

const replaceNotePath = (sourceUrl: string, canonicalPath: string) => {
  try {
    const url = new URL(sourceUrl)
    url.pathname = canonicalPath
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return sourceUrl.startsWith('/') ? canonicalPath : sourceUrl
  }
}

export const canonicalizeSitemapNoteUrls = (
  entries: readonly SitemapEntry[],
  notes: readonly SitemapNoteRouteData[],
): SitemapEntry[] => {
  const notesByNid = new Map(notes.map((note) => [String(note.nid), note]))

  return entries.map((entry) => {
    const parsedPath = parseNotePath(entry.url)
    if (parsedPath?.kind !== 'nid') {
      return entry
    }

    const note = notesByNid.get(String(parsedPath.nid))
    const canonicalPath = note ? buildNoteSeoPath(note) : null
    if (!canonicalPath) {
      return entry
    }

    const canonicalUrl = replaceNotePath(entry.url, canonicalPath)
    return canonicalUrl === entry.url ? entry : { ...entry, url: canonicalUrl }
  })
}
