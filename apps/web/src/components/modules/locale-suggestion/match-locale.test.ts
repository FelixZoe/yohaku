import { describe, expect, it } from 'vitest'

import { matchPreferredLocale } from './match-locale'

describe('matchPreferredLocale', () => {
  it('matches exact locales case-insensitively', () => {
    expect(matchPreferredLocale(['zh-TW'])).toBe('zh-TW')
    expect(matchPreferredLocale(['ZH-tw'])).toBe('zh-TW')
    expect(matchPreferredLocale(['ko'])).toBe('ko')
  })

  it('falls back to the base language', () => {
    expect(matchPreferredLocale(['en-US'])).toBe('en')
    expect(matchPreferredLocale(['ja-JP'])).toBe('ja')
    expect(matchPreferredLocale(['ko-KR'])).toBe('ko')
  })

  it('maps traditional Chinese regions and scripts to zh-TW', () => {
    expect(matchPreferredLocale(['zh-HK'])).toBe('zh-TW')
    expect(matchPreferredLocale(['zh-MO'])).toBe('zh-TW')
    expect(matchPreferredLocale(['zh-Hant'])).toBe('zh-TW')
    expect(matchPreferredLocale(['zh-Hant-HK'])).toBe('zh-TW')
  })

  it('maps other Chinese variants to zh', () => {
    expect(matchPreferredLocale(['zh'])).toBe('zh')
    expect(matchPreferredLocale(['zh-CN'])).toBe('zh')
    expect(matchPreferredLocale(['zh-Hans-SG'])).toBe('zh')
  })

  it('respects preference order across entries', () => {
    expect(matchPreferredLocale(['fr-FR', 'ja', 'en'])).toBe('ja')
    expect(matchPreferredLocale(['en-GB', 'zh-CN'])).toBe('en')
  })

  it('returns null when nothing matches', () => {
    expect(matchPreferredLocale([])).toBeNull()
    expect(matchPreferredLocale(['fr-FR', 'de'])).toBeNull()
  })
})
