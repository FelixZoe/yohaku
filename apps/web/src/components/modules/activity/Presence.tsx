'use client'

import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

import {
  useActivityPresence,
  useActivityPresenceByRoomName,
} from '~/atoms/hooks/activity'
import { useIsOwnerLogged, useOwner } from '~/atoms/hooks/owner'
import { useAllAuthReaders, useSessionReader } from '~/atoms/hooks/reader'
import { useIsImmersiveReadingEnabled } from '~/atoms/hooks/reading'
import { useSocketSessionId } from '~/atoms/hooks/socket'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { getServerTime } from '~/components/common/SyncServerTime'
import { RootPortal } from '~/components/ui/portal'
import { EmitKeyMap } from '~/constants/keys'
import { Spring } from '~/constants/spring'
import { useEventCallback } from '~/hooks/common/use-event-callback'
import { useIsClient } from '~/hooks/common/use-is-client'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { useReadPercent } from '~/hooks/shared/use-read-percent'
import { getColorScheme, stringToHue } from '~/lib/color'
import { safeJsonParse } from '~/lib/helper'
import { uniq } from '~/lib/lodash'
import { buildNSKey } from '~/lib/ns'
import { apiClient } from '~/lib/request'
import { queries } from '~/queries/definition'
import { socketWorker } from '~/socket/worker-client'

import { commentStoragePrefix } from '../comment/CommentBox/providers'
import { readPresenceCard, resolvePresenceUpdate } from './presence-card'
import { useRoomContext } from './Room'

export const Presence = () => {
  const isClient = useIsClient()

  return isClient ? <PresenceImpl /> : null
}

const presenceStoredNameAtom = atomWithStorage(buildNSKey('presence-name'), '')

const PresenceImpl = () => {
  const { roomName } = useRoomContext()
  const isMobile = useIsMobile()
  const { refetch } = useQuery({
    ...queries.activity.presence(roomName),

    refetchOnMount: true,
    refetchInterval: 30_000,
  })

  const identity = useSocketSessionId()

  const reader = useSessionReader()
  const owner = useOwner()

  const isOwnerLogged = useIsOwnerLogged()
  const commentStoredName = (() => {
    const value = globalThis?.localStorage.getItem(
      `${commentStoragePrefix}author`,
    )
    if (value) {
      return safeJsonParse(value) || value
    }
    return ''
  })()

  const presenceStoredName = useAtomValue(presenceStoredNameAtom)
  const presenceCard = readPresenceCard()
  const { displayName, image } = resolvePresenceUpdate({
    isOwnerLogged,
    ownerName: owner?.name,
    session: reader,
    card: presenceCard,
    commentName: presenceStoredName || commentStoredName,
  })

  const update = useDebouncedCallback(async (position: number) => {
    const sid = await socketWorker.getSid()
    if (!sid) return
    return apiClient.activity.updatePresence({
      identity,
      position,
      sid,
      roomName,
      displayName: displayName || void 0,
      ts: getServerTime().getTime() || Date.now(),
      ...(image ? { image } : {}),
    } as Parameters<typeof apiClient.activity.updatePresence>[0])
  }, 1000)

  const percent = useReadPercent()

  const updateWithPercent = useEventCallback(() => update(percent))

  useEffect(() => {
    const handler = () => {
      refetch()
      updateWithPercent()
    }
    globalThis.addEventListener(EmitKeyMap.SocketConnected, handler)

    return () => {
      globalThis.removeEventListener(EmitKeyMap.SocketConnected, handler)
    }
  }, [refetch, updateWithPercent])

  useEffect(() => {
    update(percent)
  }, [percent, update])

  if (isMobile) return null

  return <ReadPresenceTimeline />
}

const TRACK_TOP = 64
const TRACK_BOTTOM = 64
const CLUSTER_GAP_PX = 18
const HOVER_ZONE_WIDTH = 24
const EXPANDED_WIDTH = 280
const REST_X_STEP = 1.5
const SPREAD_X_BASE = 26
const SPREAD_X_STEP = 18

interface PresenceCluster {
  identities: string[]
  position: number
  stableKey: string
}

function clusterPresences(
  items: Array<{ identity: string; pct: number }>,
  trackHeightPx: number,
): PresenceCluster[] {
  if (items.length === 0) return []
  // gap 随轨高放大，保证摊平后至多 ~10 版
  const gapPx = Math.max(CLUSTER_GAP_PX, trackHeightPx / 10)
  const thresholdPct = (gapPx / trackHeightPx) * 100
  const sorted = [...items].sort((a, b) => a.pct - b.pct)
  const clusters: PresenceCluster[] = []
  let group = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].pct - group[0].pct <= thresholdPct) {
      group.push(sorted[i])
    } else {
      clusters.push(buildCluster(group))
      group = [sorted[i]]
    }
  }
  clusters.push(buildCluster(group))
  return clusters
}

function buildCluster(
  group: Array<{ identity: string; pct: number }>,
): PresenceCluster {
  const avg = group.reduce((s, x) => s + x.pct, 0) / group.length
  return {
    identities: group.map((x) => x.identity),
    position: avg,
    stableKey: group.map((x) => x.identity).sort()[0],
  }
}

const ReadPresenceTimeline = () => {
  const sessionId = useSocketSessionId()
  const isImmersive = useIsImmersiveReadingEnabled()
  const [isHovered, setIsHovered] = useState(false)

  const { roomName } = useRoomContext()
  const activityPresenceIdsCurrentRoom = useActivityPresenceByRoomName(roomName)
  const allPresence = useActivityPresence()
  const currentPercent = useReadPercent()

  const uniqueIds = uniq(activityPresenceIdsCurrentRoom)

  const clusters = useMemo(() => {
    const trackHeightPx = window.innerHeight - TRACK_TOP - TRACK_BOTTOM
    const items = uniqueIds
      .filter((id) => id !== sessionId)
      .map((id) => ({
        identity: id,
        pct: allPresence[id]?.position ?? 0,
      }))
    return clusterPresences(items, trackHeightPx)
  }, [uniqueIds, allPresence, sessionId])

  return (
    <RootPortal>
      <m.div
        data-hide-print
        className="fixed left-0 top-0 z-[3] h-screen"
        style={{ pointerEvents: isImmersive ? 'none' : 'auto' }}
        animate={{
          opacity: isImmersive ? 0 : 1,
          width: isHovered ? EXPANDED_WIDTH : HOVER_ZONE_WIDTH,
        }}
        transition={{
          opacity: Spring.presets.smooth,
          width: { type: 'spring', stiffness: 400, damping: 35 },
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="absolute left-0 right-0"
          style={{ top: TRACK_TOP, bottom: TRACK_BOTTOM }}
        >
          <SelfPlate isExpanded={isHovered} percent={currentPercent} />
          <AnimatePresence initial={false}>
            {clusters.map((cluster, index) => (
              <ClusterPlate
                cluster={cluster}
                index={index}
                isExpanded={isHovered}
                key={cluster.stableKey}
              />
            ))}
          </AnimatePresence>
        </div>
      </m.div>
    </RootPortal>
  )
}

const plateSpring = { type: 'spring', stiffness: 350, damping: 30 } as const

const SelfPlate: FC<{ percent: number; isExpanded: boolean }> = ({
  percent,
  isExpanded,
}) => {
  const t = useTranslations('activity')
  const position = useDeferredValue(percent)

  return (
    <m.div
      animate={{ x: isExpanded ? 8 : 0 }}
      className="absolute inset-y-0 left-0 w-px"
      transition={plateSpring}
    >
      <m.div
        animate={{ height: `${position}%` }}
        className="absolute left-0 top-0 w-px bg-accent/80"
        transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.8 }}
      />
      <m.div
        animate={{ top: `${position}%` }}
        className="absolute -ml-px size-[3px] -translate-y-full bg-accent/80"
        transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.8 }}
      />
      {isExpanded && (
        <m.span
          animate={{ opacity: 1 }}
          className="absolute -translate-y-full whitespace-nowrap pb-2 text-label-12 tabular-nums text-accent"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{ top: `${position}%`, left: 6 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          {t('presence_you')} {Math.round(position)}%
        </m.span>
      )}
    </m.div>
  )
}

interface ClusterPlateProps {
  cluster: PresenceCluster
  index: number
  isExpanded: boolean
}

const ClusterPlate: FC<ClusterPlateProps> = memo(
  ({ cluster, index, isExpanded }) => {
    const { identities, position: clusterPosition } = cluster
    const count = identities.length
    const position = useDeferredValue(clusterPosition)
    const heavy = count > 2
    const isDark = useIsDark()

    const dotColor = useMemo(
      () =>
        getColorScheme(stringToHue(cluster.stableKey))[
          isDark ? 'dark' : 'light'
        ].accent,
      [cluster.stableKey, isDark],
    )

    const restX = 1 + (index % 5) * REST_X_STEP
    const spreadX = SPREAD_X_BASE + index * SPREAD_X_STEP

    return (
      <m.div
        animate={{ x: isExpanded ? spreadX : restX, opacity: 1 }}
        className="absolute inset-y-0 left-0"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        style={{ width: heavy ? 2 : 1 }}
        transition={{ x: plateSpring, opacity: { duration: 0.15 } }}
      >
        <m.div
          className="absolute left-0 top-0 w-full bg-neutral-9/30"
          animate={{
            height: `${position}%`,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{
            height: {
              type: 'spring',
              stiffness: 120,
              damping: 20,
              mass: 0.8,
            },
            opacity: { duration: 0.3 },
          }}
        />
        <m.div
          animate={{ top: `${position}%` }}
          style={{ backgroundColor: isExpanded ? dotColor : undefined }}
          className={`absolute -ml-px -translate-y-full transition-colors duration-300 ${
            heavy ? 'size-1 bg-neutral-9/50' : 'size-[3px] bg-neutral-9/40'
          }`}
          transition={{
            type: 'spring',
            stiffness: 120,
            damping: 20,
            mass: 0.8,
          }}
        />
        {isExpanded && (
          <ClusterLabel identities={identities} position={position} />
        )}
      </m.div>
    )
  },
)
ClusterPlate.displayName = 'ClusterPlate'

const ClusterLabel: FC<{ identities: string[]; position: number }> = memo(
  ({ identities, position }) => {
    const t = useTranslations('activity')
    const presenceMap = useActivityPresence()
    const readers = useAllAuthReaders()

    const label = useMemo(() => {
      const count = identities.length
      const nameOf = (id: string) => {
        const p = presenceMap[id]
        if (!p) return ''
        const readerName = p.readerId ? readers[p.readerId]?.name : undefined
        return readerName || p.displayName?.trim() || ''
      }
      const leader = identities.map(nameOf).find((n) => n.length > 0)

      if (!leader) {
        return count === 1 ? '' : t('presence_anonymous_readers', { count })
      }
      if (count === 1) return leader
      return `${leader} ${t('presence_and_others_after_one', {
        count: count - 1,
      })}`
    }, [identities, presenceMap, readers, t])

    return (
      <m.span
        animate={{ opacity: 1 }}
        className="absolute whitespace-nowrap pt-1.5 text-label-12 tabular-nums text-neutral-7"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        style={{ top: `${position}%`, left: -2 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        {label ? `${label} ` : ''}
        {Math.round(position)}%
      </m.span>
    )
  },
)
ClusterLabel.displayName = 'ClusterLabel'
