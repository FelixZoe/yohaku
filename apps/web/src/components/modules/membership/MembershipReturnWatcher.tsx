'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { apiClient } from '~/lib/request'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

import { useRefetchCurrentPost } from './use-refetch-current-post'
import {
  articlePurchasedQueryKey,
  isActiveMembership,
  membershipStatusQueryKey,
} from './useMembership'

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 10

// history.replaceState instead of router.replace: an RSC navigation
// would re-render the page with the anonymous (locked) payload and
// ModelDataProvider would overwrite the just-unlocked content.
const stripParam = (params: URLSearchParams, key: string) => {
  params.delete(key)
  const query = params.toString()
  window.history.replaceState(
    null,
    '',
    window.location.pathname + (query ? `?${query}` : ''),
  )
}

const poll = (check: () => Promise<boolean>, onDone: (ok: boolean) => void) => {
  let polls = 0
  const timer = setInterval(async () => {
    polls += 1
    try {
      if (await check()) {
        clearInterval(timer)
        onDone(true)
        return
      }
    } catch {}
    if (polls >= MAX_POLLS) {
      clearInterval(timer)
      onDone(false)
    }
  }, POLL_INTERVAL_MS)
  return () => clearInterval(timer)
}

export const MembershipReturnWatcher = () => {
  const queryClient = useQueryClient()
  const t = useTranslations('membership')
  const postId = useCurrentPostDataSelector((post) => post?.id)
  const { refetch, ready } = useRefetchCurrentPost()

  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    const params = new URLSearchParams(window.location.search)
    const kind =
      params.get('membership') === 'success'
        ? 'membership'
        : params.get('purchase') === 'success'
          ? 'purchase'
          : null
    if (!kind) return
    if (kind === 'purchase' && (!postId || !ready)) return
    startedRef.current = true

    const confirmingToast = toast.loading(t('toast_confirming'))

    const finish = (successText?: string) => {
      toast.dismiss(confirmingToast)
      if (successText) toast.success(successText)
      else toast.info(t('activating_pending'))
      stripParam(params, kind)
    }

    if (kind === 'membership') {
      return poll(
        async () => isActiveMembership(await apiClient.membership.status()),
        (ok) => {
          queryClient.invalidateQueries({ queryKey: membershipStatusQueryKey })
          finish(ok ? t('toast_sponsor') : undefined)
        },
      )
    }

    return poll(
      async () =>
        (await apiClient.membership.articlePurchased(postId!)).purchased,
      (ok) => {
        if (!ok) return finish()
        queryClient.setQueryData(articlePurchasedQueryKey(postId!), {
          purchased: true,
        })
        refetch()
          .catch(() => {})
          .finally(() => finish(t('toast_purchased')))
      },
    )
  }, [queryClient, t, postId, ready, refetch])

  return null
}
