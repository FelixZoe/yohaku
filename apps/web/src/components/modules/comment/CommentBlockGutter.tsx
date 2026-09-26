'use client'

import './Comment.css'

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
import type { ReactNode, Ref } from 'react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { Avatar } from '~/components/ui/avatar'
import { RootPortal } from '~/components/ui/portal'
import { PresentSheet } from '~/components/ui/sheet'
import { useRelativeTime } from '~/hooks/common/use-relative-time'

import { resolveRangeAnchor } from './anchor-resolve'
import type { BlockInfo } from './anchor-utils'
import { buildBlockAnchorFromIndex } from './anchor-utils'
import { useBlockGutterAction } from './BlockGutterActionContext'
import { CommentBlockThread } from './CommentBlockThread'
import { useCommentGutterLayout } from './CommentGutterLayoutContext'
import { useRichContentElement } from './RichContentElementContext'
import type { CommentWithAnchor } from './thread'
import type { CommentAnchor } from './types'

export type { CommentGutterLayout } from './CommentGutterLayoutContext'

interface CommentBlockGutterProps {
  blockInfos: BlockInfo[]
  comments: CommentWithAnchor[]
  containerRef: React.RefObject<HTMLElement | null>
  currentLang?: string | null
  refId: string
}

const FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

type SealCandidate = {
  id: string
  avatar?: string | null
  author: string
  createdAt: string
}

function dedupeBySpeaker(
  comments: CommentWithAnchor[],
  fallback: string,
): SealCandidate[] {
  const seen = new Set<string>()
  const result: SealCandidate[] = []
  const sorted = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  for (const c of sorted) {
    const author =
      (typeof c.author === 'string' ? c.author.trim() : '') || fallback
    const key = c.avatar || author || c.id
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      id: c.id,
      avatar: c.avatar,
      author,
      createdAt: c.createdAt,
    })
  }
  return result
}

const DesktopGutterTrigger = function DesktopGutterTrigger({
  blockComments,
  blockMode,
  top,
  isHovered,
  isActive,
  onClick,
  ref,
  extraAction,
}: {
  blockComments: CommentWithAnchor[]
  blockMode: 'range' | 'block'
  top: number
  isHovered: boolean
  isActive: boolean
  onClick: () => void
  ref?: Ref<HTMLDivElement | null>
  extraAction?: ReactNode
}) {
  const t = useTranslations('comment')
  const { relativeTimeFromNow } = useRelativeTime()
  const hasComments = blockComments.length > 0

  const speakers = useMemo(
    () => dedupeBySpeaker(blockComments, t('author_fallback')),
    [blockComments, t],
  )
  const primary = speakers[0]
  const extras = speakers.slice(1, 4)
  const isNew = useMemo(() => {
    if (!primary) return false
    return (
      /* eslint-disable react-hooks/purity */
      Date.now() - new Date(primary.createdAt).getTime() < FRESH_THRESHOLD_MS
      /* eslint-enable react-hooks/purity */
    )
  }, [primary])

  if (!hasComments || !primary) {
    return (
      <div
        className="absolute left-0 flex items-center gap-0.5"
        ref={ref}
        style={{ top: `${top}px` }}
      >
        {extraAction}
        <button
          type="button"
          className={clsx(
            'flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-neutral-2 hover:text-foreground',
            isHovered || isActive ? 'opacity-100' : 'opacity-0',
            isActive && 'bg-neutral-2 text-foreground',
          )}
          onClick={onClick}
        >
          <i className="i-mingcute-comment-line text-copy-15" />
        </button>
      </div>
    )
  }

  const count = blockComments.length
  const timeLabel = relativeTimeFromNow(primary.createdAt)

  return (
    <div
      className="absolute left-0 flex h-7 items-center gap-0.5"
      ref={ref}
      style={{ top: `${top}px` }}
    >
      {extraAction}
      <button
        className={clsx('comment-gutter-trig-btn', isActive && 'is-active')}
        data-mode={blockMode}
        type="button"
        onClick={onClick}
      >
        <span
          className={clsx('comment-seal', isNew && 'is-new')}
          style={{ width: 22, height: 22 }}
        >
          <Avatar size={22} src={primary.avatar} text={primary.author} />
        </span>
        {count > 1 && (
          <span className="comment-gutter-badge">
            {count > 99 ? '99+' : count}
          </span>
        )}
        <span className="comment-gutter-overflow">
          {extras.map((c) => (
            <span
              className="comment-seal"
              key={c.id}
              style={{ width: 20, height: 20 }}
            >
              <Avatar size={20} src={c.avatar} text={c.author} />
            </span>
          ))}
          <span className="comment-gutter-overflow-label">
            {primary.author}
            {timeLabel ? ` · ${timeLabel}` : ''}
          </span>
        </span>
      </button>
    </div>
  )
}

function MobileGutterItem({
  blockIndex,
  blockComments,
  blockInfos,
  refId,
  top,
  currentLang,
  onOpen,
  onClose,
}: {
  blockIndex: number
  blockComments: CommentWithAnchor[]
  blockInfos: BlockInfo[]
  refId: string
  top: number
  currentLang?: string | null
  onOpen: () => void
  onClose: () => void
}) {
  const t = useTranslations('comment')
  const anchor = buildBlockAnchorFromIndex(blockInfos, blockIndex, currentLang)

  const speakers = useMemo(
    () => dedupeBySpeaker(blockComments, t('author_fallback')),
    [blockComments, t],
  )
  const primary = speakers[0]
  const isNew = useMemo(() => {
    if (!primary) return false
    return (
      /* eslint-disable react-hooks/purity */
      Date.now() - new Date(primary.createdAt).getTime() < FRESH_THRESHOLD_MS
      /* eslint-enable react-hooks/purity */
    )
  }, [primary])

  return (
    <div
      className="absolute -right-1 flex items-start"
      style={{ top: `${top}px` }}
    >
      <PresentSheet
        triggerAsChild
        title="评论"
        content={
          <CommentBlockThread
            anchor={anchor!}
            blockInfos={blockInfos}
            comments={blockComments}
            currentLang={currentLang}
            refId={refId}
          />
        }
        onOpenChange={(open) => {
          if (open) onOpen()
          else onClose()
        }}
      >
        <button
          className="flex cursor-pointer items-center gap-1 rounded-full border border-neutral-3/80 bg-neutral-1/90 py-0.5 pl-0.5 pr-1.5 shadow-sm backdrop-blur-sm"
          type="button"
        >
          <span
            className={clsx('comment-seal', isNew && 'is-new')}
            style={{ width: 20, height: 20 }}
          >
            <Avatar size={20} src={primary.avatar} text={primary.author} />
          </span>
          <span className="text-label-12 font-medium text-muted-foreground">
            {blockComments.length}
          </span>
        </button>
      </PresentSheet>
    </div>
  )
}

interface ActivePanel {
  blockId: string
  blockIndex: number
}

export function CommentBlockGutter({
  containerRef,
  blockInfos,
  comments,
  refId,
  currentLang,
}: CommentBlockGutterProps) {
  const { activeBlockIds: actionBlockIds, render: renderAction } =
    useBlockGutterAction()
  const commentGutterLayout = useCommentGutterLayout()
  const isMobile = useIsMobile()
  const contentEl = useRichContentElement()

  const commentsByBlock = useMemo(() => {
    const map = new Map<string, CommentWithAnchor[]>()
    const idToBlockId = new Map<string, string>()

    const pushTo = (blockId: string, c: CommentWithAnchor) => {
      const arr = map.get(blockId) || []
      arr.push(c)
      map.set(blockId, arr)
      idToBlockId.set(c.id, blockId)
    }

    for (const c of comments) {
      const { anchor } = c
      if (!anchor?.blockId) continue
      const anchorLang = (anchor as CommentAnchor).lang ?? null
      const isBlock = anchor.mode === 'block'
      const langMatch = anchorLang === currentLang
      if (isBlock || !langMatch) {
        pushTo(anchor.blockId, c)
      } else if (anchor.mode === 'range') {
        const resolved = resolveRangeAnchor(anchor, blockInfos)
        if (resolved.blockIndex === -1) continue
        const blockId = blockInfos[resolved.blockIndex]?.blockId
        if (blockId) pushTo(blockId, c)
      }
    }

    // Replies have no anchor; resolve their block via the root comment they reply to.
    for (const c of comments) {
      if (c.anchor?.blockId) continue
      const rootId = c.rootCommentId ?? c.parentCommentId
      if (!rootId) continue
      const blockId = idToBlockId.get(rootId)
      if (!blockId) continue
      pushTo(blockId, c)
    }

    return map
  }, [comments, currentLang, blockInfos])

  const [blockPositions, setBlockPositions] = useState<Map<number, number>>(
    () => new Map(),
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !contentEl) return

    const updatePositions = () => {
      const containerRect = container.getBoundingClientRect()
      const positions = new Map<number, number>()
      for (let i = 0; i < contentEl.children.length; i++) {
        const child = contentEl.children[i] as HTMLElement
        const rect = child.getBoundingClientRect()
        positions.set(i, rect.top - containerRect.top)
      }
      setBlockPositions(new Map(positions))
    }

    updatePositions()
    const observer = new ResizeObserver(updatePositions)
    observer.observe(contentEl)

    return () => observer.disconnect()
  }, [containerRef, contentEl, blockInfos])

  const [hoverIndex, setHoverIndex] = useState(-1)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!contentEl) return

      for (let i = 0; i < contentEl.children.length; i++) {
        const child = contentEl.children[i] as HTMLElement
        const rect = child.getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY < rect.bottom) {
          setHoverIndex(i)
          return
        }
      }
      setHoverIndex(-1)
    },
    [contentEl],
  )

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1)
  }, [])

  useEffect(() => {
    if (isMobile) return

    const container = containerRef.current
    if (!container) return

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [containerRef, handleMouseMove, handleMouseLeave, isMobile])

  // Panel state
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null)
  const prevActiveRef = useRef<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const triggerByBlockIdRef = useRef(new Map<string, HTMLDivElement>())

  const {
    refs: floatingElementsRef,
    floatingStyles,
    update,
  } = useFloating({
    strategy: 'fixed',
    placement: commentGutterLayout === 'outset' ? 'right-start' : 'left-start',
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: (reference, floating, updateFn) =>
      autoUpdate(reference, floating, updateFn, {
        animationFrame: true,
      }),
  })

  const activeBlockId = activePanel?.blockId ?? null

  const resolveBlockIndex = useCallback(
    (id: string | null): number => {
      if (!id) return -1
      const idx = blockInfos.findIndex((b) => b.blockId === id)
      if (idx !== -1) return idx
      if (id.startsWith('__idx_')) {
        return Number.parseInt(id.slice(6), 10)
      }
      return -1
    },
    [blockInfos],
  )

  // Block highlight
  useEffect(() => {
    if (!contentEl) return

    const prevIdx = resolveBlockIndex(prevActiveRef.current)
    if (prevIdx !== -1) {
      contentEl.children[prevIdx]?.classList.remove('comment-block-active')
    }

    const idx = resolveBlockIndex(activeBlockId)
    if (idx !== -1) {
      contentEl.children[idx]?.classList.add('comment-block-active')
    }

    prevActiveRef.current = activeBlockId
  }, [activeBlockId, contentEl, resolveBlockIndex])

  useEffect(() => {
    return () => {
      if (!contentEl) return
      for (const child of contentEl.children) {
        child.classList.remove('comment-block-active')
      }
    }
  }, [contentEl])

  // Click outside panel to close
  useEffect(() => {
    if (!activePanel) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (gutterRef.current?.contains(target)) return
      setActivePanel(null)
    }
    const rafId = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler)
    })
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousedown', handler)
    }
  }, [activePanel])

  // Escape to close
  useEffect(() => {
    if (!activePanel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePanel(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [activePanel])

  useLayoutEffect(() => {
    if (!activePanel || isMobile) {
      floatingElementsRef.setReference(null)
      return
    }
    const node = triggerByBlockIdRef.current.get(activePanel.blockId)
    if (node) floatingElementsRef.setReference(node)
    else floatingElementsRef.setReference(null)
    update()
  }, [activePanel, floatingElementsRef, isMobile, update])

  const handleGutterClick = useCallback(
    (blockIndex: number, blockId: string) => {
      const anchor = buildBlockAnchorFromIndex(
        blockInfos,
        blockIndex,
        currentLang,
      )
      if (!anchor) return
      setActivePanel((prev) =>
        prev?.blockId === blockId ? null : { blockIndex, blockId },
      )
    },
    [blockInfos, currentLang],
  )

  const gutterItems = useMemo(() => {
    const items: {
      blockIndex: number
      blockId: string
      comments: CommentWithAnchor[]
      mode: 'range' | 'block'
      isGhost: boolean
    }[] = []

    const inferMode = (cs: CommentWithAnchor[]): 'range' | 'block' => {
      for (const c of cs) {
        if (c.anchor?.mode === 'range') return 'range'
      }
      return 'block'
    }

    for (const [blockId, blockComments] of commentsByBlock) {
      const blockIdx = blockInfos.findIndex((b) => b.blockId === blockId)
      if (blockIdx !== -1) {
        items.push({
          blockIndex: blockIdx,
          blockId,
          comments: blockComments,
          mode: inferMode(blockComments),
          isGhost: false,
        })
      }
    }

    if (!isMobile && hoverIndex !== -1) {
      const info = blockInfos[hoverIndex]
      if (info && !commentsByBlock.has(info.blockId || `__idx_${hoverIndex}`)) {
        items.push({
          blockIndex: hoverIndex,
          blockId: info.blockId || `__idx_${hoverIndex}`,
          comments: [],
          mode: 'block',
          isGhost: true,
        })
      }
    }

    if (!isMobile && actionBlockIds.size > 0) {
      for (const blockId of actionBlockIds) {
        if (items.some((i) => i.blockId === blockId)) continue
        const blockIdx = blockInfos.findIndex((b) => b.blockId === blockId)
        if (blockIdx !== -1) {
          items.push({
            blockIndex: blockIdx,
            blockId,
            comments: commentsByBlock.get(blockId) || [],
            mode: 'block',
            isGhost: true,
          })
        }
      }
    }

    return items
  }, [commentsByBlock, blockInfos, hoverIndex, isMobile, actionBlockIds])

  /** Keep the open panel's trigger mounted when it would drop (e.g. ghost row after hover ends). */
  const desktopGutterItems = useMemo(() => {
    if (isMobile || !activePanel) return gutterItems
    if (gutterItems.some((i) => i.blockId === activePanel.blockId)) {
      return gutterItems
    }
    const ghostComments = commentsByBlock.get(activePanel.blockId) || []
    return [
      ...gutterItems,
      {
        blockIndex: activePanel.blockIndex,
        blockId: activePanel.blockId,
        comments: ghostComments,
        mode: ghostComments.some((c) => c.anchor?.mode === 'range')
          ? ('range' as const)
          : ('block' as const),
        isGhost: true,
      },
    ]
  }, [activePanel, commentsByBlock, gutterItems, isMobile])

  // Mobile: only show blocks with comments
  if (isMobile) {
    const commentItems = gutterItems.filter((item) => !item.isGhost)
    if (commentItems.length === 0) return null

    return (
      <div className="absolute inset-0 pointer-events-none">
        {commentItems.map((item) => {
          const top = blockPositions.get(item.blockIndex)
          if (top === undefined) return null

          return (
            <div className="pointer-events-auto" key={item.blockId}>
              <MobileGutterItem
                blockComments={item.comments}
                blockIndex={item.blockIndex}
                blockInfos={blockInfos}
                currentLang={currentLang}
                refId={refId}
                top={top}
                onClose={() => setActivePanel(null)}
                onOpen={() =>
                  setActivePanel({
                    blockIndex: item.blockIndex,
                    blockId: item.blockId,
                  })
                }
              />
            </div>
          )
        })}
      </div>
    )
  }

  const panelAnchor = activePanel
    ? buildBlockAnchorFromIndex(blockInfos, activePanel.blockIndex, currentLang)
    : null
  const panelComments = activePanel
    ? commentsByBlock.get(activePanel.blockId) || []
    : []

  return (
    <div
      ref={gutterRef}
      className={clsx(
        'absolute top-0 bottom-0 hidden w-14 lg:block z-10',
        commentGutterLayout === 'outset' ? 'left-full right-auto' : 'right-0',
      )}
    >
      {desktopGutterItems.map((item) => {
        const top = blockPositions.get(item.blockIndex)
        if (top === undefined) return null

        return (
          <DesktopGutterTrigger
            blockComments={item.comments}
            blockMode={item.mode}
            isActive={activeBlockId === item.blockId}
            isHovered={hoverIndex === item.blockIndex}
            key={item.blockId}
            top={top}
            extraAction={renderAction({
              blockId: item.blockId,
              blockIndex: item.blockIndex,
              isHovered: hoverIndex === item.blockIndex,
            })}
            ref={(el) => {
              if (el) triggerByBlockIdRef.current.set(item.blockId, el)
              else triggerByBlockIdRef.current.delete(item.blockId)
            }}
            onClick={() => handleGutterClick(item.blockIndex, item.blockId)}
          />
        )
      })}

      <AnimatePresence>
        {activePanel && panelAnchor && (
          <RootPortal>
            <div
              className="z-[99]"
              style={floatingStyles}
              ref={(el) => {
                panelRef.current = el
                floatingElementsRef.setFloating(el)
              }}
            >
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-xl border border-neutral-3/80 bg-neutral-1 shadow-lg"
                exit={{ opacity: 0, y: -2 }}
                initial={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <CommentBlockThread
                  anchor={panelAnchor}
                  blockInfos={blockInfos}
                  comments={panelComments}
                  currentLang={currentLang}
                  refId={refId}
                  onClose={() => setActivePanel(null)}
                />
              </m.div>
            </div>
          </RootPortal>
        )}
      </AnimatePresence>
    </div>
  )
}
