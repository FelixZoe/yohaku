'use client'

import type { PageModel } from '@mx-space/api-client'
import { clsx } from 'clsx'
import type { PropsWithChildren } from 'react'

import {
  buildRoomName,
  Presence,
  RoomProvider,
} from '~/components/modules/activity'
import { CommentAreaRootLazy } from '~/components/modules/comment'
import { TocFAB } from '~/components/modules/toc/TocFAB'
import { TocHeadingStrategyProvider } from '~/components/modules/toc/TocHeadingStrategy'
import { EnrichmentMapProvider } from '~/components/ui/link-card'
import {
  BottomToUpSoftScaleTransitionView,
  BottomToUpTransitionView,
} from '~/components/ui/transition'
import { OnlyMobile } from '~/components/ui/viewport/OnlyMobile'
import { CurrentPageDataProvider } from '~/providers/page/CurrentPageDataProvider'
import { LayoutRightSideProvider } from '~/providers/shared/LayoutRightSideProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

import {
  PageLoading,
  PagePaginator,
  PageSubTitle,
  PageTitle,
} from './pageExtra'

export const PageDetailShell = ({
  children,
  contentLang,
  data,
  enrichments,
  preview,
}: PropsWithChildren<{
  contentLang?: string
  data: PageModel
  enrichments?: unknown
  preview?: boolean
}>) => (
  <TocHeadingStrategyProvider
    contentFormat={data.contentFormat}
    hasContent={!!data.content}
  >
    <CurrentPageDataProvider data={data} />
    <EnrichmentMapProvider value={(enrichments as never) ?? null}>
      <div className="relative flex min-h-[120px] w-full">
        <PageLoading>
          <div className="relative w-full min-w-0" lang={contentLang}>
            <PageBody preview={preview} roomId={data.id}>
              <header className="mb-8">
                <BottomToUpSoftScaleTransitionView lcpOptimization delay={0}>
                  <PageTitle />
                </BottomToUpSoftScaleTransitionView>

                <BottomToUpSoftScaleTransitionView lcpOptimization delay={200}>
                  <PageSubTitle />
                </BottomToUpSoftScaleTransitionView>
              </header>
              <WrappedElementProvider eoaDetect>
                <article
                  className={clsx(
                    'mt-20',
                    data.contentFormat !== 'lexical' && 'prose',
                  )}
                >
                  <BottomToUpTransitionView lcpOptimization delay={600}>
                    {children}
                  </BottomToUpTransitionView>

                  {!preview && <Presence />}
                </article>
              </WrappedElementProvider>
            </PageBody>

            {!preview && (
              <BottomToUpSoftScaleTransitionView delay={1000}>
                <PagePaginator />
              </BottomToUpSoftScaleTransitionView>
            )}
          </div>
        </PageLoading>

        <LayoutRightSideProvider className="absolute inset-y-0 right-0 hidden translate-x-full lg:block" />
      </div>
      {!preview && (
        <BottomToUpSoftScaleTransitionView delay={1000}>
          <CommentAreaRootLazy allowComment refId={data.id} />
        </BottomToUpSoftScaleTransitionView>
      )}
    </EnrichmentMapProvider>

    <OnlyMobile>
      <TocFAB />
    </OnlyMobile>
  </TocHeadingStrategyProvider>
)

const PageBody = ({
  children,
  preview,
  roomId,
}: PropsWithChildren<{ preview?: boolean; roomId: string }>) =>
  preview ? (
    children
  ) : (
    <RoomProvider roomName={buildRoomName(roomId)}>{children}</RoomProvider>
  )
