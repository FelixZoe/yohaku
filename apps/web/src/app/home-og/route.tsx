import { ImageResponse } from 'next/og'
import type { ImageResponseOptions, NextRequest } from 'next/server'

import type { Locale } from '~/i18n/config'
import { defaultLocale, locales } from '~/i18n/config'
import { cachePolicy, toHeaderRecord } from '~/lib/cache-policy.mjs'
import { resolveOgAvatar } from '~/lib/og-avatar'
import { apiClient } from '~/lib/request'

export const revalidate = 86400 // 24 hours

export const runtime = 'edge'

const resOptions = {
  width: 1200,
  height: 628,
  emoji: 'twemoji',
  headers: toHeaderRecord(cachePolicy.og.home),
} as ImageResponseOptions

const resolveLang = (value: string | null): Locale =>
  value && locales.includes(value as Locale) ? (value as Locale) : defaultLocale

export const GET = async (req: NextRequest) => {
  const lang = resolveLang(req.nextUrl.searchParams.get('lang'))
  const aggregateData = await apiClient.aggregate.getAggregateData(undefined, {
    lang,
  })

  const {
    seo,
    user: { avatar },
    theme,
    url,
  } = aggregateData.$serialized as typeof aggregateData.$serialized & {
    url?: { webUrl?: string }
  }
  const ogAvatar = resolveOgAvatar(
    (theme as AppThemeConfig | undefined)?.config.module?.og?.avatar || avatar,
    120,
  )

  let domain: string
  try {
    domain = url?.webUrl ? new URL(url.webUrl).hostname : ''
  } catch {
    domain = ''
  }

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f8f5',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(ellipse 70% 90% at 88% 12%, rgba(197,100,115,0.11), transparent 60%), radial-gradient(ellipse 60% 80% at 8% 100%, rgba(61,104,150,0.07), transparent 55%)',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
        }}
      >
        <img
          height={108}
          src={ogAvatar}
          width={108}
          style={{
            borderRadius: '50%',
            border: '1px solid rgba(20,19,18,0.06)',
            boxShadow: '0 4px 16px rgba(20,19,18,0.08)',
          }}
        />

        <div
          style={{
            fontSize: seo.title.length > 12 ? '52px' : '62px',
            fontWeight: 500,
            letterSpacing: '0.02em',
            lineHeight: 1.15,
            color: '#141312',
          }}
        >
          {seo.title}
        </div>

        {seo.description && (
          <div
            style={{
              fontSize: '25px',
              fontWeight: 400,
              color: '#5c5a55',
              maxWidth: '720px',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {seo.description}
          </div>
        )}
      </div>

      {domain ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '44px',
            display: 'flex',
            justifyContent: 'center',
            fontSize: '20px',
            color: '#a8a69f',
            letterSpacing: '0.08em',
          }}
        >
          {domain}
        </div>
      ) : null}
    </div>,
    {
      ...resOptions,
    },
  )
}
