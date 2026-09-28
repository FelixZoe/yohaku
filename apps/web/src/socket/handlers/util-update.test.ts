import type { PostResponseMeta } from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import {
  isViewTranslated,
  readPayloadLang,
  readViewLang,
  shouldApplyLocalizedUpdate,
  shouldSwapInTranslation,
} from './util-update'

const buildPostMeta = (
  isTranslated: boolean,
  targetLang?: string,
  sourceLang?: string,
): PostResponseMeta =>
  ({
    translation: {
      article: {
        isTranslated,
        targetLang,
        sourceLang,
      },
    },
  }) as unknown as PostResponseMeta

describe('shouldApplyLocalizedUpdate', () => {
  it('allows updates when either side has no detectable lang', () => {
    expect(shouldApplyLocalizedUpdate(null, 'ja')).toBe(true)
    expect(shouldApplyLocalizedUpdate('ja', null)).toBe(true)
    expect(shouldApplyLocalizedUpdate(null, null)).toBe(true)
  })

  it('allows updates when langs match', () => {
    expect(shouldApplyLocalizedUpdate('ja', 'ja')).toBe(true)
  })

  it('rejects updates when langs differ', () => {
    expect(shouldApplyLocalizedUpdate('ja', 'zh')).toBe(false)
  })
})

describe('readPayloadLang', () => {
  it('prefers payloadLang when present', () => {
    expect(
      readPayloadLang({
        payloadLang: 'ja',
        translationMeta: { sourceLang: 'zh' },
      }),
    ).toBe('ja')
  })

  it('uses translation target when payload claims translated', () => {
    expect(
      readPayloadLang({
        isTranslated: true,
        translationMeta: { sourceLang: 'zh', targetLang: 'ja' },
      }),
    ).toBe('ja')
  })

  it('falls back to source / meta.lang for source-language payloads', () => {
    expect(
      readPayloadLang({
        isTranslated: false,
        translationMeta: { sourceLang: 'zh' },
      }),
    ).toBe('zh')
    expect(readPayloadLang({ sourceLang: 'zh' })).toBe('zh')
    expect(readPayloadLang({ meta: { lang: 'zh' } })).toBe('zh')
  })

  it('returns null when no lang signal is present', () => {
    expect(readPayloadLang({})).toBeNull()
    expect(readPayloadLang(null)).toBeNull()
  })
})

describe('readViewLang', () => {
  it('returns translation target when the view is translated', () => {
    expect(
      readViewLang({
        data: { id: 'p-1', meta: { lang: 'zh' } } as any,
        meta: buildPostMeta(true, 'ja', 'zh'),
      }),
    ).toBe('ja')
  })

  it('returns source lang when the view is not translated', () => {
    expect(
      readViewLang({
        data: { id: 'p-1', meta: { lang: 'zh' } } as any,
        meta: buildPostMeta(false, undefined, 'zh'),
      }),
    ).toBe('zh')
  })

  it('returns null when no view exists', () => {
    expect(readViewLang(null)).toBeNull()
  })
})

describe('isViewTranslated', () => {
  it('returns targetLang for translated views', () => {
    expect(
      isViewTranslated({
        data: { id: 'p-1' } as any,
        meta: buildPostMeta(true, 'ja', 'zh'),
      }),
    ).toEqual({ targetLang: 'ja' })
  })

  it('returns null when not translated', () => {
    expect(
      isViewTranslated({
        data: { id: 'p-1' } as any,
        meta: buildPostMeta(false, undefined, 'zh'),
      }),
    ).toBeNull()
    expect(
      isViewTranslated({
        data: { id: 'p-1' } as any,
        meta: buildPostMeta(true, undefined, 'zh'),
      }),
    ).toBeNull()
    expect(isViewTranslated(null)).toBeNull()
  })
})

describe('shouldSwapInTranslation', () => {
  it('swaps in a new translation for the locale the reader is on', () => {
    expect(
      shouldSwapInTranslation({
        translationLang: 'en',
        pageLocale: 'en',
        viewTranslatedLang: null,
      }),
    ).toBe(true)
  })

  it('swaps an updated translation already on screen', () => {
    expect(
      shouldSwapInTranslation({
        translationLang: 'ja',
        pageLocale: 'ja',
        viewTranslatedLang: 'ja',
      }),
    ).toBe(true)
  })

  it('ignores translations for other locales', () => {
    expect(
      shouldSwapInTranslation({
        translationLang: 'ja',
        pageLocale: 'en',
        viewTranslatedLang: null,
      }),
    ).toBe(false)
    expect(
      shouldSwapInTranslation({
        translationLang: 'en',
        pageLocale: 'en',
        viewTranslatedLang: 'ja',
      }),
    ).toBe(false)
  })

  it('normalizes locale variants', () => {
    expect(
      shouldSwapInTranslation({
        translationLang: 'zh-Hant',
        pageLocale: 'zh-TW',
        viewTranslatedLang: null,
      }),
    ).toBe(true)
  })
})
