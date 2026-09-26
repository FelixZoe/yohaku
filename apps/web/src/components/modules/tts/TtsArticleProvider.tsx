'use client'

import type { AITtsModel, TtsMeta } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import {
  disabledTtsNarrationState,
  setTtsControls,
  setTtsNarration,
  type TtsNarrationStatus,
} from '~/atoms/tts'
import { BlockGutterActionProvider } from '~/components/modules/comment/BlockGutterActionContext'
import { toast } from '~/lib/toast'
import { queries } from '~/queries/definition'

import { TtsPlaybackProvider } from './tts-playback-context'
import { TtsBlockAction } from './TtsBlockAction'
import { TtsFloatingPlayer } from './TtsFloatingPlayer'
import { TtsHighlightBar } from './TtsHighlightBar'
import { TtsTopPlayer } from './TtsTopPlayer'
import { useTtsPlayback } from './use-tts-playback'

export function TtsArticleProvider({
  articleId,
  ttsMeta,
  content,
  lang,
  children,
}: {
  articleId: string
  ttsMeta: TtsMeta | undefined
  content: string | null | undefined
  lang?: string | null
  children: React.ReactNode
}) {
  const [activated, setActivated] = useState(false)
  const [playOnLoad, setPlayOnLoad] = useState(false)
  const t = useTranslations('tts')

  const available = ttsMeta?.available ?? false

  const ttsQuery = useQuery({
    ...queries.tts.byArticle(articleId, lang ?? undefined),
    enabled: activated && available,
    staleTime: 5 * 60 * 1000,
  })

  const ttsData: AITtsModel | null | undefined = ttsQuery.data
  const segments = useMemo(() => ttsData?.segments ?? [], [ttsData])

  const playback = useTtsPlayback(
    useMemo(() => segments.map((s) => s.url), [segments]),
  )

  useEffect(() => {
    if (playOnLoad && ttsData) {
      setPlayOnLoad(false)
      playback.playAll()
    }
  }, [playOnLoad, ttsData, playback])

  const status: TtsNarrationStatus = !available
    ? 'idle'
    : activated && ttsQuery.isLoading
      ? 'loading'
      : playback.playingIndex === null
        ? 'idle'
        : playback.isPlaying
          ? 'playing'
          : 'paused'

  useEffect(() => {
    setTtsNarration({
      available,
      stale: ttsMeta?.stale ?? false,
      status,
      current: playback.playingIndex === null ? 0 : playback.playingIndex + 1,
      total: segments.length,
      playbackRate: playback.playbackRate,
    })
  }, [
    available,
    ttsMeta,
    status,
    playback.playingIndex,
    segments.length,
    playback.playbackRate,
  ])

  useEffect(() => {
    return () => setTtsNarration(disabledTtsNarrationState)
  }, [])
  useEffect(() => {
    if (ttsQuery.isError) toast.error(t('error'))
  }, [ttsQuery.isError, t])
  useEffect(() => {
    setTtsControls({
      start: () => {
        if (!activated) {
          setActivated(true)
          setPlayOnLoad(true)
          return
        }
        playback.playAll()
      },
      toggle: () => {
        if (!activated) {
          setActivated(true)
          setPlayOnLoad(true)
          return
        }
        if (playback.playingIndex === null) playback.playAll()
        else playback.toggleSegment(playback.playingIndex)
      },
      stop: () => {
        playback.reset()
        setTtsNarration({ autoFollow: true })
      },
      cycleRate: () => {
        const rates = [1, 1.25, 1.5, 1.75, 2]
        playback.setPlaybackRate(
          rates[(rates.indexOf(playback.playbackRate) + 1) % rates.length],
        )
      },
    })
    return () => setTtsControls(null)
  }, [activated, playback])

  const isCurrentBlock = useCallback(
    (blockId: string) => {
      if (playback.playingIndex === null) return false
      return segments[playback.playingIndex]?.blockId === blockId
    },
    [playback.playingIndex, segments],
  )

  const playBlock = useCallback(
    (blockId: string) => {
      const idx = segments.findIndex((s) => s.blockId === blockId)
      if (idx === -1) return
      playback.toggleSegment(idx)
    },
    [playback, segments],
  )

  const activeBlockIds = useMemo(() => {
    const ids = new Set<string>()
    if (playback.playingIndex !== null) {
      const seg = segments[playback.playingIndex]
      if (seg) ids.add(seg.blockId)
    }
    return ids
  }, [playback.playingIndex, segments])

  const ctxValue = useMemo(
    () => ({
      segments,
      playback,
      activated,
      isCurrentBlock,
      playBlock,
    }),
    [segments, playback, activated, isCurrentBlock, playBlock],
  )

  const gutterAction = useCallback(
    (props: { blockId: string; blockIndex: number; isHovered: boolean }) => (
      <TtsBlockAction blockId={props.blockId} isHovered={props.isHovered} />
    ),
    [],
  )

  const gutterCtxValue = useMemo(
    () => ({ activeBlockIds, render: gutterAction }),
    [activeBlockIds, gutterAction],
  )

  if (!available) {
    return <>{children}</>
  }

  return (
    <TtsPlaybackProvider value={ctxValue}>
      <BlockGutterActionProvider value={gutterCtxValue}>
        <Fragment>
          <TtsHighlightBar
            content={content}
            playingIndex={playback.playingIndex}
            segments={segments}
          />
          <TtsTopPlayer />
          <TtsFloatingPlayer />
          {children}
        </Fragment>
      </BlockGutterActionProvider>
    </TtsPlaybackProvider>
  )
}
