import { getTranslations } from 'next-intl/server'
import RSS from 'rss'

import type { Locale } from '~/i18n/config'
import {
  companionMomentSummary,
  formatPlaybackTime,
  parseCompanionMomentMetadata,
} from '~/lib/companion-moment'
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
  const tThinking = await getTranslations({
    locale,
    namespace: 'thinking',
  })
  const [agg, thinking] = await Promise.all([
    fetch(apiClient.aggregate.proxy.toString(true), {
      next: {
        revalidate: 86400,
      },
    }).then(async (res) => unwrapFeedAggregate(await res.json())),
    apiClient.recently.getList({
      size: 20,
    }),
  ])

  const { title, description } = agg.seo
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    'zh-TW': 'zh-TW',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
  }

  const currentLocale = locale as Locale
  const webUrl = agg.url.webUrl.replace(/\/$/, '')
  const thinkingPath = buildLocalePrefixedPath(currentLocale, '/thinking')
  const feedPath = buildLocalePrefixedPath(currentLocale, '/thinking/feed')

  const now = new Date()
  const feed = new RSS({
    title: `${tThinking('page_title')} - ${title}`,
    description,
    site_url: `${webUrl}${thinkingPath}`,
    feed_url: `${webUrl}${feedPath}`,
    language: localeMap[locale] || 'zh-CN',
    generator: 'Yohaku (https://github.com/Innei/Yohaku)',
    pubDate: now.toUTCString(),
  })

  for (const t of thinking) {
    const itemPath = buildLocalePrefixedPath(currentLocale, `/thinking/${t.id}`)
    const itemUrl = `${webUrl}${itemPath}`

    const companionMoment = parseCompanionMomentMetadata(t.metadata)
    const contextLines: string[] = []
    if (companionMoment?.media) {
      const { media } = companionMoment
      const identity = [media.title, media.artist].filter(Boolean).join(' — ')
      const position = media.playback.positionMs
      const duration = media.playback.durationMs
      const playback =
        position === null
          ? ''
          : duration === null
            ? tThinking('moment_playback_at', {
                position: formatPlaybackTime(position),
              })
            : tThinking('moment_playback_progress', {
                position: formatPlaybackTime(position),
                duration: formatPlaybackTime(duration),
              })
      contextLines.push(
        [
          tThinking('moment_media'),
          identity,
          media.player?.displayName,
          playback,
        ]
          .filter(Boolean)
          .join(' · '),
      )
    }
    if (companionMoment?.application) {
      contextLines.push(
        [
          tThinking('moment_application'),
          companionMoment.application.displayName,
          companionMoment.application.window?.title,
        ]
          .filter(Boolean)
          .join(' · '),
      )
    }
    const primaryContent =
      t.content ||
      (companionMoment ? companionMomentSummary(companionMoment) : '')

    feed.item({
      title: new Date(t.createdAt).toLocaleDateString(localeMap[locale]),
      description:
        `${primaryContent}\n\n${contextLines.join('\n')}\n\n${t.ref?.title ? tThinking('feed_reference', { title: t.ref.title }) : ''}\n\n` +
        ` <p style='text-align: right'>
      <a href='${itemUrl}'>${tThinking('feed_comment_cta')}</a>
      </p>`,
      url: itemUrl,
      guid: t.id,
      date: t.createdAt,
    })
  }

  return new Response(feed.xml(), {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
