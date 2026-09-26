import type { FC } from 'react'
import { useCallback } from 'react'

import { Markdown, RuleType } from '~/components/ui/markdown'

import { useCommentMarkdownContainerRefSetter } from './CommentProvider'

const disabledTypes = [
  RuleType.footnote,
  RuleType.footnoteReference,
  RuleType.htmlComment,
  RuleType.htmlSelfClosing,
  RuleType.htmlBlock,
]

export const CommentMarkdown: FC<{
  children: string
}> = ({ children }) => {
  const setContainerRef = useCommentMarkdownContainerRefSetter()

  return (
    <div
      className="contents"
      ref={useCallback(
        (ref) => setContainerRef(ref?.firstChild as HTMLDivElement),
        [setContainerRef],
      )}
    >
      <Markdown
        disableParsingRawHTML
        forceBlock
        disabledTypes={disabledTypes}
        value={children}
        variant="comment"
      />
    </div>
  )
}
