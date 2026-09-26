'use client'

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import clsx from 'clsx'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { RefObject } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { useModalStack } from '~/components/ui/modal'
import { RootPortal } from '~/components/ui/portal'
import { preventDefault } from '~/lib/dom'
import { toast } from '~/lib/toast'

import type { CommentAnchor } from '../comment/types'
import { CommentModal } from './CommentModal'
import type { ArticleSelectionSnapshot } from './WithArticleSelectionAction.types'
import type { ArticleSelectionCommentPopoverState } from './WithArticleSelectionCommentPopover'
import { WithArticleSelectionCommentPopover } from './WithArticleSelectionCommentPopover'
import type { ArticleSelectionCommentSheetState } from './WithArticleSelectionCommentSheet'
import { WithArticleSelectionCommentSheet } from './WithArticleSelectionCommentSheet'

export const WithArticleSelectionCommand: Component<{
  refId: string
  title: string
  canComment: boolean
  isMobile?: boolean
  selection: ArticleSelectionSnapshot | null
  contextElement: HTMLElement | null
  actionRef: RefObject<HTMLDivElement | null>
  onDismiss: () => void
}> = ({
  refId,
  title,
  canComment,
  isMobile = false,
  selection,
  contextElement,
  actionRef,
  onDismiss,
}) => {
  const t = useTranslations('common')
  const { present } = useModalStack()
  const [commentPopover, setCommentPopover] =
    useState<ArticleSelectionCommentPopoverState | null>(null)
  const [commentSheet, setCommentSheet] =
    useState<ArticleSelectionCommentSheetState | null>(null)

  const openCommentAnchor = (anchor: CommentAnchor, range: Range) => {
    if (isMobile) {
      setCommentSheet({ anchor, range })
    } else {
      setCommentPopover({ anchor, range })
    }
    onDismiss()
  }

  const { refs, floatingStyles, update } = useFloating({
    strategy: 'fixed',
    placement: 'top',
    middleware: [
      offset(isMobile ? 24 : 8),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
    ],
    whileElementsMounted: (reference, floating, upd) =>
      autoUpdate(reference, floating, upd, { animationFrame: true }),
  })

  const virtualReference = useMemo(() => {
    if (!selection?.range) return null
    const { range } = selection
    return {
      getBoundingClientRect: () => {
        const rect = range.getBoundingClientRect()
        if (rect.width || rect.height) return rect
        return range.getClientRects().item(0) ?? rect
      },
      contextElement: contextElement ?? undefined,
    }
  }, [contextElement, selection])

  useEffect(() => {
    if (!virtualReference) return
    refs.setReference(virtualReference)
    update()
  }, [refs, update, virtualReference])

  return (
    <>
      <AnimatePresence>
        {selection && (
          <RootPortal>
            <div
              className="z-10"
              style={floatingStyles}
              ref={(el: HTMLDivElement | null) => {
                actionRef.current = el
                refs.setFloating(el)
              }}
            >
              <m.div
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 4, opacity: 0, scale: 0.96 }}
                initial={{ y: 6, opacity: 0, scale: 0.96 }}
                transition={{ type: 'tween', duration: 0.14 }}
                className={clsx(
                  'flex items-center gap-0.5 whitespace-nowrap',
                  'rounded-xl border border-neutral-5/25 bg-neutral-1/90 p-1 pr-2.5',
                  'shadow-[var(--selection-command-shadow)]',
                  'backdrop-blur-md font-sans text-copy-13 text-neutral-9',
                )}
                onMouseDown={preventDefault}
              >
                <LetterButton
                  data-event="selection-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(selection.selectedText)
                    onDismiss()
                    toast.success(t('selection_copy_success'))
                  }}
                >
                  {t('selection_copy')}
                </LetterButton>
                {canComment && <DotSep />}
                {canComment && (
                  <LetterButton
                    data-event="selection-comment"
                    onClick={() => {
                      if (selection.anchor && selection.range) {
                        openCommentAnchor(selection.anchor, selection.range)
                        return
                      }
                      present({
                        title: t('selection_comment'),
                        content: (rest) => (
                          <CommentModal
                            initialValue={`> ${selection.selectedText?.split('\n').join('')}\n\n`}
                            refId={refId}
                            title={title}
                            {...rest}
                          />
                        ),
                      })
                    }}
                  >
                    {t('selection_quote_comment')}
                  </LetterButton>
                )}
                <span
                  aria-hidden
                  className="pl-1.5 text-accent/85 text-copy-13 leading-none select-none"
                >
                  §
                </span>
              </m.div>
            </div>
          </RootPortal>
        )}
      </AnimatePresence>

      <WithArticleSelectionCommentPopover
        contextElement={contextElement}
        refId={refId}
        state={commentPopover}
        onClose={() => setCommentPopover(null)}
      />

      <WithArticleSelectionCommentSheet
        refId={refId}
        state={commentSheet}
        onClose={() => setCommentSheet(null)}
      />
    </>
  )
}

const LetterButton = ({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={clsx(
      'rounded-md px-2.5 py-1 font-sans tracking-[0.02em] select-none text-neutral-9',
      'hover:bg-neutral-9/5 active:bg-neutral-9/10 transition-colors',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
)

const DotSep = () => (
  <span aria-hidden className="px-0.5 text-neutral-7/70 select-none">
    ·
  </span>
)
