'use client'

import { useEffect } from 'react'

import { useCurrentPostMetaSelector } from '~/providers/post/CurrentPostDataProvider'

import { scheduleFreeWindowExpiry } from './free-window-expiry'
import { entitlementReasonOf } from './should-unlock-paywall'
import { useRefetchCurrentPost } from './use-refetch-current-post'

export const FreeWindowExpiryWatcher = () => {
  const freeUntil = useCurrentPostMetaSelector((meta) =>
    entitlementReasonOf(meta?.paywall) === 'free-window'
      ? meta?.paywall?.freeUntil
      : undefined,
  )
  const { refetch, ready } = useRefetchCurrentPost()

  useEffect(() => {
    if (!freeUntil || !ready) return
    return scheduleFreeWindowExpiry(freeUntil, () => {
      refetch().catch(() => {})
    })
  }, [freeUntil, ready, refetch])

  return null
}
