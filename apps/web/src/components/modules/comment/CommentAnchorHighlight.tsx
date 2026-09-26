'use client'

import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { resolveRangeAnchor } from './anchor-resolve'
import type { BlockInfo } from './anchor-utils'
import { useAnchorHover } from './AnchorHoverContext'
import { CommentAnchorPopover } from './CommentAnchorPopover'
import { useRichContentElement } from './RichContentElementContext'
import type { CommentWithAnchor } from './thread'
import type { CommentAnchor, RangeAnchor } from './types'

function anchorKey(anchor: RangeAnchor): string {
  return `${anchor.blockId}:${anchor.startOffset}:${anchor.endOffset}`
}

function collectRangeAnchors(comments: CommentWithAnchor[]): RangeAnchor[] {
  const result: RangeAnchor[] = []
  for (const c of comments) {
    if (c.anchor?.mode === 'range') result.push(c.anchor)
  }
  return result
}

function groupCommentsByRangeAnchor(
  comments: CommentWithAnchor[],
): Map<string, { anchor: RangeAnchor; comments: CommentWithAnchor[] }> {
  const map = new Map<
    string,
    { anchor: RangeAnchor; comments: CommentWithAnchor[] }
  >()
  for (const c of comments) {
    const { anchor } = c
    if (anchor?.mode !== 'range') continue
    const key = anchorKey(anchor)
    const existing = map.get(key)
    if (existing) {
      existing.comments.push(c)
    } else {
      map.set(key, { anchor, comments: [c] })
    }
  }
  return map
}

function createDomRange(
  blockEl: Element,
  startOffset: number,
  endOffset: number,
): Range | null {
  const walker = document.createTreeWalker(
    blockEl,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT
        if (node instanceof HTMLBRElement) return NodeFilter.FILTER_ACCEPT
        return NodeFilter.FILTER_SKIP
      },
    },
  )
  let offset = 0
  let startNode: Text | null = null
  let startNodeOffset = 0
  let endNode: Text | null = null
  let endNodeOffset = 0
  let node: Node | null

  while ((node = walker.nextNode())) {
    const len = node.nodeType === Node.TEXT_NODE ? (node as Text).length : 1

    if (
      !startNode &&
      node.nodeType === Node.TEXT_NODE &&
      offset + len >= startOffset
    ) {
      startNode = node as Text
      startNodeOffset = startOffset - offset
    }
    if (node.nodeType === Node.TEXT_NODE && offset + len >= endOffset) {
      endNode = node as Text
      endNodeOffset = endOffset - offset
      break
    }
    offset += len
  }

  if (!startNode || !endNode) return null

  try {
    const range = document.createRange()
    range.setStart(startNode, startNodeOffset)
    range.setEnd(endNode, endNodeOffset)
    return range
  } catch {
    return null
  }
}

const HIGHLIGHT_STYLE_ID = 'comment-anchor-highlight-style'

function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIGHLIGHT_STYLE_ID
  style.textContent = [
    '::highlight(comment-highlight) {',
    '  text-decoration: underline dashed;',
    '  text-decoration-color: color-mix(in srgb, var(--color-accent, #c56473) 50%, transparent);',
    '  text-underline-offset: 2px;',
    '}',
    '::highlight(comment-highlight-hover) {',
    '  background-color: color-mix(in srgb, var(--color-accent, #c56473) 14%, transparent);',
    '}',
    ":where(.dark, [data-theme='dark']) ::highlight(comment-highlight-hover) {",
    '  background-color: color-mix(in srgb, var(--color-accent, #c56473) 22%, transparent);',
    '}',
  ].join('\n')
  document.head.append(style)
}

function langMatches(
  anchorLang: string | null | undefined,
  currentLang: string | null | undefined,
): boolean {
  return (anchorLang ?? null) === (currentLang ?? null)
}

function isRangeAnchor(anchor: CommentAnchor | null): anchor is RangeAnchor {
  return !!anchor && anchor.mode === 'range'
}

export function CommentAnchorHighlight({
  containerRef,
  blockInfos,
  comments,
  refId,
  currentLang,
}: {
  containerRef: React.RefObject<HTMLElement | null>
  blockInfos: BlockInfo[]
  comments: CommentWithAnchor[]
  refId: string
  currentLang?: string | null
}) {
  const contentEl = useRichContentElement()
  const { hoveredAnchor, setHoveredAnchor } = useAnchorHover()

  const [popoverState, setPopoverState] = useState<{
    anchor: RangeAnchor
    comments: CommentWithAnchor[]
    range: Range
  } | null>(null)

  const langFilteredComments = useMemo(
    () =>
      comments.filter(
        (c) =>
          c.anchor?.mode !== 'range' || langMatches(c.anchor.lang, currentLang),
      ),
    [comments, currentLang],
  )

  const anchorGroups = useMemo(
    () => groupCommentsByRangeAnchor(langFilteredComments),
    [langFilteredComments],
  )

  const hitTestHighlight = useCallback(
    (
      clientX: number,
      clientY: number,
    ): {
      anchor: RangeAnchor
      comments: CommentWithAnchor[]
      range: Range
    } | null => {
      if (!contentEl) return null

      const doc = contentEl.ownerDocument
      let node: Node
      let offset: number
      const caretPos = doc.caretPositionFromPoint?.(clientX, clientY)
      if (caretPos) {
        node = caretPos.offsetNode
        offset = caretPos.offset
      } else {
        const range = (
          doc as Document & {
            caretRangeFromPoint?: (x: number, y: number) => Range | null
          }
        ).caretRangeFromPoint?.(clientX, clientY)
        if (!range) return null
        node = range.startContainer
        offset = range.startOffset
      }

      for (const {
        anchor,
        comments: anchorComments,
      } of anchorGroups.values()) {
        const resolved = resolveRangeAnchor(anchor, blockInfos)
        if (resolved.status === 'block-fallback') continue

        const blockEl = contentEl.children[resolved.blockIndex]
        if (!blockEl) continue

        const range = createDomRange(
          blockEl as Element,
          resolved.startOffset,
          resolved.endOffset,
        )
        if (!range) continue

        try {
          if (range.comparePoint(node, offset) === 0) {
            return { anchor, comments: anchorComments, range }
          }
        } catch {
          // comparePoint can throw if node is not in the range's document
        }
      }
      return null
    },
    [contentEl, blockInfos, anchorGroups],
  )

  const handleContentClick = useCallback(
    (e: MouseEvent) => {
      if (!contentEl || !(e.target as Node).isConnected) return
      if (!contentEl.contains(e.target as Node)) return

      const hit = hitTestHighlight(e.clientX, e.clientY)
      setPopoverState((prev) => {
        if (!hit) return null
        if (prev && anchorKey(prev.anchor) === anchorKey(hit.anchor)) {
          return null
        }
        return hit
      })
    },
    [contentEl, hitTestHighlight],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('click', handleContentClick)
    return () => container.removeEventListener('click', handleContentClick)
  }, [containerRef, handleContentClick])

  // Track article-side hover, push to shared anchor hover context
  useEffect(() => {
    if (anchorGroups.size === 0 || !contentEl) return

    let lastKey: string | null = null
    const handleMouseMove = (e: MouseEvent) => {
      if (!contentEl.contains(e.target as Node)) return
      const hit = hitTestHighlight(e.clientX, e.clientY)
      contentEl.style.cursor = hit ? 'pointer' : ''
      const newKey = hit ? anchorKey(hit.anchor) : null
      if (newKey === lastKey) return
      lastKey = newKey
      setHoveredAnchor(hit?.anchor ?? null)
    }
    const handleMouseLeave = () => {
      contentEl.style.cursor = ''
      if (lastKey !== null) {
        lastKey = null
        setHoveredAnchor(null)
      }
    }

    contentEl.addEventListener('mousemove', handleMouseMove as EventListener)
    contentEl.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      contentEl.removeEventListener(
        'mousemove',
        handleMouseMove as EventListener,
      )
      contentEl.removeEventListener('mouseleave', handleMouseLeave)
      contentEl.style.cursor = ''
    }
  }, [contentEl, anchorGroups, hitTestHighlight, setHoveredAnchor])

  // Render the hover background via CSS Custom Highlight API.
  // Driven by shared hoveredAnchor — both article hover (above) and
  // panel quote-section hover write to the same source.
  useEffect(() => {
    if (!contentEl) return
    if (!isRangeAnchor(hoveredAnchor)) {
      CSS.highlights.delete('comment-highlight-hover')
      return
    }
    if (!langMatches(hoveredAnchor.lang, currentLang)) {
      CSS.highlights.delete('comment-highlight-hover')
      return
    }
    const resolved = resolveRangeAnchor(hoveredAnchor, blockInfos)
    if (resolved.status === 'block-fallback') {
      CSS.highlights.delete('comment-highlight-hover')
      return
    }
    const blockEl = contentEl.children[resolved.blockIndex]
    if (!blockEl) {
      CSS.highlights.delete('comment-highlight-hover')
      return
    }
    const range = createDomRange(
      blockEl as Element,
      resolved.startOffset,
      resolved.endOffset,
    )
    if (!range) {
      CSS.highlights.delete('comment-highlight-hover')
      return
    }
    CSS.highlights.set('comment-highlight-hover', new Highlight(range))
    return () => {
      CSS.highlights.delete('comment-highlight-hover')
    }
  }, [hoveredAnchor, contentEl, blockInfos, currentLang])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverState(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Persistent dashed-underline highlight via CSS Custom Highlight API.
  useEffect(() => {
    if (!contentEl) return

    const rangeAnchors = collectRangeAnchors(comments).filter((a) =>
      langMatches(a.lang, currentLang),
    )
    if (rangeAnchors.length === 0) {
      CSS.highlights.delete('comment-highlight')
      return
    }

    ensureHighlightStyle()

    const ranges: Range[] = []
    for (const anchor of rangeAnchors) {
      const resolved = resolveRangeAnchor(anchor, blockInfos)
      if (resolved.status === 'block-fallback') continue

      const blockEl = contentEl.children[resolved.blockIndex]
      if (!blockEl) continue

      const range = createDomRange(
        blockEl as Element,
        resolved.startOffset,
        resolved.endOffset,
      )
      if (range) ranges.push(range)
    }

    if (ranges.length > 0) {
      const highlight = new Highlight(...ranges)
      CSS.highlights.set('comment-highlight', highlight)
    } else {
      CSS.highlights.delete('comment-highlight')
    }

    return () => {
      CSS.highlights.delete('comment-highlight')
    }
  }, [contentEl, blockInfos, comments, currentLang])

  return (
    <AnimatePresence>
      {popoverState && (
        <CommentAnchorPopover
          anchor={popoverState.anchor}
          blockInfos={blockInfos}
          comments={popoverState.comments}
          contextElement={containerRef.current}
          currentLang={currentLang}
          key={anchorKey(popoverState.anchor)}
          range={popoverState.range}
          refId={refId}
          onClose={() => setPopoverState(null)}
        />
      )}
    </AnimatePresence>
  )
}
