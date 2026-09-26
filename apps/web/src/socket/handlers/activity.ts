import type { AuthUser } from '@mx-space/api-client'

import {
  deleteActivityPresence,
  setActivityMediaInfo,
  setActivityPresence,
  setActivityProcessInfo,
} from '~/atoms/activity'
import { setAuthReaders } from '~/atoms/hooks/reader'
import { setOwnerStatus } from '~/atoms/hooks/status'
import type { OwnerStatus } from '~/atoms/status'
import { toast } from '~/lib/toast'
import type { ActivityPresence } from '~/models/activity'
import { queryClient } from '~/providers/root/react-query-provider'
import { queries } from '~/queries/definition'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import { trackerRealtimeEvent } from './types'

interface ProcessInfo {
  description: string
  iconBase64: string
  name: string
}

export const activityUpdatePresenceHandler: EventHandler = (data) => {
  const payload = data as ActivityPresence & {
    reader?: AuthUser
  }
  const { queryKey } = queries.activity.presence(payload.roomName)
  const queryState = queryClient.getQueryState(queryKey)
  queryClient.cancelQueries({
    queryKey,
  })

  setActivityPresence({
    ...payload,
    readerId: payload.reader?.id ?? payload.readerId,
  })

  if (payload.reader) {
    setAuthReaders({
      [payload.reader.id]: payload.reader as AuthUser,
    })
  }
  if (!queryState?.data) {
    queryClient.invalidateQueries({
      queryKey,
    })
  }
}

export const activityLeavePresenceHandler: EventHandler = (data) => {
  const payload = data as {
    identity: string
    roomName: string
  }

  queryClient.cancelQueries({
    queryKey: queries.activity.presence(payload.roomName).queryKey,
  })
  deleteActivityPresence(payload.identity)
}

export const mediaUpdateHandler: EventHandler = (data) => {
  setActivityMediaInfo(data)
}

export const psUpdateHandler: EventHandler = (data) => {
  const process = data.processInfo as ProcessInfo
  setActivityProcessInfo(process)
}

export const shiroUpdateHandler: EventHandler = () => {
  toast.info('站点已更，请刷新以见新貌。', {
    onClick: () => {
      location.reload()
    },
    autoClose: false,
  })
  trackerRealtimeEvent('Yohaku Update')
}

export const shiroStatusHandler: EventHandler = (data) => {
  queryClient.cancelQueries({
    queryKey: ['shiro-status'],
  })
  setOwnerStatus(data as OwnerStatus | null)
}

export const activityHandlers = {
  [EventTypes.ACTIVITY_UPDATE_PRESENCE]: activityUpdatePresenceHandler,
  [EventTypes.ACTIVITY_LEAVE_PRESENCE]: activityLeavePresenceHandler,
  [EventTypes.FN_MEDIA_UPDATE]: mediaUpdateHandler,
  [EventTypes.FN_PS_UPDATE]: psUpdateHandler,
  [EventTypes.FN_SHIRO_UPDATE]: shiroUpdateHandler,
  [EventTypes.FN_SHIRO_STATUS]: shiroStatusHandler,
} as const
