'use client'

import { AckRead } from '~/components/common/AckRead'
import { ClientOnly } from '~/components/common/ClientOnly'
import {
  buildRoomName,
  Presence,
  RoomProvider,
} from '~/components/modules/activity'
import { CommentAreaRootLazy } from '~/components/modules/comment'
import {
  FreeWindowExpiryWatcher,
  MembershipContentUnlocker,
  MembershipReturnWatcher,
  PaywallGate,
  PurchasedEndLine,
} from '~/components/modules/membership'
import {
  PostActionAside,
  PostBottomBarAction,
  PostCopyright,
} from '~/components/modules/post'
import { ArticleRightAside } from '~/components/modules/shared/ArticleRightAside'
import {
  BackToListExit,
  BackToListLine,
} from '~/components/modules/shared/BackToList'
import { GoToAdminEditingButton } from '~/components/modules/shared/GoToAdminEditingButton'
import { ReadIndicatorForMobile } from '~/components/modules/shared/ReadIndicator'
import { TocFAB } from '~/components/modules/toc/TocFAB'
import { TocHeadingStrategyProvider } from '~/components/modules/toc/TocHeadingStrategy'
import { YohakuArticleShell } from '~/components/modules/yohaku/YohakuArticleShell'
import { YohakuMainPaperProvider } from '~/components/modules/yohaku/YohakuMainPaperContext'
import { YohakuMainPaperWrap } from '~/components/modules/yohaku/YohakuMainPaperWrap'
import { EnrichmentMapProvider } from '~/components/ui/link-card'
import {
  BottomToUpSoftScaleTransitionView,
  BottomToUpTransitionView,
} from '~/components/ui/transition'
import { OnlyMobile } from '~/components/ui/viewport/OnlyMobile'
import { articleMetaOf } from '~/lib/api/article-meta'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { LexicalImageRecordProvider } from '~/providers/article/LexicalImageRecordProvider'
import {
  CurrentPostDataProvider,
  useCurrentPostMetaSelector,
} from '~/providers/post/CurrentPostDataProvider'
import {
  LayoutRightSidePortal,
  LayoutRightSideProvider,
} from '~/providers/shared/LayoutRightSideProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

import type { PostWithTranslation } from './api'
import {
  FocusReadingEffect,
  MarkdownSelection,
  PostDataReValidate,
  PostMarkdownImageRecordProvider,
  PostMetaBarInternal,
  PostNoticeCard,
  PostTitle,
} from './pageExtra'
import { PostContent } from './PostContent'
import { YohakuPostArticleContainer } from './YohakuPostArticleContainer'

const PostPage = ({
  data: payload,
  preview,
}: {
  data: PostWithTranslation
  preview?: boolean
}) => {
  const data = payload.data
  const { id } = data
  const locked = useCurrentPostMetaSelector((meta) => meta?.paywall?.locked)
  const { category } = data
  const categoryHref = routeBuilder(Routes.Category, { slug: category.slug })
  return (
    <div className="relative w-full min-w-0">
      {!preview && <AckRead id={id} type="post" />}
      <div>
        <div className="mb-8">
          {!preview && (
            <div className="-mt-14 mb-6 flex h-8 items-center justify-between">
              <BackToListLine
                className="mb-0"
                href={categoryHref}
                label={category.name}
              />
              <GoToAdminEditingButton id={id!} type="posts" />
            </div>
          )}
          <PostTitle />

          <PostMetaBarInternal className="mb-8 justify-center" />

          <PostNoticeCard />
        </div>
        <WrappedElementProvider eoaDetect>
          <ReadIndicatorForMobile />
          {!preview && <Presence />}
          <PostMarkdownImageRecordProvider>
            <LexicalImageRecordProvider
              content={
                data.contentFormat === 'lexical' ? data.content : undefined
              }
            >
              <MarkdownSelection>
                <YohakuPostArticleContainer
                  fadeTail={!!locked}
                  prose={data.contentFormat !== 'lexical'}
                >
                  <FocusReadingEffect />
                  <PostContent contentFormat={data.contentFormat} />
                </YohakuPostArticleContainer>
              </MarkdownSelection>
              {!preview && (
                <>
                  <PaywallGate />
                  <PurchasedEndLine />
                </>
              )}
            </LexicalImageRecordProvider>
          </PostMarkdownImageRecordProvider>

          <LayoutRightSidePortal>
            <div className="yohaku-fadeable sticky top-[120px] transition-[opacity,filter] duration-[var(--yohaku-side-fade-ms)] ease-out">
              {preview ? <ArticleRightAside /> : <PostActionAside />}
            </div>
          </LayoutRightSidePortal>
        </WrappedElementProvider>
      </div>
      {!preview && (
        <ClientOnly>
          <PostCopyright />

          <PostBottomBarAction />

          <BackToListExit
            allHref={routeBuilder(Routes.Posts, {})}
            href={categoryHref}
            label={category.name}
          />
        </ClientOnly>
      )}
    </div>
  )
}

// Single client boundary for the whole post detail tree — collapses the
// page's ~40 server->client widget boundaries (one ~3KB `I` row each)
// into one.
export const PostDetailClient = ({
  data: payload,
  fetchedAt,
  preview,
}: {
  data: PostWithTranslation
  fetchedAt?: string
  preview?: boolean
}) => {
  const data = payload.data
  const articleTranslation = articleMetaOf(payload.meta).translation
  return (
    <TocHeadingStrategyProvider
      contentFormat={data.contentFormat}
      hasContent={!!data.content}
    >
      <CurrentPostDataProvider data={payload} />
      {!preview && (
        <>
          <PostDataReValidate fetchedAt={fetchedAt!} />
          <MembershipReturnWatcher />
          <MembershipContentUnlocker />
          <FreeWindowExpiryWatcher />
        </>
      )}
      <EnrichmentMapProvider value={payload.meta?.enrichments ?? null}>
        <YohakuMainPaperProvider>
          <YohakuArticleShell
            articleId={data.id}
            variant="post"
            lang={
              articleTranslation?.isTranslated
                ? articleTranslation.targetLang
                : articleTranslation?.sourceLang
            }
          >
            <div
              className="yohaku-post-layout-grid relative flex min-h-[120px]"
              data-server-fetched-at={fetchedAt}
              data-yohaku-mode="post"
            >
              <BottomToUpTransitionView
                lcpOptimization
                className="yohaku-paper-main-slot relative min-w-0 flex-1 will-change-transform transition-transform duration-[var(--yohaku-anim-ms)] delay-[var(--yohaku-main-shift-delay-ms)] ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <YohakuMainPaperWrap>
                  {preview ? (
                    <PostPage preview data={payload} />
                  ) : (
                    <RoomProvider roomName={buildRoomName(data.id)}>
                      <PostPage data={payload} />
                    </RoomProvider>
                  )}
                </YohakuMainPaperWrap>

                {!preview && (
                  <BottomToUpSoftScaleTransitionView delay={500}>
                    <CommentAreaRootLazy allowComment refId={data.id} />
                  </BottomToUpSoftScaleTransitionView>
                )}
              </BottomToUpTransitionView>

              <LayoutRightSideProvider className="yohaku-post-toc-col relative hidden w-[200px] shrink-0 lg:block" />
            </div>
          </YohakuArticleShell>
        </YohakuMainPaperProvider>
      </EnrichmentMapProvider>

      <OnlyMobile>
        <TocFAB />
      </OnlyMobile>
    </TocHeadingStrategyProvider>
  )
}
