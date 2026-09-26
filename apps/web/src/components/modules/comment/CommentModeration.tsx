'use client'

import type {
  CommentModel,
  CommentModerationStatus,
} from '@mx-space/api-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { apiClient } from '~/lib/request'
import { jotaiStore } from '~/lib/store'
import { toast } from '~/lib/toast'
import { buildCommentsQueryKey } from '~/queries/keys/comment'

import { insertCommentIntoListCache } from './comment-cache'

type Reviewer = Extract<
  CommentModerationStatus,
  { status: 'pending' }
>['reviewer']
type Receipt = {
  id: string
  refId: string
  receipt: string
  status: CommentModerationStatus['status']
  reviewer?: Reviewer
  comment: CommentModel
  createdAt: number
}

const RECEIPT_TTL = 7 * 86400000

export const moderationPendingKey = (reviewer?: Reviewer) =>
  reviewer === 'owner' ? 'moderation_pending_owner' : 'moderation_pending'

const receiptsAtom = atomWithStorage<Receipt[]>(
  'comment-moderation-pending',
  [],
)
const updateReceipts = (update: (items: Receipt[]) => Receipt[]) =>
  jotaiStore.set(receiptsAtom, update)
const forgetReceipt = (id: string) =>
  updateReceipts((items) => items.filter((item) => item.id !== id))

export function trackCommentModeration(
  refId: string,
  comment: CommentModel,
  receipt: string,
  reviewer?: Reviewer,
) {
  updateReceipts((items) => [
    ...items.filter(
      (item) =>
        item.id !== comment.id && Date.now() - item.createdAt < RECEIPT_TTL,
    ),
    {
      id: comment.id,
      refId,
      receipt,
      status: 'pending',
      reviewer,
      comment,
      createdAt: Date.now(),
    },
  ])
}

export const useCommentModeration = (id: string) =>
  useAtomValue(receiptsAtom).find((item) => item.id === id)

export function CommentModerationWatcher({ refId }: { refId: string }) {
  const receipts = useAtomValue(receiptsAtom)
  const [mountedAt] = useState(Date.now)
  useEffect(() => {
    updateReceipts((items) => {
      const fresh = items.filter(
        (item) => mountedAt - item.createdAt < RECEIPT_TTL,
      )
      return fresh.length === items.length ? items : fresh
    })
  }, [mountedAt])
  return (
    <>
      {receipts
        .filter(
          (item) =>
            item.refId === refId && mountedAt - item.createdAt < RECEIPT_TTL,
        )
        .map((item) => (
          <ReceiptWatcher item={item} key={item.id} />
        ))}
    </>
  )
}

function ReceiptWatcher({ item }: { item: Receipt }) {
  const t = useTranslations('comment')
  const client = useQueryClient()
  const [startedAt] = useState(Date.now)
  const { data } = useQuery({
    queryKey: ['comment-moderation', item.id],
    queryFn: () => apiClient.comment.getModerationStatus(item.id, item.receipt),
    enabled: item.status === 'pending',
    staleTime: 0,
    meta: { persist: false },
    retry: 1,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' &&
      query.state.data.reviewer === 'ai' &&
      Date.now() - startedAt < 120000
        ? 3000
        : false,
  })

  useEffect(() => {
    if (!data) return
    if (data.status === 'published') {
      toast.success(t('moderation_published'))
      void client
        .invalidateQueries({ queryKey: buildCommentsQueryKey(item.refId) })
        .then(() => forgetReceipt(item.id))
      return
    }
    const reviewer = data.status === 'pending' ? data.reviewer : undefined
    updateReceipts((items) =>
      items.map((other) =>
        other.id === item.id &&
        (other.status !== data.status || other.reviewer !== reviewer)
          ? { ...other, status: data.status, reviewer }
          : other,
      ),
    )
  }, [client, data, item.id, item.refId, t])

  // The server hides unpublished comments, so every list refetch drops this
  // one; put the author's own copy back whenever the list cache changes.
  useEffect(() => {
    if (item.status === 'published') return
    const restore = () =>
      insertCommentIntoListCache(client, item.refId, item.comment)
    restore()
    return client.getQueryCache().subscribe((event) => {
      const [head, refId] = event.query.queryKey
      if (
        event.type === 'updated' &&
        head === 'comments' &&
        refId === item.refId
      )
        restore()
    })
  }, [client, item.comment, item.refId, item.status])

  return null
}

export function CommentModerationBadge({ item }: { item: Receipt }) {
  const t = useTranslations('comment')
  const client = useQueryClient()
  if (item.status === 'published') return null
  if (item.status === 'rejected')
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-label-12 font-medium leading-none">
        <span className="rounded-full bg-error/10 px-1.5 py-0.5 text-error">
          {t('moderation_badge_rejected')}
        </span>
        <button
          className="text-neutral-6 underline-offset-2 hover:underline"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            forgetReceipt(item.id)
            void client.invalidateQueries({
              queryKey: buildCommentsQueryKey(item.refId),
            })
          }}
        >
          {t('moderation_remove')}
        </button>
      </span>
    )
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5',
        'text-label-12 font-medium leading-none',
        item.reviewer === 'owner'
          ? 'bg-neutral-3 text-neutral-7'
          : 'bg-warning/10 text-warning',
      )}
    >
      {item.reviewer === 'owner' ? (
        <i className="i-mingcute-time-line size-3" />
      ) : (
        <i className="i-mingcute-loading-line size-3 animate-spin" />
      )}
      {item.reviewer === 'owner'
        ? t('moderation_badge_owner')
        : t('moderation_badge_ai')}
    </span>
  )
}
