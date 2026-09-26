'use client'

import type { BusinessEvents } from '@mx-space/webhook'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import type { CommentSort } from '~/queries/keys'
import { WsEvent } from '~/socket/util'

import { Comment } from './Comment'
import { CommentBoxProvider } from './CommentBox/providers'
import { CommentProvider, useUpdateComment } from './CommentProvider'
import { CommentToolbar } from './CommentToolbar'
import type { CommentBaseProps } from './types'

const ANCHOR_HASH_PREFIX = '#comment-'
const COMMENT_CREATE_EVENT = 'comment.create' as BusinessEvents.COMMENT_CREATE
const COMMENT_UPDATE_EVENT = 'comment.update' as BusinessEvents.COMMENT_UPDATE
type CommentCreateEventPayload = {
  ref?: string
  refId?: string
}

export const Comments: FC<CommentBaseProps> = ({ refId }) => {
  const [sort, setSort] = useState<CommentSort>('pinned')
  const [around, setAround] = useState<string | undefined>(undefined)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.startsWith(ANCHOR_HASH_PREFIX)) {
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setAround(hash.slice(ANCHOR_HASH_PREFIX.length))
    }
  }, [])

  // Stable identity so CommentProvider's useEffect dep does not refire on
  // every parent render.
  const onTotalChange = useCallback((next: number) => {
    setTotal((prev) => (prev === next ? prev : next))
  }, [])

  return (
    <ErrorBoundary>
      {/* Toolbar lives outside CommentProvider so it stays mounted while the
          provider's loading boundary renders the skeleton during sort/around
          switches. */}
      <CommentToolbar
        sort={sort}
        total={total}
        onSortChange={(next) => {
          setAround(undefined)
          setSort(next)
        }}
      />

      <CommentProvider
        around={around}
        refId={refId}
        sort={sort}
        onTotalChange={onTotalChange}
      >
        {useCallback(
          (data) => {
            const comments = data?.pages.flatMap((page) => page.data) ?? []

            return (
              <ul className="min-h-[400px] list-none space-y-6">
                {comments.map((comment) => (
                  <BottomToUpSoftScaleTransitionView key={comment.id}>
                    <CommentListItem commentId={comment.id} refId={refId} />
                  </BottomToUpSoftScaleTransitionView>
                ))}
                <CommentEventHandler refId={refId} />
                <CommentAnchorScroller
                  around={around}
                  loadedCount={comments.length}
                />
              </ul>
            )
          },
          [refId],
        )}
      </CommentProvider>
    </ErrorBoundary>
  )
}

const CommentAnchorScroller: FC<{
  around?: string
  loadedCount: number
}> = ({ around, loadedCount }) => {
  useEffect(() => {
    if (!around) return
    const target = document.querySelector(`[data-comment-id="${around}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [around, loadedCount])
  return null
}

const CommentListItem: FC<{ commentId: string; refId: string }> = memo(
  function CommentListItem({ commentId, refId }) {
    return (
      <CommentBoxProvider refId={refId}>
        <Comment commentId={commentId} />
      </CommentBoxProvider>
    )
  },
)

const CommentEventHandler = ({ refId }: { refId: string }) => {
  useEffect(() => {
    const currentTitle = document.title

    // 当标签页回复前台状态时，将标题重置
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        document.title = currentTitle
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const cleaner = WsEvent.on(COMMENT_CREATE_EVENT, (data) => {
      const payload = data as CommentCreateEventPayload
      if (
        (payload.refId ?? payload.ref) === refId && // 如果标签页在后台
        document.visibilityState === 'hidden'
      ) {
        document.title = `新评论！${currentTitle}`
      }
    })
    return () => {
      cleaner()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refId])
  const updateCommentUI = useUpdateComment()
  useEffect(() => {
    const cleaner = WsEvent.on(COMMENT_UPDATE_EVENT, (data) => {
      updateCommentUI({
        id: data.id,
        text: data.text,
      })
    })
    return () => {
      cleaner()
    }
  }, [updateCommentUI])
  return null
}
