'use client'

import type { CommentThreadItem, PaginateResult } from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useMemo, useRef, useSyncExternalStore } from 'react'

import { apiClient } from '~/lib/request'
import { buildCommentsQueryKey } from '~/queries/keys'

import type { BlockInfo } from './anchor-utils'
import { extractBlockInfos } from './anchor-utils'
import { AnchorHoverProvider } from './AnchorHoverContext'
import { CommentAnchorHighlight } from './CommentAnchorHighlight'
import { CommentBlockGutter } from './CommentBlockGutter'
import { RichContentElementProvider } from './RichContentElementContext'
import type { CommentWithAnchor } from './thread'
import { flattenThreadComments } from './thread'
import type { CommentAnchor } from './types'

type CommentsQueryData = InfiniteData<
  PaginateResult<CommentThreadItem & { anchor?: CommentAnchor; ref: string }>
>

function useAnchorCommentsQuery(refId: string): CommentWithAnchor[] {
  const { data } = useQuery({
    queryKey: ['comments', refId, 'anchors'],
    queryFn: async () => {
      const data = await apiClient.comment.proxy
        .ref(refId)
        .get<
          PaginateResult<
            CommentThreadItem & { anchor?: CommentAnchor; ref: string }
          >
        >({
          params: { hasAnchor: 'true', size: 50 },
        })

      return data
    },
  })

  return useMemo(() => {
    if (!data) return []
    return flattenThreadComments(data.data)
  }, [data])
}

function useCachedCommentsData(refId: string): CommentWithAnchor[] {
  const queryClient = useQueryClient()
  const prefix = useMemo(() => buildCommentsQueryKey(refId), [refId])
  const queryCache = queryClient.getQueryCache()

  const matchesPrefix = useMemo(() => {
    const [head, id] = prefix
    return (queryKey: readonly unknown[]) =>
      queryKey[0] === head && queryKey[1] === id
  }, [prefix])

  // Cache the snapshot reference — useSyncExternalStore requires getSnapshot
  // to return identity-stable values when the underlying state has not
  // changed; getQueriesData freshly allocates each call.
  const snapshotRef = useRef<CommentsQueryData[]>([])

  const getSnapshot = useMemo(
    () => (): CommentsQueryData[] => {
      // The `['comments', refId]` prefix also covers the
      // `['comments', refId, 'anchors']` query (a non-paginated useQuery,
      // shape `PaginateResult`, no `.pages`). Filter to the infinite-list
      // variants only.
      const next = queryClient
        .getQueriesData<CommentsQueryData>({ queryKey: prefix })
        .map(([, value]) => value)
        .filter((value): value is CommentsQueryData =>
          Boolean(value && Array.isArray((value as { pages?: unknown }).pages)),
        )

      const prev = snapshotRef.current
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) {
        return prev
      }
      snapshotRef.current = next
      return next
    },
    [prefix, queryClient],
  )

  const data = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribe = queryCache.subscribe((event) => {
        if (event.type === 'updated' && matchesPrefix(event.query.queryKey)) {
          onStoreChange()
        }
      })
      return unsubscribe
    },
    getSnapshot,
    () => snapshotRef.current,
  )

  return useMemo(() => {
    if (!data || data.length === 0) return []
    const seen = new Map<string, CommentWithAnchor>()
    for (const variant of data) {
      for (const page of variant.pages) {
        for (const c of flattenThreadComments(page.data)) {
          if (!seen.has(c.id)) seen.set(c.id, c)
        }
      }
    }
    return [...seen.values()]
  }, [data])
}

function useMergedAnchorComments(refId: string): CommentWithAnchor[] {
  const eagerComments = useAnchorCommentsQuery(refId)
  const cachedComments = useCachedCommentsData(refId)

  return useMemo(() => {
    const map = new Map<string, CommentWithAnchor>()
    for (const c of eagerComments) map.set(c.id, c)
    for (const c of cachedComments) {
      if ((c as CommentWithAnchor).anchor) map.set(c.id, c)
    }
    return [...map.values()]
  }, [eagerComments, cachedComments])
}

export function LexicalCommentWrapper({
  content,
  refId,
  title: _title,
  children,
  translationLang,
}: PropsWithChildren<{
  content: string
  refId: string
  title: string
  translationLang?: string | null
}>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blockInfos = useMemo<BlockInfo[]>(
    () => extractBlockInfos(content),
    [content],
  )

  const currentLang = translationLang ?? null

  const comments = useMergedAnchorComments(refId)

  return (
    <div
      className="group/comment-block relative lg:pr-14"
      data-comment-gutter-host=""
      ref={containerRef}
    >
      {children}
      <RichContentElementProvider
        containerRef={containerRef}
        contentKey={content}
      >
        <AnchorHoverProvider>
          <CommentBlockGutter
            blockInfos={blockInfos}
            comments={comments}
            containerRef={containerRef}
            currentLang={currentLang}
            refId={refId}
          />
          <CommentAnchorHighlight
            blockInfos={blockInfos}
            comments={comments}
            containerRef={containerRef}
            currentLang={currentLang}
            refId={refId}
          />
        </AnchorHoverProvider>
      </RichContentElementProvider>
    </div>
  )
}
