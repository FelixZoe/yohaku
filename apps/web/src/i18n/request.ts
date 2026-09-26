import { locale as rootLocale } from 'next/root-params'
import { getRequestConfig } from 'next-intl/server'

import defaultMessages from '../messages/zh'
import { defaultTimeZone } from './config'
import { routing } from './routing'

const defaultLocale = 'zh'

const messagesMap = {
  'zh-TW': () => import('../messages/zh-TW'),
  en: () => import('../messages/en'),
  ja: () => import('../messages/ja'),
  ko: () => import('../messages/ko'),
} as const

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = explicitLocale ?? (await rootLocale())

  const defaultReturn = {
    locale: defaultLocale,
    messages: defaultMessages,
    timeZone: defaultTimeZone,
  }
  if (!locale || !routing.locales.includes(locale as any)) {
    return defaultReturn
  }

  const messagesLoader = messagesMap[locale as keyof typeof messagesMap]
  if (!messagesLoader) {
    return defaultReturn
  }

  const messages = await messagesLoader()

  return {
    locale,
    messages: messages.default,
    timeZone: defaultTimeZone,
  }
})
