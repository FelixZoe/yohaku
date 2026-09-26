'use client'

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import clsx from 'clsx'
import { m } from 'motion/react'
import { useEffect, useMemo } from 'react'

import { RootPortal } from '~/components/ui/portal'

import type { BlockInfo } from './anchor-utils'
import { CommentBlockThread } from './CommentBlockThread'
import type { CommentWithAnchor } from './thread'
import type { RangeAnchor } from './types'

export function CommentAnchorPopover({
  refId,
  contextElement,
  anchor,
  blockInfos,
  comments,
  currentLang,
  range,
  onClose,
}: {
  refId: string
  contextElement: HTMLElement | null
  anchor: RangeAnchor
  blockInfos: BlockInfo[]
  comments: CommentWithAnchor[]
  currentLang?: string | null
  range: Range
  onClose: () => void
}) {
  const { refs, floatingStyles, update } = useFloating({
    strategy: 'fixed',
    placement: 'bottom-start',
    middleware: [offset(8), flip({ padding: 20 }), shift({ padding: 20 })],
    whileElementsMounted: (reference, floating, updateFn) =>
      autoUpdate(reference, floating, updateFn, {
        animationFrame: true,
      }),
  })

  const virtualReference = useMemo(
    () => ({
      getBoundingClientRect: () => {
        const rangeRect = range.getBoundingClientRect()
        if (rangeRect.width || rangeRect.height) {
          return rangeRect
        }
        return range.getClientRects().item(0) ?? rangeRect
      },
      contextElement: contextElement ?? undefined,
    }),
    [contextElement, range],
  )

  useEffect(() => {
    refs.setReference(virtualReference)
    update()
  }, [refs, update, virtualReference])

  return (
    <RootPortal>
      <div
        aria-hidden
        className="fixed inset-0 z-[99]"
        onPointerDown={onClose}
      />
      <div className="z-[100]" ref={refs.setFloating} style={floatingStyles}>
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
            anchor={anchor}
            blockInfos={blockInfos}
            comments={comments}
            currentLang={currentLang}
            refId={refId}
            onClose={onClose}
          />
        </m.div>
      </div>
    </RootPortal>
  )
}
