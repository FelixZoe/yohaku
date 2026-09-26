import { atom } from 'jotai'

import { jotaiStore } from '~/lib/store'
import type { AITranslation } from '~/types/translation'

const translationAtom = atom<AITranslation | null>(null)

const translationPendingAtom = atom(false)
export function setTranslation(translation: AITranslation | null) {
  jotaiStore.set(translationAtom, translation)
}

export function getTranslation() {
  return jotaiStore.get(translationAtom)
}

export function setTranslationPending(pending: boolean) {
  jotaiStore.set(translationPendingAtom, pending)
}
