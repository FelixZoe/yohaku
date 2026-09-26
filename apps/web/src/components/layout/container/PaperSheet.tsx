import type { CSSProperties } from 'react'

import { clsxm } from '~/lib/helper'

/**
 * One physical sheet: same deckle + contact shadow as the main `Paper` fill.
 * A parent in the same subtree must render `DeckleFilter` once (`#deckle-edge`).
 * (No children — anything stacked on the sheet should be a sibling so it is not displacement-mapped.)
 */
export const PaperSheet: Component<{
  className?: string
  style?: CSSProperties
}> = ({ className, style }) => (
  <div
    aria-hidden
    style={style}
    className={clsxm(
      'paper-sheet-deckle',
      'absolute inset-0',
      'bg-white dark:bg-[var(--surface-paper)]',
      'shadow-paper-contact',
      '[filter:url(#deckle-edge)]',
      'print:bg-transparent! print:shadow-none! print:[filter:none]!',
      className,
    )}
  />
)
