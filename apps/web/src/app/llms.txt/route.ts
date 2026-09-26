import type { NoteModel, PageModel, PostModel } from '@mx-space/api-client'

import { AGGREGATE_CACHE_TAG, withCacheTag } from '~/lib/cache-tags'
import { buildNotePath } from '~/lib/note-route'
import { apiClient } from '~/lib/request'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

type SiteMetadataPayload = {
  seo: { title: string; description: string }
  url: { webUrl: string }
}

const LIST_SIZE = 50

const oneLine = (s: string) => s.replaceAll(/\s+/g, ' ').trim()

const formatItem = (title: string, url: string, summary?: string) => {
  const tail = summary ? `: ${oneLine(summary)}` : ''
  return `- [${oneLine(title)}](${url})${tail}`
}

export async function GET() {
  const aggregateNext = withCacheTag(AGGREGATE_CACHE_TAG, { revalidate: 3600 })

  const empty = { data: [] as any[] }
  const [site, postsResult, notesResult, pagesResult] = await Promise.all([
    apiClient.aggregate
      .getSiteMetadata({ next: aggregateNext })
      .catch(() => null) as Promise<SiteMetadataPayload | null>,
    apiClient.post
      .getList(1, LIST_SIZE, {
        select: ['title', 'slug', 'summary', 'category'],
      } as any)
      .catch(() => empty),
    apiClient.note
      .getList(1, LIST_SIZE, {
        select: ['title', 'nid', 'slug', 'createdAt'],
        withSummary: true,
      } as any)
      .catch(() => empty),
    apiClient.page
      .getList(1, LIST_SIZE, {
        select: ['title', 'slug', 'order'],
      } as any)
      .catch(() => empty),
  ])

  const webUrl = site?.url?.webUrl?.replace(/\/$/, '') ?? ''
  const title = site?.seo?.title || 'Yohaku'
  const description = site?.seo?.description || ''

  const lines: string[] = [`# ${title}`, '']
  if (description) {
    lines.push(`> ${oneLine(description)}`, '')
  }

  const posts = ((postsResult as any).data ?? []) as PostModel[]
  if (posts.length) {
    lines.push('## Posts', '')
    for (const post of posts) {
      const categorySlug = post.category?.slug
      if (!categorySlug || !post.slug) continue
      lines.push(
        formatItem(
          post.title || post.slug,
          `${webUrl}/posts/${categorySlug}/${post.slug}`,
          post.summary || undefined,
        ),
      )
    }
    lines.push('')
  }

  const notes = ((notesResult as any).data ?? []) as (NoteModel & {
    summary?: string
  })[]
  if (notes.length) {
    lines.push('## Notes', '')
    for (const note of notes) {
      if (note.nid === null || note.nid === undefined) continue
      const path = buildNotePath({
        nid: note.nid,
        slug: note.slug,
        createdAt: note.createdAt,
      })
      lines.push(
        formatItem(
          note.title || `Note #${note.nid}`,
          `${webUrl}${path}`,
          note.summary,
        ),
      )
    }
    lines.push('')
  }

  const pages = (((pagesResult as any).data ?? []) as PageModel[])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (pages.length) {
    lines.push('## Pages', '')
    for (const page of pages) {
      if (!page.slug) continue
      lines.push(formatItem(page.title || page.slug, `${webUrl}/${page.slug}`))
    }
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
