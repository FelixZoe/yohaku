import { defineRouting } from 'next-intl/routing'

import { defaultLocale, locales } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  // HTML emits hreflang with SEO-specific codes (e.g. zh-CN); disabling this prevents
  // next-intl from also emitting raw locale codes (e.g. zh) in the Link response header.
  alternateLinks: false,
})
