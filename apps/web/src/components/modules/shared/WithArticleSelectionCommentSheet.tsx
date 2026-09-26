'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { PresentSheet } from '~/components/ui/sheet'

import { CommentBlockThread } from '../comment/CommentBlockThread'
import type { CommentAnchor } from '../comment/types'

export interface ArticleSelectionCommentSheetState {
  anchor: CommentAnchor
  range: Range
}

export const WithArticleSelectionCommentSheet: Component<{
  refId: string
  state: ArticleSelectionCommentSheetState | null
  onClose: () => void
}> = ({ refId, state, onClose }) => {
  const t = useTranslations('common')

  useEffect(() => {
    if (!state) {
      CSS.highlights?.delete('comment-selection-active')
      return
    }

    const styleId = 'comment-selection-active-style'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = [
        '::highlight(comment-selection-active) {',
        '  background-color: color-mix(in srgb, var(--color-accent, #c56473) 20%, transparent);',
        '  text-decoration: underline solid;',
        '  text-decoration-color: var(--color-accent, #c56473);',
        '  text-underline-offset: 2px;',
        '}',
      ].join('\n')
      document.head.append(style)
    }

    const highlight = new Highlight(state.range)
    CSS.highlights?.set('comment-selection-active', highlight)

    return () => {
      CSS.highlights?.delete('comment-selection-active')
    }
  }, [state])

  return (
    <PresentSheet
      open={!!state}
      title={t('selection_comment')}
      content={
        state ? (
          <div className="-mx-5 -mb-5 flex justify-center">
            <CommentBlockThread
              anchor={state.anchor}
              comments={[]}
              refId={refId}
            />
          </div>
        ) : null
      }
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    />
  )
}
