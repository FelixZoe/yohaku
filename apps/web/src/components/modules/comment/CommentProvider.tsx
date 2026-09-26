/* eslint-disable @eslint-react/no-context-provider */
import type {
  CommentThreadItem,
  PaginateResult,
  ReaderModel,
} from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { createContextState } from 'foxact/create-context-state'
import type { PrimitiveAtom } from 'jotai'
import { atom, useAtomValue } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { useTranslations } from 'next-intl'
import type { FC, ReactNode } from 'react'
import {
  createContext as createReactContext,
  use,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { createContext, useContextSelector } from 'use-context-selector'

import { NotSupport } from '~/components/common/NotSupport'
import { useRefValue } from '~/hooks/common/use-ref-value'
import { jotaiStore } from '~/lib/store'
import type { CommentSort } from '~/queries/keys'

import { CommentSkeleton } from './CommentSkeleton'
import { useCommentsQuery } from './hooks'
import {
  buildCommentTreeItem,
  type CommentThreadInfiniteData,
  type CommentThreadViewItem,
} from './thread'

type CommentWithEmbeddedReader = {
  readerId?: string | null
  reader?: ReaderModel | null
  replies?: CommentWithEmbeddedReader[]
}

const CommentReaderMapContext = createContext<Record<string, ReaderModel>>({})
const CommentListContext = createReactContext<
  PrimitiveAtom<Record<string, CommentThreadViewItem>>
>(null!)

export const [
  CommentMarkdownContainerRefContext,
  useCommentMarkdownContainerRef,
  useCommentMarkdownContainerRefSetter,
] = createContextState<HTMLDivElement | null>(null)

export const CommentProvider: FC<{
  refId: string
  sort?: CommentSort
  around?: string
  onTotalChange?: (total: number) => void
  children: (
    data: InfiniteData<
      PaginateResult<CommentThreadItem> & {
        readers: Record<string, ReaderModel>
      }
    >,
    commentAtom: PrimitiveAtom<Record<string, CommentThreadViewItem>>,
  ) => ReactNode
}> = ({ children, refId, sort = 'pinned', around, onTotalChange }) => {
  const t = useTranslations('comment')
  const commentAtom = useRefValue(() =>
    atom({} as Record<string, CommentThreadViewItem>),
  )

  const { data, isLoading, fetchNextPage, hasNextPage } = useCommentsQuery(
    refId,
    { sort, around },
  )

  useEffect(() => {
    if (!data) return
    const commentsMap = {} as Record<string, CommentThreadViewItem>
    function dts(comments: CommentThreadViewItem[]) {
      for (const comment of comments) {
        commentsMap[comment.id] = comment
        dts(comment.children)
      }
    }

    dts(
      (data as CommentThreadInfiniteData).pages.flatMap((page) =>
        page.data.map((comment) => buildCommentTreeItem(comment)),
      ),
    )

    jotaiStore.set(commentAtom, commentsMap)
  }, [commentAtom, data])

  const readers = useMemo(() => {
    if (!data) return {}
    const map: Record<string, ReaderModel> = {}
    const walk = (comments: CommentWithEmbeddedReader[]) => {
      for (const comment of comments) {
        if (comment.readerId && comment.reader) {
          map[comment.readerId] = comment.reader
        }
        if (comment.replies?.length) walk(comment.replies)
      }
    }
    for (const page of data.pages) {
      Object.assign(map, page.readers)
      walk(page.data)
    }
    return map
  }, [data])

  const total = data?.pages[0]?.pagination.total ?? null
  const loaded =
    data?.pages.reduce((sum, page) => sum + page.data.length, 0) ?? 0
  const remainingCount = total !== null ? Math.max(0, total - loaded) : null

  // Bubble the last-known total up to the parent so the toolbar (rendered
  // outside this provider's loading boundary) keeps showing the count while
  // a sort/around switch is in flight.
  useEffect(() => {
    if (total !== null) onTotalChange?.(total)
  }, [total, onTotalChange])

  if (isLoading) {
    return <CommentSkeleton />
  }
  if (!data || data.pages.length === 0 || data.pages[0].data.length === 0)
    return (
      <div className="center flex min-h-[400px]">
        <NotSupport icon="empty" text={t('no_comments_yet')} />
      </div>
    )

  return (
    <CommentReaderMapContext.Provider value={readers}>
      <CommentListContext.Provider value={commentAtom}>
        {children(data, commentAtom)}

        {hasNextPage && (
          <CommentLoadMoreButton
            remaining={remainingCount}
            onClick={() => fetchNextPage()}
          />
        )}
      </CommentListContext.Provider>
    </CommentReaderMapContext.Provider>
  )
}

const CommentLoadMoreButton: FC<{
  onClick: () => void
  remaining: number | null
}> = ({ onClick, remaining }) => {
  const t = useTranslations('comment')
  return (
    <div className="center flex pt-6">
      <button
        className="cursor-pointer rounded-full border border-neutral-3 bg-transparent px-4 py-2 text-copy-13 text-neutral-9 transition-colors hover:border-neutral-4 hover:bg-accent/10"
        type="button"
        onClick={onClick}
      >
        {remaining !== null && remaining > 0
          ? t('show_more', { remaining })
          : t('show_more_unknown')}
      </button>
    </div>
  )
}

export const useCommentReader = (readerId?: string | null) => {
  return useContextSelector(CommentReaderMapContext, (v) =>
    readerId ? v[readerId] : undefined,
  )
}

export const useCommentByIdSelector = <T,>(
  commentId: string,
  selector: (comment?: CommentThreadViewItem) => T,
): T => {
  const commentsAtom = use(CommentListContext)
  return useAtomValue(
    useMemo(
      () => selectAtom(commentsAtom, (v) => selector(v[commentId])),
      [commentsAtom, selector, commentId],
    ),
  )
}

export const useCommentById = (commentId: string) => {
  const commentsAtom = use(CommentListContext)
  return useAtomValue(
    useMemo(
      () => selectAtom(commentsAtom, (v) => v[commentId]),
      [commentsAtom, commentId],
    ),
  )
}

export const useUpdateComment = () => {
  const commentsAtom = use(CommentListContext)
  return useCallback(
    (comment: Partial<CommentThreadViewItem> & { id: string }) => {
      jotaiStore.set(commentsAtom, (prev) => {
        const newComments = {
          ...prev,
          [comment.id]: {
            ...prev[comment.id],
            ...comment,
            editedAt: new Date().toISOString(),
          },
        }

        return newComments
      })
    },
    [commentsAtom],
  )
}
