import { atom } from 'jotai'

import { jotaiStore } from '~/lib/store'
import { formatDuration } from '~/lib/tts-format'

export type TtsNarrationStatus = 'idle' | 'loading' | 'playing' | 'paused'

export interface TtsNarrationState {
  autoFollow: boolean
  available: boolean
  current: number
  duration: number
  elapsed: number
  playbackRate: number
  stale: boolean
  status: TtsNarrationStatus
  total: number
}

export const disabledTtsNarrationState: TtsNarrationState = {
  available: false,
  stale: false,
  status: 'idle',
  current: 0,
  total: 0,
  elapsed: 0,
  duration: 0,
  playbackRate: 1,
  autoFollow: true,
}

export const ttsNarrationAtom = atom<TtsNarrationState>(
  disabledTtsNarrationState,
)

export const narratingStatusAtom = atom((get) => get(ttsNarrationAtom).status)
export const isNarratingAtom = atom(
  (get) =>
    get(ttsNarrationAtom).status === 'playing' ||
    get(ttsNarrationAtom).status === 'paused',
)
export const narratingElapsedLabelAtom = atom((get) => {
  const s = get(ttsNarrationAtom)
  if (s.status === 'idle' || s.status === 'loading') return ''
  return formatDuration(s.elapsed)
})

export const setTtsNarration = (partial: Partial<TtsNarrationState>) =>
  jotaiStore.set(ttsNarrationAtom, (prev) => ({ ...prev, ...partial }))

export const ttsRevealRequestAtom = atom(0)
export const requestTtsReveal = () =>
  jotaiStore.set(ttsRevealRequestAtom, (count) => count + 1)

export interface TtsControls {
  cycleRate: () => void
  start: () => void
  stop: () => void
  toggle: () => void
}

export const ttsControlsAtom = atom<TtsControls | null>(null)
export const setTtsControls = (controls: TtsControls | null) =>
  jotaiStore.set(ttsControlsAtom, controls)
