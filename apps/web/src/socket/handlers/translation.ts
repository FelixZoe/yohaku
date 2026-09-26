import {
  getTranslation,
  setTranslation,
  setTranslationPending,
} from '~/atoms/translation'
import { DOMCustomEvents } from '~/constants/event'
import { toast } from '~/lib/toast'
import { EventTypes } from '~/types/events'
import type { AITranslation } from '~/types/translation'

import type { EventHandler } from './types'
import { trackerRealtimeEvent } from './types'

export const translationHandler: EventHandler = (data) => {
  const translation = data as AITranslation
  const currentTranslation = getTranslation()

  if (
    currentTranslation &&
    currentTranslation.refId === translation.refId &&
    currentTranslation.lang === translation.lang
  ) {
    setTranslation(translation)
    setTranslationPending(false)
    toast.info('译文已更。')
    trackerRealtimeEvent('Translation Update')

    if (currentTranslation.text !== translation.text) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
      }, 100)
    }
  }
}

export const translationHandlers = {
  [EventTypes.TRANSLATION_CREATE]: translationHandler,
  [EventTypes.TRANSLATION_UPDATE]: translationHandler,
} as const
