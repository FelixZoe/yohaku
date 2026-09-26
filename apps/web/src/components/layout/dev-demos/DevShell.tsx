'use client'

import { LazyMotion, MotionConfig } from 'motion/react'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import type { JSX, PropsWithChildren } from 'react'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { MiSansLoader } from '~/components/common/MiSansLoader'
import { ProviderComposer } from '~/components/common/ProviderComposer'
import { ModalStackProvider } from '~/components/ui/modal'
import { Toaster } from '~/components/ui/toast'
import { Spring } from '~/constants/spring'
import { defaultTimeZone } from '~/i18n/config'
import zhMessages from '~/messages/zh'
import { EventProvider } from '~/providers/root/event-provider'
import { JotaiStoreProvider } from '~/providers/root/jotai-provider'
import { PageScrollInfoProvider } from '~/providers/root/page-scroll-info-provider'
import { ReactQueryProvider } from '~/providers/root/react-query-provider'

import { DEV_LOCALE } from './dev-locale'

const loadFeatures = () =>
  import('~/providers/root/framer-lazy-feature').then((res) => res.default)

const devContexts: JSX.Element[] = [
  <ReactQueryProvider key="reactQueryProvider" />,
  <ThemeProvider key="themeProvider" />,
  <JotaiStoreProvider key="jotaiStoreProvider" />,
  <LazyMotion strict features={loadFeatures} key="framer" />,
]

export const DevShell = ({ children }: PropsWithChildren) => (
  <NextIntlClientProvider
    locale={DEV_LOCALE}
    messages={zhMessages}
    timeZone={defaultTimeZone}
  >
    <MiSansLoader locale={DEV_LOCALE} />
    <ErrorBoundary>
      <ProviderComposer contexts={devContexts}>
        <MotionConfig transition={Spring.presets.smooth}>
          <div data-theme id="root">
            <div className="px-6 py-12 lg:px-10 lg:py-16">{children}</div>
          </div>
        </MotionConfig>

        <ModalStackProvider />
        <EventProvider />
        <PageScrollInfoProvider />
        <Toaster />
      </ProviderComposer>
    </ErrorBoundary>
  </NextIntlClientProvider>
)
