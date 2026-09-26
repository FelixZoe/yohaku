import type { TimelineData } from '@mx-space/api-client'
import { TimelineType } from '@mx-space/api-client'

import { escapeXml } from '~/lib/helper.server'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'
import { canonicalizeSitemapNoteUrls, type SitemapEntry } from '~/lib/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour
export const GET = async () => {
  const queryClient = getQueryClient()

  const data = await queryClient.fetchQuery({
    queryKey: ['sitemap'],
    queryFn: async () => {
      const path = apiClient.aggregate.proxy.sitemap.toString(true)
      const [sitemapResponse, timeline] = await Promise.all([
        fetch(path),
        apiClient.aggregate.getTimeline({ type: TimelineType.Note }),
      ])

      if (!sitemapResponse.ok) {
        throw new Error(`Failed to fetch sitemap: ${sitemapResponse.status}`)
      }

      const sitemap = (await sitemapResponse.json()) as {
        data: SitemapEntry[]
      }
      const notes = (timeline.notes ?? []) as SitemapTimelineNote[]

      return canonicalizeSitemapNoteUrls(sitemap.data, notes)
    },
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${data
  .map((item: any) => {
    const loc = escapeXml(String(item.url ?? ''))
    const lastmod = item.published_at
      ? escapeXml(String(item.published_at))
      : ''

    return `<url>
  <loc>${loc}</loc>
${lastmod ? `  <lastmod>${lastmod}</lastmod>` : ''}</url>`
  })
  .join('')}
</urlset>`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}

type SitemapTimelineNote = NonNullable<TimelineData['notes']>[number] & {
  slug?: string | null
}
