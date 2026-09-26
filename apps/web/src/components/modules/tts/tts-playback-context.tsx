'use client'

import type { AITtsSegmentModel } from '@mx-space/api-client'
import { createContext, use } from 'react'

import type { TtsPlayback } from './use-tts-playback'

export interface TtsPlaybackContextValue {
  activated: boolean
  isCurrentBlock: (blockId: string) => boolean
  playback: TtsPlayback
  playBlock: (blockId: string) => void
  segments: AITtsSegmentModel[]
}

const TtsPlaybackContext = createContext<TtsPlaybackContextValue | null>(null)

export function TtsPlaybackProvider({
  value,
  children,
}: {
  value: TtsPlaybackContextValue
  children: React.ReactNode
}) {
  return (
    <TtsPlaybackContext value={value}>
      {children}
    </TtsPlaybackContext>
  )
}

export function useTtsPlaybackContext() {
  return use(TtsPlaybackContext)
}
