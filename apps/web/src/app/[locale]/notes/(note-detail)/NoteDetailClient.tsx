'use client'

import { useTranslations } from 'next-intl'

import { AckRead } from '~/components/common/AckRead'
import { ClientOnly } from '~/components/common/ClientOnly'
import { paperStackSheetCountFromNeighbors } from '~/components/layout/container/Paper'
import { PaperWithEntrance } from '~/components/layout/container/PaperWithEntrance'
import {
  buildRoomName,
  Presence,
  RoomProvider,
} from '~/components/modules/activity'
import { CommentAreaRootLazy } from '~/components/modules/comment'
import { NotePaperCommentGutterLayoutProvider } from '~/components/modules/comment/CommentGutterLayoutContext'
import {
  NoteActionAsideEmbedded,
  NoteBannerCaption,
  NoteBottomBarAction,
  NoteBottomTopic,
  NoteFontAdjuster,
  NoteFooterNavigationMobile,
  NoteMetaBar,
  NoteNavigationPendingBoundary,
  NotePrivateCaption,
  NoteSynopsis,
  NoteTocAside,
  NoteTopicBinderClip,
  NoteTopicInlineTag,
} from '~/components/modules/note'
import { NoteHeadCover } from '~/components/modules/note/NoteHeadCover'
import { NoteHideIfSecret } from '~/components/modules/note/NoteHideIfSecret'
import { NoteMainContainer } from '~/components/modules/note/NoteMainContainer'
import { ReadIndicatorForMobile } from '~/components/modules/shared/ReadIndicator'
import { Signature } from '~/components/modules/shared/Signature'
import { TocFAB } from '~/components/modules/toc/TocFAB'
import { TocHeadingStrategyProvider } from '~/components/modules/toc/TocHeadingStrategy'
import { YohakuArticleShell } from '~/components/modules/yohaku/YohakuArticleShell'
import { YohakuMainPaperProvider } from '~/components/modules/yohaku/YohakuMainPaperContext'
import { YohakuMainPaperWrap } from '~/components/modules/yohaku/YohakuMainPaperWrap'
import { EnrichmentMapProvider } from '~/components/ui/link-card'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import { OnlyMobile } from '~/components/ui/viewport/OnlyMobile'
import { articleMetaOf } from '~/lib/api/article-meta'
import { LexicalImageRecordProvider } from '~/providers/article/LexicalImageRecordProvider'
import {
  CurrentNoteDataProvider,
  SyncNoteDataAfterLoggedIn,
} from '~/providers/note/CurrentNoteDataProvider'
import { CurrentNoteNidProvider } from '~/providers/note/CurrentNoteIdProvider'
import { LayoutRightSidePortal } from '~/providers/shared/LayoutRightSideProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

import { NoteContent } from './[id]/NoteContent'
import {
  MarkdownSelection,
  NoteDataReValidate,
  NoteInReadingEffect,
  NoteMarkdownImageRecordProvider,
  NoteTitle,
} from './[id]/pageExtra'
import { YohakuArticleContainer } from './YohakuArticleContainer'

type NoteWithTranslation = NoteWrappedPayloadWithMeta

function PageInner({
  payload,
  preview,
  privateLoginOnlyMessage,
}: {
  payload: NoteWithTranslation
  preview?: boolean
  privateLoginOnlyMessage: string
}) {
  const data = payload.data
  const view = articleMetaOf(payload.meta)
  const articleTranslation = view.translation
  const hasInsightsInLocale = view.hasInsightsInLocale
  const aiSummary = view.summary
  const contentLang = articleTranslation?.isTranslated
    ? articleTranslation.targetLang
    : articleTranslation?.sourceLang

  return (
    <>
      {!preview && <AckRead id={data.id} type="note" />}
      <NoteInReadingEffect />

      <NoteHeadCover image={data.meta?.cover} />
      <div>
        <NoteTitle />
        <NoteTopicInlineTag />
        <NoteMetaBar />

        {!data.isPublished && (
          <NotePrivateCaption message={privateLoginOnlyMessage} />
        )}
      </div>

      <NoteHideIfSecret>
        <YohakuArticleShell
          articleId={data.id!}
          lang={contentLang}
          variant="note"
        >
          <NoteBannerCaption />

          {aiSummary?.text && (
            <NoteSynopsis
              showYohakuChip={!!hasInsightsInLocale}
              summary={aiSummary.text}
            />
          )}
          <WrappedElementProvider eoaDetect>
            {!preview && <Presence />}
            <ReadIndicatorForMobile />
            <NoteMarkdownImageRecordProvider>
              <LexicalImageRecordProvider
                content={
                  data.contentFormat === 'lexical' ? data.content : undefined
                }
              >
                <MarkdownSelection>
                  <YohakuArticleContainer
                    prose={data.contentFormat !== 'lexical'}
                  >
                    <NoteContent contentFormat={data.contentFormat} />
                  </YohakuArticleContainer>
                </MarkdownSelection>
              </LexicalImageRecordProvider>
            </NoteMarkdownImageRecordProvider>

            <LayoutRightSidePortal>
              <div className="yohaku-fadeable sticky top-[120px] transition-[opacity,filter] duration-[var(--yohaku-side-fade-ms)] ease-out">
                <NoteTocAside />
              </div>
            </LayoutRightSidePortal>
          </WrappedElementProvider>
        </YohakuArticleShell>
      </NoteHideIfSecret>
      <Signature />
      {!preview && (
        <ClientOnly>
          <div data-hide-print className="mt-8" />
          <NoteBottomBarAction />
          <NoteBottomTopic />
          <NoteFooterNavigationMobile />
        </ClientOnly>
      )}
    </>
  )
}

// Single client boundary for the whole note detail tree. The page's ~50
// client widgets were each a server->client boundary (one ~3KB `I` row
// per widget); rooting them here collapses them into one.
export const NoteDetailClient = ({
  fetchedAt,
  nid,
  notePayload,
  preview,
}: {
  fetchedAt?: string
  nid: string
  notePayload: NoteWrappedPayloadWithMeta
  preview?: boolean
}) => {
  const t = useTranslations('note')

  const notePaperStack = paperStackSheetCountFromNeighbors(
    !!(notePayload.next && notePayload.next.nid),
    !!(notePayload.prev && notePayload.prev.nid),
  )

  return (
    <TocHeadingStrategyProvider
      contentFormat={notePayload.data.contentFormat}
      hasContent={!!notePayload.data.content}
    >
      <CurrentNoteNidProvider nid={nid} />
      <CurrentNoteDataProvider data={notePayload} />
      {!preview && (
        <>
          <NoteDataReValidate fetchedAt={fetchedAt!} />
          <SyncNoteDataAfterLoggedIn />
        </>
      )}
      <NoteNavigationPendingBoundary>
        <EnrichmentMapProvider value={notePayload.meta?.enrichments ?? null}>
          <RoomProvider roomName={buildRoomName(notePayload.data.id)}>
            <YohakuMainPaperProvider>
              <div className="min-w-0">
                <div
                  className="yohaku-paper-main-slot relative will-change-transform transition-transform duration-[var(--yohaku-anim-ms)] delay-[var(--yohaku-main-shift-delay-ms)] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  data-yohaku-mode="note"
                >
                  <YohakuMainPaperWrap>
                    <PaperWithEntrance
                      as={NoteMainContainer}
                      key={nid}
                      stackSheetCount={notePaperStack}
                      aside={
                        preview ? undefined : (
                          <div className="yohaku-fadeable transition-[opacity,filter] duration-[var(--yohaku-side-fade-ms)] ease-out">
                            <NoteActionAsideEmbedded />
                          </div>
                        )
                      }
                    >
                      <NotePaperCommentGutterLayoutProvider>
                        <PageInner
                          payload={notePayload}
                          preview={preview}
                          privateLoginOnlyMessage={t('private_login_only')}
                        />
                      </NotePaperCommentGutterLayoutProvider>
                    </PaperWithEntrance>
                  </YohakuMainPaperWrap>
                  <NoteTopicBinderClip />
                </div>
                {!preview && (
                  <BottomToUpSoftScaleTransitionView delay={500}>
                    <CommentAreaRootLazy
                      allowComment
                      refId={notePayload.data.id}
                    />
                  </BottomToUpSoftScaleTransitionView>
                )}
              </div>
            </YohakuMainPaperProvider>
          </RoomProvider>
        </EnrichmentMapProvider>

        <NoteFontAdjuster />

        <OnlyMobile>
          <TocFAB />
        </OnlyMobile>
      </NoteNavigationPendingBoundary>
    </TocHeadingStrategyProvider>
  )
}
