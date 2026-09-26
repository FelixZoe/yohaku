import { atom } from 'jotai'

import {
  disabledLiveDeskState,
  getVisibleLiveDeskProjection,
} from '~/lib/live-desk/reducer'
import { jotaiStore } from '~/lib/store'
import type { LiveDeskState } from '~/models/live-desk'

export const liveDeskAtom = atom<LiveDeskState>(disabledLiveDeskState)

export const visibleLiveDeskProjectionAtom = atom((get) =>
  getVisibleLiveDeskProjection(get(liveDeskAtom)),
)

export const getLiveDeskState = () => jotaiStore.get(liveDeskAtom)

export const setLiveDeskState = (state: LiveDeskState) => {
  jotaiStore.set(liveDeskAtom, state)
}
