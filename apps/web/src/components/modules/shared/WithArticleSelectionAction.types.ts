import type { CommentAnchor } from '../comment/types'

export interface ArticleSelectionSnapshot {
  anchor: CommentAnchor | null
  range: Range | null
  selectedText: string
}
