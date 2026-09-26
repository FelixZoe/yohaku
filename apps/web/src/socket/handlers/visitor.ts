import { setOnlineCount } from '~/atoms'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import { resolveVisitorOnlineCount } from './visitor-payload'

export const visitorHandler: EventHandler = (data) => {
  const count = resolveVisitorOnlineCount(data)

  if (count !== null) {
    setOnlineCount(count)
  }
}

export const visitorEvents = [
  EventTypes.VISITOR_ONLINE,
  EventTypes.VISITOR_OFFLINE,
] as const
