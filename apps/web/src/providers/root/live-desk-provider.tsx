'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { getServerTime } from '~/components/common/SyncServerTime'
import { SocketConnectedEvent } from '~/events'
import {
  liveDeskPublicStateQueryKey,
  liveDeskPublicStateQueryOptions,
} from '~/lib/live-desk/query'
import { writeLiveDeskState } from '~/lib/live-desk/state-writer'
import {
  COMPANION_PRESENCE_CHANGED_EVENT,
  LiveDeskTransportCoordinator,
} from '~/lib/live-desk/transport-coordinator'

import { useAppConfigSelector } from './aggregation-data-provider'

export const LiveDeskTransportProvider = () => {
  const enabled =
    useAppConfigSelector((config) => config.module.liveDesk.enable) === true
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const queryClient = useQueryClient()
  const query = useQuery({
    ...liveDeskPublicStateQueryOptions(),
    enabled,
  })
  const refetchRef = useRef(query.refetch)
  refetchRef.current = query.refetch

  const coordinatorRef = useRef<LiveDeskTransportCoordinator | null>(null)
  if (coordinatorRef.current === null) {
    coordinatorRef.current = new LiveDeskTransportCoordinator({
      now: () => getServerTime().getTime(),
      onResync: () => {
        if (!enabledRef.current) return
        void refetchRef.current({ cancelRefetch: false })
      },
      onStateChange: (state) => writeLiveDeskState(queryClient, state),
    })
  }
  const coordinator = coordinatorRef.current

  useEffect(() => {
    coordinator.setEnabled(enabled)
    if (!enabled) {
      queryClient.removeQueries({
        exact: true,
        queryKey: liveDeskPublicStateQueryKey,
      })
    }
  }, [coordinator, enabled, queryClient])

  useEffect(() => {
    if (query.data) coordinator.acceptRest(query.data)
  }, [coordinator, query.data])

  useEffect(() => {
    if (query.isError) coordinator.handleRestError()
  }, [coordinator, query.isError])

  useEffect(() => {
    if (!enabled) return

    const handlePresenceChanged = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      coordinator.acceptSocket(event.detail)
    }
    const handleSocketConnected = () => coordinator.handleSocketConnected()

    window.addEventListener(
      COMPANION_PRESENCE_CHANGED_EVENT,
      handlePresenceChanged,
    )
    window.addEventListener(SocketConnectedEvent.type, handleSocketConnected)

    return () => {
      window.removeEventListener(
        COMPANION_PRESENCE_CHANGED_EVENT,
        handlePresenceChanged,
      )
      window.removeEventListener(
        SocketConnectedEvent.type,
        handleSocketConnected,
      )
    }
  }, [coordinator, enabled])

  useEffect(() => () => coordinator.dispose(), [coordinator])

  return null
}
