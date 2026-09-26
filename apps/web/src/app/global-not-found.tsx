// @see https://x.com/huozhi/status/1921693249577889878
import '../styles/index.css'

import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'

import { NotFound404 } from '~/components/common/404'
import { Global } from '~/components/common/Global'
import { AccentColorStyleInjector } from '~/components/modules/shared/AccentColorStyleInjector'
import { defaultLocale, defaultTimeZone } from '~/i18n/config'
import { getLocaleFontStyle } from '~/lib/font-locale'
import { fontVariables } from '~/lib/fonts'

import defaultMessages from '../messages/zh'
import { fetchAggregationData } from './[locale]/api'

export default async function GlobalNotFound() {
  const locale = defaultLocale
  const localeFontStyle = getLocaleFontStyle(locale)
  const messages = defaultMessages

  const data = await fetchAggregationData({ locale }).catch(() => null)

  return (
    <html suppressHydrationWarning className="themed" lang={locale}>
      <head>
        <Global />
        {data?.theme.config?.color && (
          <AccentColorStyleInjector color={data.theme.config.color} />
        )}
      </head>
      <body
        suppressHydrationWarning
        className={`${fontVariables} m-0 h-full p-0 font-sans`}
        style={localeFontStyle}
      >
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone={defaultTimeZone}
        >
          <div data-theme className="min-h-screen" id="root">
            <NotFound404 />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  title: "This planet doesn't have knowledge yet, go explore other places.",
  robots: {
    index: false,
  },
}
