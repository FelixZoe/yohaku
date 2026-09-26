import type { ArchiveEntitlement } from '@mx-space/api-client'

export type ArchiveStatus = 'unlocked' | 'free-window' | 'locked'

export const archiveStatusOf = (
  entitlement: ArchiveEntitlement,
): ArchiveStatus =>
  entitlement === 'locked'
    ? 'locked'
    : entitlement === 'free-window'
      ? 'free-window'
      : 'unlocked'
