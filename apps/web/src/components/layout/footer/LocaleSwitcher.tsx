'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useTransition } from 'react'

import { useMarkLocaleSuggestionDismissed } from '~/components/modules/locale-suggestion/use-locale-suggestion'
import type { Locale } from '~/i18n/config'
import { locales } from '~/i18n/config'
import { usePathname, useRouter } from '~/i18n/navigation'

import { FooterKvMenu } from './FooterKv'

export const LocaleSwitcher = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const localeLabels: Record<Locale, string> = {
    zh: t('locale_zh'),
    'zh-TW': t('locale_zh_tw'),
    en: t('locale_en'),
    ja: t('locale_ja'),
    ko: t('locale_ko'),
  }

  const markSuggestionDismissed = useMarkLocaleSuggestionDismissed()

  const handleLocaleChange = useCallback(
    (newLocale: string) => {
      if (newLocale === locale) return
      markSuggestionDismissed(newLocale as Locale)
      startTransition(() => {
        router.push(pathname, { locale: newLocale })
      })
    },
    [locale, markSuggestionDismissed, pathname, router],
  )

  return (
    <FooterKvMenu
      disabled={isPending}
      label={t('footer_language')}
      options={locales.map((l) => ({ value: l, label: localeLabels[l] }))}
      value={locale}
      onSelect={handleLocaleChange}
    />
  )
}
