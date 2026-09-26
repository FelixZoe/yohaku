'use client'

import type { PropsWithChildren } from 'react'
import { createContext, use } from 'react'

export type CommentGutterLayout = 'inset' | 'outset'

const CommentGutterLayoutContext = createContext<CommentGutterLayout | null>(
  null,
)

export function useCommentGutterLayout(): CommentGutterLayout {
  return use(CommentGutterLayoutContext) ?? 'inset'
}

/** Note Paper: outset gutter; host uses data-comment-gutter-host + default lg:pr-8, overridden here. */
export function NotePaperCommentGutterLayoutProvider({
  children,
}: PropsWithChildren) {
  return (
    <CommentGutterLayoutContext value="outset">
      <div className="contents [&_[data-comment-gutter-host]]:lg:!pr-0">
        {children}
      </div>
    </CommentGutterLayoutContext>
  )
}
