'use client'

import type {
  ArticlePurchasedResult,
  MembershipArticlePurchaseInfo,
  MembershipPlanInfo,
  MembershipPlansResult,
  MembershipStatusResult,
} from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'

import { useSessionReader } from '~/atoms/hooks/reader'
import { apiClient } from '~/lib/request'

export const membershipStatusQueryKey = ['membership', 'status']
export const membershipPlansQueryKey = ['membership', 'plans']
export const articlePurchasedQueryKey = (postId: string) =>
  ['membership', 'article-purchased', postId] as const

export const useMembershipPlans = () =>
  useQuery<MembershipPlansResult>({
    queryKey: membershipPlansQueryKey,
    queryFn: () => apiClient.membership.plans(),
    staleTime: 5 * 60_000,
  })

export const useAvailablePlans = (): {
  plans: MembershipPlanInfo[]
  articlePurchase: MembershipArticlePurchaseInfo | undefined
} => {
  const { data } = useMembershipPlans()
  return {
    plans: data?.enabled ? data.plans : [],
    articlePurchase: data?.articlePurchase,
  }
}

export const useMembershipEnabled = (): boolean => {
  const { data } = useMembershipPlans()
  return !!data?.enabled
}

export const useMembershipStatus = () => {
  const session = useSessionReader()
  return useQuery<MembershipStatusResult>({
    queryKey: membershipStatusQueryKey,
    queryFn: () => apiClient.membership.status(),
    enabled: !!session,
    staleTime: 60_000,
  })
}

export const isActiveMembership = (status?: MembershipStatusResult) =>
  status?.status === 'active' || status?.status === 'on_hold'

export const useIsActiveMember = () => {
  const { data } = useMembershipStatus()
  return isActiveMembership(data)
}

export const useArticlePurchasedQuery = (
  postId: string | undefined,
  enabled: boolean,
) => {
  const session = useSessionReader()
  return useQuery<ArticlePurchasedResult>({
    queryKey: articlePurchasedQueryKey(postId ?? ''),
    queryFn: () => apiClient.membership.articlePurchased(postId!),
    enabled: !!session && !!postId && enabled,
    staleTime: 60_000,
  })
}
