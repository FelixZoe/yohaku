import type {
  CommentModel,
  CommentReplyWindow,
  CommentThreadItem,
  PaginateResult,
  ReaderModel,
} from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'

import { resolveRangeAnchor } from './anchor-resolve'
import type { BlockInfo } from './anchor-utils'
import type { CommentAnchor, RangeAnchor } from './types'

export type CommentWithAnchor = Omit<CommentModel, 'anchor'> & {
  anchor?: CommentAnchor | null
  new?: boolean
  authProvider?: string | null
}

export type CommentThreadViewItem = CommentWithAnchor & {
  children: CommentThreadViewItem[]
  replies?: CommentWithAnchor[]
  replyWindow?: CommentReplyWindow
}

export type CommentThreadPage = PaginateResult<CommentThreadItem>
export type CommentThreadInfiniteData = InfiniteData<
  CommentThreadPage & {
    readers?: Record<string, ReaderModel>
  }
>

const toTimestamp = (date: string) => new Date(date).getTime()

const byCreatedAsc = (
  a: Pick<CommentModel, 'createdAt'>,
  b: Pick<CommentModel, 'createdAt'>,
) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt)

const getParentCommentId = (
  parentCommentId: CommentModel['parentCommentId'],
) => {
  if (!parentCommentId) return null
  if (typeof parentCommentId === 'string') return parentCommentId
  return null
}

const createViewComment = (
  comment: CommentModel | CommentWithAnchor,
): CommentThreadViewItem => ({
  ...(comment as CommentWithAnchor),
  children: [],
})

const sortChildrenDeep = (comment: CommentThreadViewItem) => {
  comment.children.sort(byCreatedAsc)
  for (const child of comment.children) {
    sortChildrenDeep(child)
  }
}

export const buildCommentTreeItem = (
  rootComment: CommentThreadItem | (CommentThreadViewItem & { ref?: string }),
): CommentThreadViewItem => {
  const rootView = createViewComment(rootComment)
  const replyViews = (rootComment.replies ?? []).map((reply) =>
    createViewComment(reply),
  )

  const commentMap = new Map<string, CommentThreadViewItem>([
    [rootView.id, rootView],
    ...replyViews.map((reply) => [reply.id, reply] as const),
  ])

  for (const reply of replyViews.sort(byCreatedAsc)) {
    const parentId = getParentCommentId(reply.parentCommentId)
    const parent = (parentId && commentMap.get(parentId)) || rootView
    parent.children.push(reply)
  }

  sortChildrenDeep(rootView)

  return {
    ...rootView,
    replies: dedupeRepliesById(
      (rootComment.replies ?? []) as CommentWithAnchor[],
    ),
    replyWindow: rootComment.replyWindow,
  }
}

export const flattenThreadComments = (
  comments: Array<
    CommentThreadItem | (CommentThreadViewItem & { ref?: string })
  >,
): CommentWithAnchor[] => {
  const result: CommentWithAnchor[] = []
  for (const comment of comments) {
    result.push(comment as CommentWithAnchor)
    if (comment.replies) {
      result.push(...(comment.replies as CommentWithAnchor[]))
    }
  }
  return dedupeRepliesById(result)
}

const dedupeRepliesById = <T extends Pick<CommentModel, 'id'>>(
  comments: readonly T[],
): T[] => {
  const seen = new Set<string>()
  const result: T[] = []
  for (const comment of comments) {
    if (seen.has(comment.id)) continue
    seen.add(comment.id)
    result.push(comment)
  }
  return result
}

export type ThreadSection =
  | {
      kind: 'quote'
      quoteText: string
      anchor: RangeAnchor
      anchorKey: string
      stale: boolean
      comments: CommentWithAnchor[]
    }
  | {
      kind: 'block'
      comments: CommentWithAnchor[]
    }

export interface ThreadGrouping {
  counts: { total: number; quotes: number; blockwise: number }
  sections: ThreadSection[]
}

const isRangeAnchor = (a: CommentAnchor | null | undefined): a is RangeAnchor =>
  !!a && a.mode === 'range'

const quoteKey = (a: RangeAnchor) =>
  `${a.blockId}:${a.startOffset}:${a.endOffset}`

/**
 * Group panel comments by their root anchor:
 * - range-mode roots → one section per unique quote (same blockId+offsets)
 * - block-mode roots (or lang-fallback range roots) → single block section
 * - replies (any depth) follow their root section by rootCommentId/parentCommentId
 *
 * Quote sections are ordered by document position (resolved blockIndex,
 * then startOffset). The block section is always last.
 */
export const groupCommentsByQuote = (
  comments: CommentWithAnchor[],
  blockInfos: BlockInfo[],
  currentLang?: string | null,
): ThreadGrouping => {
  const langMatch = (a: RangeAnchor) =>
    (a.lang ?? null) === (currentLang ?? null)

  // 1. Index comments by id; identify roots vs replies.
  const byId = new Map<string, CommentWithAnchor>()
  for (const c of comments) byId.set(c.id, c)

  const findRootId = (c: CommentWithAnchor): string => {
    if (typeof c.rootCommentId === 'string' && c.rootCommentId) {
      return c.rootCommentId
    }
    let cursor = c
    const seen = new Set<string>([cursor.id])
    while (
      typeof cursor.parentCommentId === 'string' &&
      cursor.parentCommentId &&
      byId.has(cursor.parentCommentId) &&
      !seen.has(cursor.parentCommentId)
    ) {
      seen.add(cursor.parentCommentId)
      cursor = byId.get(cursor.parentCommentId)!
    }
    return cursor.id
  }

  // 2. Collect all comments belonging to each root.
  const groupsByRoot = new Map<string, CommentWithAnchor[]>()
  for (const c of comments) {
    const rootId = findRootId(c)
    const arr = groupsByRoot.get(rootId)
    if (arr) arr.push(c)
    else groupsByRoot.set(rootId, [c])
  }

  const byCreatedAscComment = (a: CommentWithAnchor, b: CommentWithAnchor) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

  for (const arr of groupsByRoot.values()) arr.sort(byCreatedAscComment)

  // 3. Bucket each root group into either a quote section or the block bucket.
  const quoteSections = new Map<
    string,
    {
      anchor: RangeAnchor
      docIndex: number
      docOffset: number
      stale: boolean
      comments: CommentWithAnchor[]
    }
  >()
  const blockGroup: CommentWithAnchor[] = []

  for (const [rootId, group] of groupsByRoot) {
    const root = byId.get(rootId)
    if (!root) continue
    const { anchor } = root
    if (isRangeAnchor(anchor) && langMatch(anchor)) {
      const key = quoteKey(anchor)
      const resolved = resolveRangeAnchor(anchor, blockInfos)
      const stale = resolved.status === 'block-fallback'
      const docIndex = stale ? Number.MAX_SAFE_INTEGER : resolved.blockIndex
      const docOffset = stale ? 0 : resolved.startOffset
      const existing = quoteSections.get(key)
      if (existing) {
        existing.comments.push(...group)
      } else {
        quoteSections.set(key, {
          anchor,
          docIndex,
          docOffset,
          stale,
          comments: [...group],
        })
      }
    } else {
      blockGroup.push(...group)
    }
  }

  // 4. Sort each section's comments by createdAt (root then replies in time).
  for (const section of quoteSections.values()) {
    section.comments.sort(byCreatedAscComment)
  }
  blockGroup.sort(byCreatedAscComment)

  // 5. Order sections: quote sections by document position, block last.
  const sortedQuotes = [...quoteSections.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => {
      if (a.docIndex !== b.docIndex) return a.docIndex - b.docIndex
      return a.docOffset - b.docOffset
    })

  const sections: ThreadSection[] = sortedQuotes.map((q) => ({
    kind: 'quote' as const,
    quoteText: q.anchor.quote,
    anchor: q.anchor,
    anchorKey: q.key,
    stale: q.stale,
    comments: q.comments,
  }))

  if (blockGroup.length > 0) {
    sections.push({ kind: 'block', comments: blockGroup })
  }

  return {
    sections,
    counts: {
      total: comments.length,
      quotes: sortedQuotes.length,
      blockwise: blockGroup.length > 0 ? 1 : 0,
    },
  }
}

export type CommentListSort = 'pinned' | 'newest' | 'oldest'

const emptyReplyWindow = (): CommentReplyWindow => ({
  total: 0,
  returned: 0,
  threshold: 20,
  hasHidden: false,
  hiddenCount: 0,
})

const insertRootIntoPageData = (
  list: CommentThreadItem[],
  item: CommentThreadItem,
  sort: CommentListSort,
): CommentThreadItem[] => {
  if (sort === 'oldest') return [...list, item]
  if (sort === 'pinned') {
    const index = list.findIndex((comment) => !comment.pin)
    if (index === -1) return [...list, item]
    return [...list.slice(0, index), item, ...list.slice(index)]
  }
  return [item, ...list]
}

export const insertCommentIntoThreadPages = (
  data: CommentThreadInfiniteData,
  comment: CommentWithAnchor,
  options: {
    sort?: CommentListSort
    reader?: (ReaderModel & { id?: string | null }) | null
  } = {},
): CommentThreadInfiniteData => {
  if (data.pages.length === 0) return data

  const exists = data.pages.some((page) =>
    page.data.some(
      (root) =>
        root.id === comment.id ||
        (root.replies ?? []).some((reply) => reply.id === comment.id),
    ),
  )
  if (exists) return data

  const { sort = 'pinned', reader } = options
  const readerId = reader?.id ?? comment.readerId
  const mergeReaders = (page: CommentThreadInfiniteData['pages'][number]) =>
    reader && readerId && !page.readers?.[readerId]
      ? { ...page, readers: { ...page.readers, [readerId]: reader } }
      : page

  const parentId = getParentCommentId(comment.parentCommentId)

  if (parentId) {
    const rootId =
      typeof comment.rootCommentId === 'string' && comment.rootCommentId
        ? comment.rootCommentId
        : parentId
    const rootPageIndex = data.pages.findIndex((page) =>
      page.data.some((root) => root.id === rootId),
    )
    if (rootPageIndex === -1) return data

    return {
      ...data,
      pages: data.pages.map((page, index) => {
        if (index !== rootPageIndex) return page
        return mergeReaders({
          ...page,
          data: page.data.map((root) => {
            if (root.id !== rootId) return root
            const replies = dedupeRepliesById<CommentModel>([
              ...(root.replies ?? []),
              comment as unknown as CommentModel,
            ]).sort(byCreatedAsc)
            const replyWindow = root.replyWindow ?? emptyReplyWindow()
            return {
              ...root,
              replies,
              replyCount: (root.replyCount ?? 0) + 1,
              latestReplyAt: comment.createdAt,
              replyWindow: {
                ...replyWindow,
                total: replyWindow.total + 1,
                returned: replyWindow.returned + 1,
              },
            }
          }),
        })
      }),
    }
  }

  const rootItem: CommentThreadItem = {
    ...(comment as unknown as CommentModel),
    replies: [],
    replyWindow: emptyReplyWindow(),
  }
  const targetIndex = sort === 'oldest' ? data.pages.length - 1 : 0

  return {
    ...data,
    pages: data.pages.map((page, index) => {
      const bumped = {
        ...page,
        pagination: { ...page.pagination, total: page.pagination.total + 1 },
      }
      if (index !== targetIndex) return bumped
      return mergeReaders({
        ...bumped,
        data: insertRootIntoPageData(bumped.data, rootItem, sort),
      })
    }),
  }
}

export const mergeThreadRepliesIntoPages = (
  data: CommentThreadInfiniteData,
  {
    rootCommentId,
    replies,
    replyWindow,
  }: {
    rootCommentId: string
    replies: CommentWithAnchor[]
    replyWindow: CommentReplyWindow
  },
): CommentThreadInfiniteData => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    data: page.data.map((comment) => {
      if (comment.id !== rootCommentId) return comment

      const mergedReplies = dedupeRepliesById<CommentModel>([
        ...(comment.replies ?? []),
        ...(replies as unknown as CommentModel[]),
      ]).sort(byCreatedAsc)

      return {
        ...comment,
        replies: mergedReplies,
        replyWindow,
      }
    }),
  })),
})
