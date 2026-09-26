import type { PaywallMeta, PostEntitlementReason } from '@mx-space/api-client'

export const entitlementReasonOf = (
  paywall: PaywallMeta | undefined,
): PostEntitlementReason | undefined =>
  paywall?.entitlement?.reason ?? (paywall?.locked ? 'locked' : undefined)

export function shouldUnlockPaywalledContent({
  reason,
  isMember,
  isOwner,
}: {
  reason: PostEntitlementReason | undefined
  isMember: boolean
  isOwner: boolean
}): boolean {
  return reason === 'locked' && (isMember || isOwner)
}
