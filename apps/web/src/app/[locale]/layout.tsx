import '../../styles/index.css'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import type { PropsWithChildren } from 'react'

import PKG from '~/../package.json'
import { MiSansLoader } from '~/components/common/MiSansLoader'
import { PublicEnvScript } from '~/components/common/PublicEnvScript'
import { AppShell } from '~/components/layout/root/AppShell'
import { AccentColorStyleInjector } from '~/components/modules/shared/AccentColorStyleInjector'
import type { Locale } from '~/i18n/config'
import { defaultTimeZone, locales } from '~/i18n/config'
import { routing } from '~/i18n/routing'
import { PreRenderError } from '~/lib/error-factory'
import { getLocaleFontStyle } from '~/lib/font-locale'
import { fontVariables } from '~/lib/fonts'
import { buildLocalePrefixedPath, HREFLANG_BY_LOCALE } from '~/lib/seo/hreflang'
import { resolveTwitterCreator, SEO_TITLE_SEPARATOR } from '~/lib/seo/metadata'
import { DEFAULT_VIEWPORT } from '~/lib/seo/viewport'
import { ScriptInjectProvider } from '~/providers/root/script-inject-provider'

import { fetchAggregationData } from './api'

const { version } = PKG

export const revalidate = 600
export const viewport = DEFAULT_VIEWPORT
export const generateStaticParams = () => locales.map((locale) => ({ locale }))

interface Props extends PropsWithChildren {
  params: Promise<{ locale: string }>
}

export const generateMetadata = async ({
  params,
}: Pick<Props, 'params'>): Promise<Metadata> => {
  const { locale } = await params
  const data = await fetchAggregationData({
    locale: locale as Locale,
  }).catch(() => null)

  if (!data) {
    return {}
  }

  const { seo, url, user } = data
  const twitterCreator = resolveTwitterCreator(user.socialIds)

  return {
    metadataBase: new URL(url.webUrl),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    title: {
      default: seo.title,
      template: `%s${SEO_TITLE_SEPARATOR}${seo.title}`,
    },
    description: seo.description,
    keywords: seo.keywords || [],
    openGraph: {
      title: seo.title,
      description: seo.description,
      siteName: seo.title,
      type: 'website',
      url: url.webUrl,
      images: [{ url: `${url.webUrl}/home-og?lang=${locale}` }],
    },
    twitter: {
      ...(twitterCreator ? { creator: twitterCreator } : {}),
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
    other: {
      'apple-itunes-app': 'app-id=6801247831',
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const currentLocale = locale as Locale
  const localeFontStyle = getLocaleFontStyle(currentLocale)

  const messages = await getMessages({ locale: currentLocale })
  const tError = await getTranslations({
    locale: currentLocale,
    namespace: 'error',
  })

  const data = await fetchAggregationData({ locale: currentLocale }).catch(
    (err) => new PreRenderError(err.message),
  )

  if (data instanceof PreRenderError) {
    return (
      <html suppressHydrationWarning className="themed" lang={locale}>
        <head>
          <PublicEnvScript />
          <link
            crossOrigin=""
            href="https://cdn.jsdelivr.net"
            rel="preconnect"
          />
          {currentLocale === 'ko' && (
            <link href="/fonts/kopub.css" rel="stylesheet" />
          )}
          <SayHi />
        </head>
        <body
          suppressHydrationWarning
          className={`${fontVariables} m-0 h-full p-0 font-sans`}
          style={localeFontStyle}
        >
          <NextIntlClientProvider
            locale={currentLocale}
            messages={messages}
            timeZone={defaultTimeZone}
          >
            <MiSansLoader locale={currentLocale} />
            <div className="center flex h-screen">
              {tError('api_fetchError')}
              <br />
              {data.message}
            </div>
          </NextIntlClientProvider>
        </body>
      </html>
    )
  }

  const themeConfig = data.theme
  const localizedHomeUrl = new URL(
    buildLocalePrefixedPath(currentLocale, '/'),
    data.url.webUrl,
  ).toString()
  const localizedSearchUrl = new URL(
    buildLocalePrefixedPath(currentLocale, '/search'),
    data.url.webUrl,
  ).toString()

  const webSiteLdJson = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: data.seo.title,
    url: localizedHomeUrl,
    description: data.seo.description,
    inLanguage: HREFLANG_BY_LOCALE[currentLocale],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${localizedSearchUrl}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html suppressHydrationWarning className="themed" lang={locale}>
      <head>
        <PublicEnvScript />
        <link crossOrigin="" href="https://cdn.jsdelivr.net" rel="preconnect" />
        {currentLocale === 'ko' && (
          <link href="/fonts/kopub.css" rel="stylesheet" />
        )}
        <SayHi />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteLdJson),
          }}
        />
        {themeConfig.config?.color && (
          <AccentColorStyleInjector color={themeConfig.config.color} />
        )}
        <ScriptInjectProvider />
      </head>
      <body
        suppressHydrationWarning
        className={`${fontVariables} m-0 h-full p-0 font-sans`}
        style={localeFontStyle}
      >
        <AppShell data={data} locale={currentLocale} messages={messages}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}

const SayHi = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `var version = "${version}";
    (${function () {
      console.info(
        `%c Mix Space %c https://github.com/mx-space`,
        'color: #fff; margin: 1em 0; padding: 5px 0; background: #2980b9;',
        'margin: 1em 0; padding: 5px 0; background: #efefef;',
      )
      console.info(
        `%c 余白 / Yohaku ${window.version} %c https://github.com/Innei/Yohaku`,
        'color: #fff; margin: 1em 0; padding: 5px 0; background: #39C5BB;',
        'margin: 1em 0; padding: 5px 0; background: #efefef;',
      )

      const motto = `
余白 / Yohaku
--------
What's left unsaid holds the most weight.

The blank space is part of the writing.
`

      if (document.firstChild?.nodeType !== Node.COMMENT_NODE) {
        document.prepend(document.createComment(motto))
      }
    }.toString()})();`,
    }}
  />
)

declare global {
  interface Window {
    version: string
  }
}
