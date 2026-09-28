import { swapPaperContentInPlace } from '~/components/layout/container/paper-swap'
import { DOMCustomEvents } from '~/constants/event'
import { articleMetaOf } from '~/lib/api/article-meta'
import { toast } from '~/lib/toast'
import { getCurrentNoteData } from '~/providers/note/CurrentNoteDataProvider'
import { EventTypes } from '~/types/events'
import type { AITranslation } from '~/types/translation'

import { applyNotePayload, fetchNoteInLang } from './note'
import type { EventHandler } from './types'
import { trackerRealtimeEvent } from './types'
import { shouldSwapInTranslation } from './util-update'

const createTranslationHandler =
  (isUpdate: boolean): EventHandler =>
  async (data) => {
    const translation = data as AITranslation
    const current = getCurrentNoteData()
    if (!current || current.data.id !== translation.refId) return

    const view = articleMetaOf(current.meta).translation
    const shouldSwap = shouldSwapInTranslation({
      translationLang: translation.lang,
      pageLocale: document.documentElement.lang,
      viewTranslatedLang: view?.isTranslated ? (view.targetLang ?? null) : null,
    })
    if (!shouldSwap) return

    let fresh: Awaited<ReturnType<typeof fetchNoteInLang>>
    try {
      fresh = await fetchNoteInLang(current.data.nid, translation.lang)
    } catch {
      return
    }
    if (getCurrentNoteData()?.data.id !== translation.refId) return

    swapPaperContentInPlace(() => applyNotePayload(fresh))
    if (isUpdate) toast.info('译文已更。')
    trackerRealtimeEvent('Translation Update')

    setTimeout(() => {
      document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
    }, 100)
  }

export const translationHandlers = {
  [EventTypes.TRANSLATION_CREATE]: createTranslationHandler(false),
  [EventTypes.TRANSLATION_UPDATE]: createTranslationHandler(true),
} as const
