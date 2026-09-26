'use client'

import { useEffect, useRef } from 'react'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useCurrentPostMetaSelector } from '~/providers/post/CurrentPostDataProvider'

import {
  entitlementReasonOf,
  shouldUnlockPaywalledContent,
} from './should-unlock-paywall'
import { useRefetchCurrentPost } from './use-refetch-current-post'
import { useIsActiveMember } from './useMembership'

export const MembershipContentUnlocker = () => {
  const reason = useCurrentPostMetaSelector((meta) =>
    entitlementReasonOf(meta?.paywall),
  )
  const isMember = useIsActiveMember()
  const isOwner = useIsOwnerLogged()
  const { refetch, ready } = useRefetchCurrentPost()

  const inflightRef = useRef(false)

  useEffect(() => {
    if (
      !shouldUnlockPaywalledContent({ reason, isMember, isOwner }) ||
      inflightRef.current
    )
      return
    if (!ready) return
    inflightRef.current = true
    refetch()
      .catch(() => {})
      .finally(() => {
        inflightRef.current = false
      })
  }, [reason, isMember, isOwner, ready, refetch])

  return null
}
