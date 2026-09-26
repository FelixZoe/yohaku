import type { Locale } from '~/i18n/config'
import { defaultLocale } from '~/i18n/config'
import { toAppLocale } from '~/lib/content-locale'

const parseAcceptLanguage = (header: string) =>
  header
    .split(',')
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(';')
      const tag = rawTag?.trim() ?? ''
      const qParam = params.find((param) => param.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1
      return { tag, q: Number.isFinite(q) ? q : 0 }
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)

export const resolveOgLocale = (acceptLanguage: string | null): Locale => {
  if (!acceptLanguage?.trim()) return defaultLocale

  for (const tag of parseAcceptLanguage(acceptLanguage)) {
    const locale = toAppLocale(tag)
    if (locale) return locale
  }

  return defaultLocale
}

export const withAcceptLanguageVary = (response: Response) => {
  response.headers.set('Vary', 'Accept-Language')
  return response
}
