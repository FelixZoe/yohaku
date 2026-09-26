'use client'

import { LexicalCommentWrapper } from '~/components/modules/comment/LexicalCommentWrapper'
import { TtsArticleProvider } from '~/components/modules/tts/TtsArticleProvider'
import { MainLexicalContent } from '~/components/ui/rich-content/MainLexicalContent'
import { articleMetaOf } from '~/lib/api/article-meta'
import {
  useCurrentPostDataSelector,
  useCurrentPostMetaSelector,
} from '~/providers/post/CurrentPostDataProvider'

export const PostLexicalRenderer = () => {
  const content = useCurrentPostDataSelector((data) => data?.content)
  const refId = useCurrentPostDataSelector((data) => data?.id)
  const title = useCurrentPostDataSelector((data) => data?.title)
  const { tts, translationLang } = useCurrentPostMetaSelector((meta) => {
    const view = articleMetaOf(meta)
    return {
      tts: view.tts,
      translationLang: view.translation?.isTranslated
        ? (view.translation.targetLang ?? null)
        : null,
    }
  })
  if (!content) return null
  return (
    <TtsArticleProvider
      articleId={refId!}
      content={content}
      lang={translationLang}
      ttsMeta={tts}
    >
      <LexicalCommentWrapper
        content={content}
        refId={refId!}
        title={title!}
        translationLang={translationLang}
      >
        <MainLexicalContent className="min-w-0 w-full" content={content} />
      </LexicalCommentWrapper>
    </TtsArticleProvider>
  )
}
