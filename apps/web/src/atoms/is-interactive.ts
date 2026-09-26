import { atom } from 'jotai'

import { jotaiStore } from '~/lib/store'

const isInteractiveAtom = atom(false)

export const setIsInteractive = (value: boolean) =>
  jotaiStore.set(isInteractiveAtom, value)
