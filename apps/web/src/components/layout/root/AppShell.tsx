'use client'

import { NextIntlClientProvider } from 'next-intl'
import type { ComponentProps, PropsWithChildren } from 'react'

import type { AggregationDataPayload } from '~/app/[locale]/aggregation-data'
import { Analyze } from '~/app/[locale]/analyze'
import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { Global } from '~/components/common/Global'
import { HydrationEndDetector } from '~/components/common/HydrationEndDetector'
import { MiSansLoader } from '~/components/common/MiSansLoader'
import { OpenPanelInit } from '~/components/common/OpenPanelInit'
import { SafariDetector } from '~/components/common/SafariDetector'
import { SyncServerTime } from '~/components/common/SyncServerTime'
import { Root } from '~/components/layout/root/Root'
import { SearchPanelWithHotKey } from '~/components/modules/shared/SearchPanel'
import { BackgroundTexture } from '~/components/ui/background/BackgroundTexture'
import { RootPortal } from '~/components/ui/portal'
import type { Locale } from '~/i18n/config'
import { defaultTimeZone } from '~/i18n/config'
import { WebAppProviders } from '~/providers/root'
import { AggregationProvider } from '~/providers/root/aggregation-data-provider'

interface AppShellProps extends PropsWithChildren {
  data: AggregationDataPayload
  locale: Locale
  messages: ComponentProps<typeof NextIntlClientProvider>['messages']
}

// Single server->client boundary for the whole shell. Keeping every shell
// widget a separate boundary makes the RSC flight repeat a ~3KB chunk
// manifest per widget; rooting them under one client component collapses
// ~33 `I` rows into one.
export const AppShell = ({
  locale,
  messages,
  data,
  children,
}: AppShellProps) => {
  const openpanel = data.theme.config.module?.openpanel

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={defaultTimeZone}
    >
      <Global />
      <HydrationEndDetector />
      <SafariDetector />
      <MiSansLoader locale={locale} />
      <ErrorBoundary>
        <WebAppProviders>
          {openpanel?.enable && (
            <OpenPanelInit
              apiUrl={openpanel.url}
              clientId={openpanel.id}
              trackOutgoingLinks={true}
              trackScreenViews={true}
            />
          )}
          <AggregationProvider
            aggregationData={data}
            appConfig={data.theme.config}
          />
          <div data-theme id="root">
            <Root footerConfig={data.theme.footer}>{children}</Root>
          </div>
          <SearchPanelWithHotKey />
          <Analyze />
          <SyncServerTime />
          <div className="fixed inset-y-0 right-0 w-[var(--removed-body-scroll-bar-size)]" />
          <RootPortal>
            <BackgroundTexture />
          </RootPortal>
        </WebAppProviders>
      </ErrorBoundary>
    </NextIntlClientProvider>
  )
}
