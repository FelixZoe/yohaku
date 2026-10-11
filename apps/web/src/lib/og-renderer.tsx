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
import { measureLowerHalfLuminance, renderOgImage } from '~/lib/og-image.server'
import {
  fetchImageDataUri,
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

const OG_TONES = {
  light: {
    rgb: '249,248,245',
    ink: INK,
    name: INK_SOFT,
    accent: UME,
    meta: TEXT_SECONDARY,
    faint: TEXT_FAINT,
    ring: FILL,
  },
  dark: {
    rgb: '20,19,18',
    ink: '#ffffff',
    name: PAPER,
    accent: '#eaa3ae',
    meta: 'rgba(249,248,245,0.78)',
    faint: 'rgba(249,248,245,0.6)',
    ring: 'rgba(255,255,255,0.4)',
  },
}

// White and INK text reach equal WCAG contrast at this backdrop luminance.
const LIGHT_COVER_LUMINANCE = 0.195

// 0.86 at the text baseline keeps ≥10:1 contrast even if the tone guess is wrong.
const coverScrim = (rgb: string) =>
  `linear-gradient(to top, rgba(${rgb},0.86) 0%, rgba(${rgb},0.5) 42%, rgba(${rgb},0) 72%), linear-gradient(to bottom, rgba(${rgb},0.45) 0%, rgba(${rgb},0) 22%)`

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

    const coverUrl =
      typeof document.meta?.cover === 'string' ? document.meta.cover : null
    const [ogAvatar, coverDataUri] = await Promise.all([
      fetchImageDataUri(
        resolveOgAvatar(theme?.config.module?.og?.avatar || avatar, 48),
      ),
      coverUrl ? fetchImageDataUri(coverUrl) : null,
    ])
    const hasCover = Boolean(coverDataUri)
    const coverLuminance = coverDataUri
      ? await measureLowerHalfLuminance(coverDataUri, PAPER)
      : null
    const tone =
      hasCover && (coverLuminance ?? 0) <= LIGHT_COVER_LUMINANCE
        ? OG_TONES.dark
        : OG_TONES.light

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
      ? title.length > 40
        ? 48
        : 54
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
              ? coverScrim(tone.rgb)
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
          {ogAvatar ? (
            <img
              height={44}
              src={ogAvatar}
              width={44}
              style={{
                borderRadius: '50%',
                marginRight: '16px',
                border: `1px solid ${tone.ring}`,
              }}
            />
          ) : null}
          <span
            style={{
              fontSize: '26px',
              fontFamily,
              color: tone.name,
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
            bottom: hasCover ? '108px' : '128px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: hasCover ? '1040px' : '980px',
          }}
        >
          {subtitle ? (
            <div
              style={{
                fontSize: '17px',
                letterSpacing: '0.16em',
                color: tone.accent,
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
              color: tone.ink,
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
          <span style={{ fontSize: '19px', color: tone.meta }}>{dateText}</span>
          {domain ? (
            <span
              style={{
                fontSize: '19px',
                fontFamily,
                color: tone.faint,
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
