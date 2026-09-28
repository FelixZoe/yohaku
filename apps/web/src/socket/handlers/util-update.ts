import type { NoteResponseMeta, PostResponseMeta } from '@mx-space/api-client'

import { getTranslation, setTranslationPending } from '~/atoms/translation'
import { DOMCustomEvents } from '~/constants/event'
import { articleMetaOf } from '~/lib/api/article-meta'
import { toAppLocale } from '~/lib/content-locale'
import { toast } from '~/lib/toast'

import type { EventHandler } from './types'
import { trackerRealtimeEvent, updateMessage } from './types'

type ArticleMeta = PostResponseMeta | NoteResponseMeta

interface UpdateComparable {
  content?: string | null
  id: string
  text?: string | null
}

interface LocalizedPayload {
  isTranslated?: boolean | null
  meta?: { lang?: string | null } | null
  payloadLang?: string | null
  sourceLang?: string | null
  translationMeta?: {
    sourceLang?: string | null
    targetLang?: string | null
  } | null
}

interface CurrentEntity<T> {
  data: T
  meta?: ArticleMeta
}

export const readPayloadLang = (
  payload: LocalizedPayload | null,
): string | null => {
  if (!payload) return null
  if (payload.payloadLang) return payload.payloadLang
  if (payload.isTranslated && payload.translationMeta?.targetLang) {
    return payload.translationMeta.targetLang
  }
  return (
    payload.translationMeta?.sourceLang ??
    payload.sourceLang ??
    payload.meta?.lang ??
    null
  )
}

export const readViewLang = <T>(
  current: CurrentEntity<T> | null,
): string | null => {
  if (!current) return null
  const translation = articleMetaOf(current.meta).translation
  if (translation?.isTranslated && translation.targetLang) {
    return translation.targetLang
  }
  const sourceCandidate = current.data as LocalizedPayload
  return sourceCandidate?.meta?.lang ?? null
}

export const isViewTranslated = <T>(
  current: CurrentEntity<T> | null,
): { targetLang: string } | null => {
  if (!current) return null
  const translation = articleMetaOf(current.meta).translation
  if (translation?.isTranslated && translation.targetLang) {
    return { targetLang: translation.targetLang }
  }
  return null
}

export const shouldSwapInTranslation = ({
  translationLang,
  pageLocale,
  viewTranslatedLang,
}: {
  translationLang: string
  pageLocale: string
  viewTranslatedLang: string | null
}) => {
  const target = toAppLocale(translationLang)
  if (!target || target !== toAppLocale(pageLocale)) return false
  return !viewTranslatedLang || toAppLocale(viewTranslatedLang) === target
}

export const shouldApplyLocalizedUpdate = (
  currentLang: string | null,
  nextLang: string | null,
) => {
  if (!currentLang || !nextLang) return true
  return currentLang === nextLang
}

export const createUpdateHandler =
  <T extends object>({
    getCurrent,
    sanitize,
    applyData,
    refetchTranslated,
  }: {
    getCurrent: () => CurrentEntity<T> | null
    applyData: (data: T) => void
    refetchTranslated: (current: T, targetLang: string) => Promise<void>
    sanitize?: (next: T) => T
  }): EventHandler =>
  (data) => {
    const nextData = sanitize ? sanitize(data as T) : (data as T)
    const nextComparable = nextData as T & UpdateComparable
    const current = getCurrent()
    if (!current) return

    const currentComparable = current.data as T & UpdateComparable
    if (currentComparable.id !== nextComparable.id) return

    const currentLang = readViewLang(current)
    const nextLang = readPayloadLang(nextData as LocalizedPayload)
    const translated = isViewTranslated(current)

    if (translated && nextLang && nextLang !== translated.targetLang) {
      void runTranslatedRefetch(
        current.data,
        translated.targetLang,
        refetchTranslated,
        currentComparable as UpdateComparable,
        nextComparable as UpdateComparable,
      )
      return
    }

    if (!shouldApplyLocalizedUpdate(currentLang, nextLang)) return

    const contentChanged = hasContentChanged(currentComparable, nextComparable)
    markTranslationPendingIfNeeded(nextComparable.id, contentChanged)

    applyData(nextData)
    toast.info(updateMessage)
    trackerRealtimeEvent()

    scheduleTocRefresh(contentChanged)
  }

const runTranslatedRefetch = async <T>(
  current: T,
  targetLang: string,
  refetchTranslated: (current: T, targetLang: string) => Promise<void>,
  currentComparable: UpdateComparable,
  nextComparable: UpdateComparable,
) => {
  const contentChanged = hasContentChanged(currentComparable, nextComparable)
  markTranslationPendingIfNeeded(currentComparable.id, contentChanged)

  try {
    await refetchTranslated(current, targetLang)
  } catch {
    return
  }

  toast.info(updateMessage)
  trackerRealtimeEvent()
  scheduleTocRefresh(contentChanged)
}

export const hasContentChanged = (
  a: UpdateComparable,
  b: UpdateComparable,
): boolean => a.text !== b.text || a.content !== b.content

const markTranslationPendingIfNeeded = (
  refId: string,
  contentChanged: boolean,
) => {
  const currentTranslation = getTranslation()
  if (
    currentTranslation &&
    currentTranslation.refId === refId &&
    currentTranslation.lang === document.documentElement.lang &&
    contentChanged
  ) {
    setTranslationPending(true)
  }
}

export const scheduleTocRefresh = (contentChanged: boolean) => {
  if (!contentChanged) return
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
  }, 100)
}
