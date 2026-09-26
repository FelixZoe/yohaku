import type { ArticleTranslation } from '@mx-space/api-client'

import type { Locale } from '~/i18n/config'
import { locales } from '~/i18n/config'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'

const localeSet = new Set<string>(locales)
const traditionalChineseLocale = /^zh-(?:hant|hk|mo|tw)(?:-|$)/

export const isAppLocale = (locale?: string | null): locale is Locale =>
  !!locale && localeSet.has(locale)

export const toAppLocale = (locale?: string | null): Locale | null => {
  if (!locale) return null

  const normalized = locale.toLowerCase()
  const exact = locales.find(
    (candidate) => candidate.toLowerCase() === normalized,
  )
  if (exact) return exact

  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return traditionalChineseLocale.test(normalized) ? 'zh-TW' : 'zh'
  }

  const base = normalized.split('-')[0]
  return locales.find((candidate) => candidate === base) ?? null
}

export const getContentLocaleRedirect = (
  requestedLocale: string,
  translation?: ArticleTranslation | null,
): Locale | null => {
  if (!translation || !isAppLocale(requestedLocale)) return null

  const supportedLocales = new Set<Locale>()
  const addSupportedLocale = (locale?: string | null) => {
    const appLocale = toAppLocale(locale)
    if (appLocale) supportedLocales.add(appLocale)
  }

  addSupportedLocale(translation.sourceLang)
  translation.availableTranslations?.forEach(addSupportedLocale)
  if (translation.isTranslated) {
    addSupportedLocale(translation.targetLang)
  }

  const isZhVariantRequest =
    requestedLocale === 'zh' || requestedLocale === 'zh-TW'
  const zhVariantAvailable =
    supportedLocales.has('zh') || supportedLocales.has('zh-TW')

  if (
    supportedLocales.size === 0 ||
    supportedLocales.has(requestedLocale) ||
    (isZhVariantRequest && zhVariantAvailable)
  ) {
    return null
  }

  const sourceLocale = toAppLocale(translation.sourceLang)
  if (sourceLocale) return sourceLocale
  return supportedLocales.values().next().value ?? null
}

export const getContentRedirectPath = ({
  requestedLocale,
  requestedPath,
  canonicalPath,
}: {
  requestedLocale: string
  requestedPath: string
  canonicalPath: string
}): string | null => {
  if (!isAppLocale(requestedLocale)) return null

  const requestedPathname = new URL(requestedPath, 'https://content.invalid')
    .pathname
  const canonicalPathname = new URL(canonicalPath, 'https://content.invalid')
    .pathname
  if (requestedPathname === canonicalPathname) return null

  return buildLocalePrefixedPath(requestedLocale, canonicalPath)
}
