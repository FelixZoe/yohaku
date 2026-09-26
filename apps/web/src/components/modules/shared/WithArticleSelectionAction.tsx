'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { DOMCustomEvents } from '~/constants/event'
import { useEventCallback } from '~/hooks/common/use-event-callback'
import { useIsClient } from '~/hooks/common/use-is-client'

import {
  buildRangeAnchorFromSelection,
  extractBlockInfos,
} from '../comment/anchor-utils'
import type { CommentAnchor } from '../comment/types'
import type { ArticleSelectionSnapshot } from './WithArticleSelectionAction.types'
import { WithArticleSelectionCommand } from './WithArticleSelectionCommand'

export const WithArticleSelectionAction: Component<{
  refId: string
  title: string
  canComment: boolean
  contentFormat?: string
  content?: string
  translationLang?: string | null
}> = ({
  refId,
  title,
  children,
  canComment,
  contentFormat,
  content,
  translationLang,
}) => {
  const isMobile = useIsMobile()
  const currentLang = translationLang ?? null
  const ref = useRef<HTMLDivElement>(null)
  const actionRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<ArticleSelectionSnapshot | null>(
    null,
  )

  const isLexical = contentFormat === 'lexical'
  const blockInfos = useMemo(
    () => (isLexical && content ? extractBlockInfos(content) : []),
    [isLexical, content],
  )

  const isClient = useIsClient()
  useEffect(() => {
    const timer = setTimeout(() => {
      document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
    }, 1000)
    return () => {
      clearTimeout(timer)
    }
  }, [])

  const buildAnchorFromSelection = useEventCallback(
    (sel: Selection): CommentAnchor | null => {
      if (!isLexical || blockInfos.length === 0) return null
      if (sel.isCollapsed) return null
      const contentEl =
        ref.current?.querySelector('[data-lexical-content]') ??
        ref.current?.querySelector('.rich-content')
      if (!contentEl) return null
      return buildRangeAnchorFromSelection(
        sel,
        contentEl,
        blockInfos,
        currentLang,
      )
    },
  )

  useEffect(() => {
    if (!isClient) return
    const container = ref.current
    if (!container) return

    const onSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) {
        setSelection(null)
        return
      }
      const text = sel.toString()
      if (!text) {
        setSelection(null)
        return
      }
      const anchorNode = sel.anchorNode
      const focusNode = sel.focusNode
      const inside = (node: Node | null) => !!node && container.contains(node)
      if (!inside(anchorNode) || !inside(focusNode)) {
        setSelection(null)
        return
      }
      const suppressed = (node: Node | null) => {
        const el =
          node instanceof Element
            ? node
            : (node?.parentElement as Element | null | undefined)
        return !!el?.closest('[data-no-article-selection]')
      }
      if (suppressed(anchorNode) || suppressed(focusNode)) {
        setSelection(null)
        return
      }
      const range = sel.getRangeAt(0).cloneRange()
      setSelection({
        selectedText: text,
        anchor: buildAnchorFromSelection(sel),
        range,
      })
    }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (actionRef.current?.contains(target)) return
      if (container.contains(target)) return
      setSelection(null)
    }

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [isClient, buildAnchorFromSelection])

  if (!isClient) return children
  if (isMobile && !isLexical) return children

  return (
    <div
      className={isMobile ? 'relative article-callout-suppressed' : 'relative'}
      ref={ref}
    >
      {children}

      <WithArticleSelectionCommand
        actionRef={actionRef}
        canComment={canComment}
        contextElement={ref.current}
        isMobile={isMobile}
        refId={refId}
        selection={selection}
        title={title}
        onDismiss={() => setSelection(null)}
      />
    </div>
  )
}
