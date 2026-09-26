import type { MetadataRoute } from 'next'

import { AGGREGATE_CACHE_TAG, withCacheTag } from '~/lib/cache-tags'
import { apiClient } from '~/lib/request'

const resolveSitemapUrl = (webUrl?: string) => {
  if (!webUrl) return undefined

  try {
    return new URL('/sitemap', webUrl).toString()
  } catch {
    return undefined
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  let sitemapUrl: string | undefined
  try {
    const data = await apiClient.aggregate.getSiteMetadata({
      next: withCacheTag(AGGREGATE_CACHE_TAG, { revalidate: 3600 }),
    })
    sitemapUrl = resolveSitemapUrl(data?.url?.webUrl)
  } catch {}

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/preview', '/*/preview'],
      },
    ],
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  }
}
