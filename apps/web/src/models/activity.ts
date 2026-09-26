import type { ActivityPresence as CoreActivityPresence } from '@mx-space/api-client'

export type ActivityPresence = CoreActivityPresence & {
  image?: string
}
