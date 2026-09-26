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
import { useEffect, useMemo } from 'react'

import { RootPortal } from '~/components/ui/portal'

import { CommentBlockThread } from '../comment/CommentBlockThread'
import type { CommentAnchor } from '../comment/types'

export interface ArticleSelectionCommentPopoverState {
  anchor: CommentAnchor
  range: Range
}

export const WithArticleSelectionCommentPopover: Component<{
  refId: string
  contextElement: HTMLElement | null
  state: ArticleSelectionCommentPopoverState | null
  onClose: () => void
}> = ({ refId, contextElement, state, onClose }) => {
  const { refs, floatingStyles, update } = useFloating({
    strategy: 'fixed',
    placement: 'bottom-start',
    middleware: [offset(8), flip({ padding: 20 }), shift({ padding: 20 })],
    whileElementsMounted: (reference, floating, update) =>
      autoUpdate(reference, floating, update, {
        animationFrame: true,
      }),
  })

  const virtualReference = useMemo(() => {
    if (!state) return null
    const { range } = state
    return {
      getBoundingClientRect: () => {
        const rangeRect = range.getBoundingClientRect()
        if (rangeRect.width || rangeRect.height) {
          return rangeRect
        }
        return range.getClientRects().item(0) ?? rangeRect
      },
      contextElement: contextElement ?? undefined,
    }
  }, [contextElement, state])

  useEffect(() => {
    if (!state || !virtualReference) return
    refs.setReference(virtualReference)
    update()
  }, [refs, state, update, virtualReference])

  useEffect(() => {
    if (!state) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, state])

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
    <AnimatePresence>
      {state && (
        <RootPortal>
          <div
            aria-hidden
            className="fixed inset-0 z-[99]"
            onPointerDown={onClose}
          />
          <div
            className="z-[100]"
            ref={refs.setFloating}
            style={floatingStyles}
          >
            <m.div
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              initial={{ y: 10, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.15 }}
              className={clsx(
                'rounded-xl border border-neutral-5/20 outline-hidden backdrop-blur-lg',
                'bg-neutral-1/80 shadow-perfect',
              )}
            >
              <CommentBlockThread
                anchor={state.anchor}
                comments={[]}
                refId={refId}
                onClose={onClose}
              />
            </m.div>
          </div>
        </RootPortal>
      )}
    </AnimatePresence>
  )
}
