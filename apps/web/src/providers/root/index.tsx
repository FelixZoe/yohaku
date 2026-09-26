'use client'

import { LazyMotion, MotionConfig } from 'motion/react'
import { ThemeProvider } from 'next-themes'
import type { JSX, PropsWithChildren } from 'react'

import { FaviconSwitcher } from '~/components/common/FaviconSwitcher'
import { PeekPortal } from '~/components/modules/peek/PeekPortal'
import { ModalStackProvider } from '~/components/ui/modal'
import { Toaster } from '~/components/ui/toast'
import { Spring } from '~/constants/spring'
import { isDev } from '~/lib/env'

import { ProviderComposer } from '../../components/common/ProviderComposer'
import { AuthSessionProvider } from './auth-session-provider'
import { ChunkErrorGuardProvider } from './chunk-error-guard-provider'
import { DebugProvider } from './debug-provider'
import { EventProvider } from './event-provider'
import { ImmersiveReadingInteractionProvider } from './immersive-reading-interaction-provider'
import { JotaiStoreProvider } from './jotai-provider'
import { LangSyncProvider } from './lang-sync-provider'
import { LiveDeskTransportProvider } from './live-desk-provider'
import { PageScrollInfoProvider } from './page-scroll-info-provider'
import { ReactQueryProvider } from './react-query-provider'
import { ReadingStateResetProvider } from './reading-state-provider'
import { SocketContainer } from './socket-provider'

const loadFeatures = () =>
  import('./framer-lazy-feature').then((res) => res.default)

const baseContexts: JSX.Element[] = [
  <ThemeProvider key="themeProvider" />,
  <JotaiStoreProvider key="jotaiStoreProvider" />,

  <LazyMotion strict features={loadFeatures} key="framer" />,

  <LangSyncProvider key="langSyncProvider" />,
  <AuthSessionProvider key="authSessionProvider" />,
]

const webappContexts: JSX.Element[] = [
  <ReactQueryProvider key="reactQueryProvider" />,
  ...baseContexts,
]

export function WebAppProviders({ children }: PropsWithChildren) {
  return (
    <ProviderComposer contexts={webappContexts}>
      <FaviconSwitcher />
      <MotionConfig transition={Spring.presets.smooth}>{children}</MotionConfig>

      <SocketContainer />
      <LiveDeskTransportProvider />
      <ModalStackProvider key="modalStackProvider" />
      <EventProvider key="viewportProvider" />
      <PageScrollInfoProvider key="PageScrollInfoProvider" />
      <ReadingStateResetProvider key="readingStateResetProvider" />
      <ImmersiveReadingInteractionProvider key="immersiveReadingInteractionProvider" />
      <ChunkErrorGuardProvider key="chunkErrorGuardProvider" />
      {isDev && <DebugProvider key="debugProvider" />}
      <Toaster />
      <PeekPortal />
    </ProviderComposer>
  )
}
