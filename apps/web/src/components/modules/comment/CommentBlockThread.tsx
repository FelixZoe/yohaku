'use client'

import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Avatar } from '~/components/ui/avatar'
import { RelativeTime } from '~/components/ui/relative-time'
import { ScrollArea } from '~/components/ui/scroll-area'

import type { BlockInfo } from './anchor-utils'
import { useAnchorHover } from './AnchorHoverContext'
import { CommentIsReplyProvider } from './CommentBox/providers'
import { CommentBoxRoot } from './CommentBox/Root'
import {
  CommentModerationBadge,
  useCommentModeration,
} from './CommentModeration'
import type { CommentWithAnchor, ThreadSection } from './thread'
import { groupCommentsByQuote } from './thread'
import type { CommentAnchor, RangeAnchor } from './types'

interface CommentBlockThreadProps {
  anchor: CommentAnchor
  blockInfos?: BlockInfo[]
  comments: CommentWithAnchor[]
  currentLang?: string | null
  onClose?: () => void
  refId: string
}

const FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

type ChipState =
  | { kind: 'block' }
  | { kind: 'quote'; anchor: RangeAnchor }
  | { kind: 'reply'; comment: CommentWithAnchor; rootAnchor: CommentAnchor }

function quoteSectionKey(anchor: RangeAnchor) {
  return `${anchor.blockId}:${anchor.startOffset}:${anchor.endOffset}`
}

function ThreadComment({
  comment,
  parentAuthor,
  fallbackAuthor,
  onSelect,
}: {
  comment: CommentWithAnchor
  parentAuthor: string | null
  fallbackAuthor: string
  onSelect: (comment: CommentWithAnchor) => void
}) {
  const author =
    (typeof comment.author === 'string' ? comment.author.trim() : '') ||
    fallbackAuthor
  const moderation = useCommentModeration(comment.id)
  const select = () => {
    if (!moderation) onSelect(comment)
  }

  const isNew = useMemo(() => {
    return (
      /* eslint-disable react-hooks/purity */
      Date.now() - new Date(comment.createdAt).getTime() < FRESH_THRESHOLD_MS
      /* eslint-enable react-hooks/purity */
    )
  }, [comment.createdAt])

  return (
    <div
      className="thread-comment group"
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          select()
        }
      }}
    >
      <div className="thread-comment-head">
        <span className={clsx('thread-c-avatar', isNew && 'is-new')}>
          <Avatar size={18} src={comment.avatar} text={author} />
        </span>
        <span className="thread-c-name">{author}</span>
        {moderation && <CommentModerationBadge item={moderation} />}
        {parentAuthor && (
          <>
            <i aria-hidden className="thread-c-arrow i-mingcute-right-line" />
            <span className="thread-c-to">{parentAuthor}</span>
          </>
        )}
        <span className="thread-c-time">
          <RelativeTime date={comment.createdAt} />
        </span>
      </div>
      <p className="thread-c-text">{comment.text}</p>
    </div>
  )
}

function QuoteSection({
  section,
  fallbackAuthor,
  isActive,
  onHoverEnter,
  onHoverLeave,
  onPickQuote,
  onPickReply,
}: {
  section: Extract<ThreadSection, { kind: 'quote' }>
  fallbackAuthor: string
  isActive: boolean
  onHoverEnter: () => void
  onHoverLeave: () => void
  onPickQuote: () => void
  onPickReply: (comment: CommentWithAnchor) => void
}) {
  const t = useTranslations('comment')
  const parentByCommentId = useMemo(() => {
    const idToAuthor = new Map<string, string>()
    for (const c of section.comments) {
      const author =
        (typeof c.author === 'string' ? c.author.trim() : '') || fallbackAuthor
      idToAuthor.set(c.id, author)
    }
    const result = new Map<string, string | null>()
    for (const c of section.comments) {
      const parentId =
        typeof c.parentCommentId === 'string' ? c.parentCommentId : null
      result.set(c.id, parentId ? (idToAuthor.get(parentId) ?? null) : null)
    }
    return result
  }, [section.comments, fallbackAuthor])

  return (
    <div
      className="thread-section"
      data-anchor-active={isActive ? 'true' : undefined}
    >
      <div
        className="thread-quote"
        role="button"
        tabIndex={0}
        onClick={onPickQuote}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPickQuote()
          }
        }}
      >
        <span aria-hidden className="thread-quote-bar" />
        <div className="thread-quote-text">
          {section.quoteText}
          {section.stale && (
            <span className="thread-quote-stale">{t('anchor_stale')}</span>
          )}
        </div>
      </div>
      {section.comments.map((c) => (
        <ThreadComment
          comment={c}
          fallbackAuthor={fallbackAuthor}
          key={c.id}
          parentAuthor={parentByCommentId.get(c.id) ?? null}
          onSelect={onPickReply}
        />
      ))}
    </div>
  )
}

function BlockSection({
  section,
  fallbackAuthor,
  onPickReply,
}: {
  section: Extract<ThreadSection, { kind: 'block' }>
  fallbackAuthor: string
  onPickReply: (comment: CommentWithAnchor) => void
}) {
  const t = useTranslations('comment')
  const parentByCommentId = useMemo(() => {
    const idToAuthor = new Map<string, string>()
    for (const c of section.comments) {
      const author =
        (typeof c.author === 'string' ? c.author.trim() : '') || fallbackAuthor
      idToAuthor.set(c.id, author)
    }
    const result = new Map<string, string | null>()
    for (const c of section.comments) {
      const parentId =
        typeof c.parentCommentId === 'string' ? c.parentCommentId : null
      result.set(c.id, parentId ? (idToAuthor.get(parentId) ?? null) : null)
    }
    return result
  }, [section.comments, fallbackAuthor])

  return (
    <div className="thread-section">
      <div className="thread-blocklabel">{t('on_this_block')}</div>
      {section.comments.map((c) => (
        <ThreadComment
          comment={c}
          fallbackAuthor={fallbackAuthor}
          key={c.id}
          parentAuthor={parentByCommentId.get(c.id) ?? null}
          onSelect={onPickReply}
        />
      ))}
    </div>
  )
}

function ChipBar({
  state,
  fallbackAuthor,
  onClear,
}: {
  state: ChipState
  fallbackAuthor: string
  onClear: () => void
}) {
  const t = useTranslations('comment')
  if (state.kind === 'block') {
    return (
      <div className="thread-chip">
        <span className="thread-chip-pill">{t('reply_to_block')}</span>
      </div>
    )
  }
  if (state.kind === 'quote') {
    return (
      <div className="thread-chip">
        <span className="thread-chip-pill is-quote">
          “{state.anchor.quote}”
        </span>
        <button
          aria-label={t('cancel_reply')}
          className="thread-chip-x"
          type="button"
          onClick={onClear}
        >
          <i aria-hidden className="i-mingcute-close-line text-label-12" />
        </button>
      </div>
    )
  }
  const author =
    (typeof state.comment.author === 'string'
      ? state.comment.author.trim()
      : '') || fallbackAuthor
  return (
    <div className="thread-chip">
      <span className="thread-chip-pill">{t('reply_to_user', { author })}</span>
      <button
        aria-label={t('cancel_reply')}
        className="thread-chip-x"
        type="button"
        onClick={onClear}
      >
        <i aria-hidden className="i-mingcute-close-line text-label-12" />
      </button>
    </div>
  )
}

export function CommentBlockThread({
  anchor,
  blockInfos = [],
  comments,
  currentLang,
  onClose,
  refId,
}: CommentBlockThreadProps) {
  const t = useTranslations('comment')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const { hoveredAnchor, setHoveredAnchor } = useAnchorHover()

  const [chip, setChip] = useState<ChipState>({ kind: 'block' })

  const grouping = useMemo(
    () => groupCommentsByQuote(comments, blockInfos, currentLang ?? null),
    [comments, blockInfos, currentLang],
  )

  // Reset chip when the panel switches to a different block.
  // Direct setState here is intentional — the chip is local panel state that
  // depends on the active block, but the panel itself stays mounted across
  // block switches (so we can't derive via key).
  useEffect(() => {
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setChip({ kind: 'block' })
  }, [anchor.blockId])

  // Focus the editor when the panel mounts or block changes (preserves prior behavior).
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(
        '[contenteditable="true"]',
      )
      el?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [anchor.blockId])

  // Esc: dismiss chip first, panel close handled by parent.
  useEffect(() => {
    if (chip.kind === 'block') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setChip({ kind: 'block' })
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [chip.kind])

  const handleAfterSubmit = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['comments', refId, 'anchors'],
    })
    setChip({ kind: 'block' })
  }, [queryClient, refId])

  const fallbackAuthor = t('author_fallback')

  const activeAnchorKey = useMemo(() => {
    if (!hoveredAnchor || hoveredAnchor.mode !== 'range') return null
    return quoteSectionKey(hoveredAnchor)
  }, [hoveredAnchor])

  const handlePickQuote = useCallback((rangeAnchor: RangeAnchor) => {
    setChip({ kind: 'quote', anchor: rangeAnchor })
  }, [])

  const handlePickReply = useCallback(
    (comment: CommentWithAnchor) => {
      // The reply mutation routes by parent comment id; rootAnchor preserves
      // context for the chip label only.
      setChip({
        kind: 'reply',
        comment,
        rootAnchor: comment.anchor ?? anchor,
      })
    },
    [anchor],
  )

  const handleClearChip = useCallback(() => {
    setChip({ kind: 'block' })
  }, [])

  const { sections, counts } = grouping

  const composeAnchor: CommentAnchor | undefined = useMemo(() => {
    if (chip.kind === 'quote') return chip.anchor
    if (chip.kind === 'reply') {
      // Reply submission ignores anchor (uses parentCommentId); pass undefined.
      return undefined
    }
    return anchor
  }, [chip, anchor])

  const replyParentId = chip.kind === 'reply' ? chip.comment.id : null

  const headerLabel = t('block_header_count', { count: counts.total })
  const headerSummary = (() => {
    const parts: string[] = []
    if (counts.quotes > 0)
      parts.push(t('quote_count', { count: counts.quotes }))
    if (counts.blockwise > 0)
      parts.push(t('blockwise_count', { count: counts.blockwise }))
    return parts.join(' · ')
  })()

  const composeBox = replyParentId ? (
    <CommentIsReplyProvider isReply originalRefId={refId}>
      <CommentBoxRoot
        compact
        afterSubmit={handleAfterSubmit}
        className="thread-compose"
        refId={replyParentId}
      />
    </CommentIsReplyProvider>
  ) : (
    <CommentBoxRoot
      compact
      afterSubmit={handleAfterSubmit}
      anchor={composeAnchor}
      className="thread-compose"
      refId={refId}
    />
  )

  return (
    <div
      className="thread-panel w-[min(420px,calc(100vw-40px))] overflow-hidden"
      ref={containerRef}
    >
      {(sections.length > 0 || onClose) && (
        <div className="thread-header">
          <span className="thread-header-l">
            {sections.length > 0 ? headerLabel : null}
          </span>
          <div className="flex items-center gap-2">
            {headerSummary && (
              <span className="thread-header-r">{headerSummary}</span>
            )}
            {onClose && (
              <button
                aria-label={tCommon('actions_close')}
                className="thread-header-close"
                type="button"
                onClick={onClose}
              >
                <i aria-hidden className="i-mingcute-close-line text-copy-14" />
              </button>
            )}
          </div>
        </div>
      )}
      {sections.length > 0 && (
        <ScrollArea.ScrollArea
          rootClassName="max-h-[min(70vh,600px)]"
          viewportClassName=""
        >
          {sections.map((section) => {
            if (section.kind === 'quote') {
              const key = section.anchorKey
              const isActive = activeAnchorKey === key
              return (
                <QuoteSection
                  fallbackAuthor={fallbackAuthor}
                  isActive={isActive}
                  key={key}
                  section={section}
                  onHoverEnter={() => setHoveredAnchor(section.anchor)}
                  onHoverLeave={() => setHoveredAnchor(null)}
                  onPickQuote={() => handlePickQuote(section.anchor)}
                  onPickReply={handlePickReply}
                />
              )
            }
            return (
              <BlockSection
                fallbackAuthor={fallbackAuthor}
                key="thread-block-section"
                section={section}
                onPickReply={handlePickReply}
              />
            )
          })}
        </ScrollArea.ScrollArea>
      )}
      <div className="thread-box">
        <ChipBar
          fallbackAuthor={fallbackAuthor}
          state={chip}
          onClear={handleClearChip}
        />
        {composeBox}
      </div>
    </div>
  )
}
