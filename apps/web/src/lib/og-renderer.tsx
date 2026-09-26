import {
  AggregateController,
  createClient,
  NoteController,
  PageController,
  PostController,
} from '@mx-space/api-client'
import { fetchAdaptor } from '@mx-space/api-client/dist/adaptors/fetch'

import { API_URL } from '~/constants/env'
import { defaultLocale } from '~/i18n/config'
import { getArticleTranslation } from '~/lib/api/meta'
import { cachePolicy, toHeaderRecord } from '~/lib/cache-policy.mjs'
import { resolveOgAvatar } from '~/lib/og-avatar'
import { renderOgImage } from '~/lib/og-image.server'
import {
  FILL,
  INK,
  INK_SOFT,
  isLatinOnly,
  loadOgFonts,
  PAPER,
  seededWash,
  TEXT_FAINT,
  TEXT_SECONDARY,
  UME,
} from '~/lib/og-shared'
import zhMessages from '~/messages/zh/common.json'

const messagesMap = {
  'zh-TW': () => import('~/messages/zh-TW/common.json').then((m) => m.default),
  en: () => import('~/messages/en/common.json').then((m) => m.default),
  ja: () => import('~/messages/ja/common.json').then((m) => m.default),
  ko: () => import('~/messages/ko/common.json').then((m) => m.default),
} as const

const apiClient = createClient(fetchAdaptor)(API_URL, {
  controllers: [
    PostController,
    NoteController,
    PageController,
    AggregateController,
  ],
})

export type OgTarget =
  | { type: 'post'; category: string; slug: string }
  | { type: 'note'; nid: string | number }
  | { type: 'page'; slug: string }

const PAPER_VEIL = `linear-gradient(to right, rgba(249,248,245,0.99) 0%, rgba(249,248,245,0.97) 44%, rgba(249,248,245,0.72) 60%, rgba(249,248,245,0.24) 80%, rgba(249,248,245,0.02) 94%, rgba(249,248,245,0) 100%)`

async function fetchCoverDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > 8 * 1024 * 1024) return null
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

const enMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatOgDate = (value: string | undefined, locale: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  switch (locale) {
    case 'ja': {
      return `${y}年${m}月${d}日`
    }
    case 'ko': {
      return `${y}. ${m}. ${d}.`
    }
    case 'en': {
      return `${enMonths[m - 1]} ${d}, ${y}`
    }
    default: {
      return `${y} 年 ${m} 月 ${d} 日`
    }
  }
}

export async function renderOg(
  target: OgTarget,
  locale?: string,
): Promise<Response> {
  try {
    const aggregation =
      await apiClient.aggregate.getAggregateData<AppThemeConfig>('yohaku|shiro')

    const messages =
      locale &&
      locale !== defaultLocale &&
      messagesMap[locale as keyof typeof messagesMap]
        ? await messagesMap[locale as keyof typeof messagesMap]()
        : zhMessages

    let document: {
      title: string
      subtitle: string
      meta: any
      id: string
      created?: string
      isTranslated?: boolean
      sourceLang?: string
    }

    switch (target.type) {
      case 'post': {
        const { category, slug } = target
        document = await apiClient.post
          .getPost(category, slug, locale ? { lang: locale } : undefined)
          .then((r) => {
            const translation = getArticleTranslation(r, r.$meta)
            return {
              title: r.title,
              subtitle: r.category.name,
              meta: r.meta,
              id: r.id,
              created: (r as any).created ?? (r.createdAt as any),
              isTranslated: translation?.isTranslated,
              sourceLang: translation?.sourceLang,
            }
          })
        break
      }

      case 'note': {
        const { nid } = target
        document = await apiClient.note
          .getNoteByNid(+nid, locale ? { lang: locale } : undefined)
          .then((r) => {
            const translation = getArticleTranslation(r, r.$meta)
            return {
              title: r.title,
              subtitle: messages.nav_notes,
              meta: r.meta,
              id: r.id,
              created: (r as any).created ?? (r.createdAt as any),
              isTranslated: translation?.isTranslated,
              sourceLang: translation?.sourceLang,
            }
          })
        break
      }
      case 'page': {
        const { slug } = target
        document = await (apiClient as any).proxy.pages
          .slug(slug)
          .get({ params: locale ? { lang: locale } : undefined })
          .then((data: any) => {
            const translation = getArticleTranslation(data, data.$meta)
            return {
              title: data.title,
              subtitle: data.subtitle || '',
              meta: data.meta,
              id: data.id,
              created: data.created,
              isTranslated: translation?.isTranslated,
              sourceLang: translation?.sourceLang,
            }
          })
        break
      }
    }

    const { subtitle, title } = document

    if (!title) {
      return new Response(
        'Failed to generate the OG image. Error: The title is required.',
        { status: 400 },
      )
    }

    const {
      user: { avatar },
      seo,
      theme,
      url: aggregationUrl,
    } = aggregation as typeof aggregation & { url?: { webUrl?: string } }

    let domain = ''
    try {
      domain = aggregationUrl?.webUrl
        ? new URL(aggregationUrl.webUrl).hostname
        : ''
    } catch {
      domain = ''
    }

    const dateText = formatOgDate(document.created, locale ?? defaultLocale)

    const useGeist =
      isLatinOnly(title) && isLatinOnly(subtitle) && isLatinOnly(seo.title)
    const { fontFamily, fonts } = await loadOgFonts(useGeist)

    const ogAvatar = resolveOgAvatar(
      theme?.config.module?.og?.avatar || avatar,
      48,
    )

    const coverUrl =
      typeof document.meta?.cover === 'string' ? document.meta.cover : null
    const coverDataUri = coverUrl ? await fetchCoverDataUri(coverUrl) : null
    const hasCover = Boolean(coverDataUri)

    let ogCacheSet = cachePolicy.og.primary
    if (locale) {
      const { isTranslated, sourceLang } = document
      const effectiveSourceLang = sourceLang ?? defaultLocale
      const isFallbackLocale =
        isTranslated === false && locale !== effectiveSourceLang
      if (isFallbackLocale) {
        ogCacheSet = cachePolicy.og.fallback
      }
    }

    const titleFontSize = hasCover
      ? title.length > 22
        ? 48
        : 58
      : title.length > 30
        ? 56
        : 68

    const png = await renderOgImage(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          backgroundColor: PAPER,
          position: 'relative',
          overflow: 'hidden',
          fontFamily,
        }}
      >
        {hasCover ? (
          <img
            height={630}
            src={coverDataUri!}
            width={1200}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: hasCover
              ? PAPER_VEIL
              : seededWash(document.id || title),
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '44px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            height={44}
            src={ogAvatar}
            width={44}
            style={{
              borderRadius: '50%',
              marginRight: '16px',
              border: `1px solid ${FILL}`,
            }}
          />
          <span
            style={{
              fontSize: '26px',
              fontFamily,
              color: INK_SOFT,
              letterSpacing: '0.02em',
            }}
          >
            {seo.title}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '80px',
            bottom: '128px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: hasCover ? '560px' : '980px',
          }}
        >
          {subtitle ? (
            <div
              style={{
                fontSize: '17px',
                letterSpacing: '0.16em',
                color: UME,
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              {subtitle}
            </div>
          ) : null}
          <div
            style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.22,
              color: INK,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '80px',
            right: '80px',
            bottom: '44px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '19px', color: TEXT_SECONDARY }}>
            {dateText}
          </span>
          {domain ? (
            <span
              style={{
                fontSize: '19px',
                fontFamily,
                color: TEXT_FAINT,
                letterSpacing: '0.04em',
              }}
            >
              {domain}
            </span>
          ) : null}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts,
      },
    )

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        ...toHeaderRecord(ogCacheSet),
      },
    })
  } catch (e: any) {
    return new Response(`Failed to generate the OG image. Error ${e.message}`, {
      status: 500,
    })
  }
}
