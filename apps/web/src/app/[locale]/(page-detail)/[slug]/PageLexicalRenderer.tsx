'use client'

import { LexicalCommentWrapper } from '~/components/modules/comment/LexicalCommentWrapper'
import { MainLexicalContent } from '~/components/ui/rich-content/MainLexicalContent'
import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'

export const PageLexicalRenderer = () => {
  const content = useCurrentPageDataSelector((data) => data?.content)
  const refId = useCurrentPageDataSelector((data) => data?.id)
  const title = useCurrentPageDataSelector((data) => data?.title)
  if (!content) return null
  return (
    <LexicalCommentWrapper content={content} refId={refId!} title={title!}>
      <MainLexicalContent className="min-w-0 w-full" content={content} />
    </LexicalCommentWrapper>
  )
}
