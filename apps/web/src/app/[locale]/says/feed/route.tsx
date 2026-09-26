import { getTranslations } from 'next-intl/server'
import RSS from 'rss'

import type { Locale } from '~/i18n/config'
import { apiClient } from '~/lib/request'
import { unwrapFeedAggregate } from '~/lib/rss/aggregate'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'

export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 1 day

export async function GET(
  _req: Request,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params
  const t = await getTranslations({ locale, namespace: 'common' })
  const [agg, says] = await Promise.all([
    fetch(apiClient.aggregate.proxy.toString(true), {
      next: {
        revalidate: 86400,
      },
    }).then(async (res) => unwrapFeedAggregate(await res.json())),
    apiClient.say.getAllPaginated(1, 20),
  ])

  const { title, description } = agg.seo
  const currentLocale = locale as Locale
  const webUrl = agg.url.webUrl.replace(/\/$/, '')
  const saysPath = buildLocalePrefixedPath(currentLocale, '/says')
  const feedPath = buildLocalePrefixedPath(currentLocale, '/says/feed')
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    'zh-TW': 'zh-TW',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
  }

  const now = new Date()
  const feed = new RSS({
    title: `${t('page_title_says')} - ${title}`,
    description,
    site_url: `${webUrl}${saysPath}`,
    feed_url: `${webUrl}${feedPath}`,
    language: localeMap[locale] || 'zh-CN',
    generator: 'Yohaku (https://github.com/Innei/Yohaku)',
    pubDate: now.toUTCString(),
  })

  for (const say of says.data) {
    feed.item({
      title: `来源于 ${say.source || say.author} 的一言`,
      description: `${say.text}\n\n —— ${say.source || say.author}`,
      url: `${webUrl}${saysPath}`,
      author: `${say.source || say.author}`,
      guid: say.id,
      date: say.createdAt,
    })
  }

  return new Response(feed.xml(), {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
