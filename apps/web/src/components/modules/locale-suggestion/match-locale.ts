import type { Locale } from '~/i18n/config'
import { locales } from '~/i18n/config'

const TRADITIONAL_CHINESE = /^zh-(?:hant|hk|mo|tw)(?:-|$)/

export const matchPreferredLocale = (
  languages: readonly string[],
): Locale | null => {
  for (const language of languages) {
    const lower = language.toLowerCase()
    const exact = locales.find((l) => l.toLowerCase() === lower)
    if (exact) return exact
    if (lower === 'zh' || lower.startsWith('zh-')) {
      return TRADITIONAL_CHINESE.test(lower) ? 'zh-TW' : 'zh'
    }
    const base = lower.split('-')[0]
    const baseMatch = locales.find((l) => l === base)
    if (baseMatch) return baseMatch
  }
  return null
}
