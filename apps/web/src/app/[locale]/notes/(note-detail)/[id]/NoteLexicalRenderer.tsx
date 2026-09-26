'use client'

import { LexicalCommentWrapper } from '~/components/modules/comment/LexicalCommentWrapper'
import { TtsArticleProvider } from '~/components/modules/tts/TtsArticleProvider'
import { MainLexicalContent } from '~/components/ui/rich-content/MainLexicalContent'
import { articleMetaOf } from '~/lib/api/article-meta'
import {
  useCurrentNoteDataSelector,
  useCurrentNoteMetaSelector,
} from '~/providers/note/CurrentNoteDataProvider'

export const NoteLexicalRenderer = () => {
  const content = useCurrentNoteDataSelector((data) => data?.data.content)
  const refId = useCurrentNoteDataSelector((data) => data?.data.id)
  const title = useCurrentNoteDataSelector((data) => data?.data.title)
  const { tts, translationLang } = useCurrentNoteMetaSelector((meta) => {
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
        <MainLexicalContent
          className="mt-10"
          content={content}
          variant="note"
        />
      </LexicalCommentWrapper>
    </TtsArticleProvider>
  )
}
