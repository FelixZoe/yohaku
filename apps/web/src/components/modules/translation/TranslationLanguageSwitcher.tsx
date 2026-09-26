'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { LanguageSelector } from '~/components/ui/language-selector'
import { locales } from '~/i18n/config'
import { usePathname, useRouter } from '~/i18n/navigation'

function getLanguageLabel(
  code: string,
  tCommon: (
    key:
      | 'language_zh'
      | 'language_zh_tw'
      | 'language_en'
      | 'language_ja'
      | 'language_ko',
  ) => string,
): string {
  if (code === 'zh') return tCommon('language_zh')
  if (code === 'zh-TW') return tCommon('language_zh_tw')
  if (code === 'en') return tCommon('language_en')
  if (code === 'ja') return tCommon('language_ja')
  if (code === 'ko') return tCommon('language_ko')

  return code.toUpperCase()
}

const isSupportedLocale = (code?: string | null): code is string =>
  !!code && (locales as readonly string[]).includes(code)

interface TranslationLanguageSwitcherProps {
  availableTranslations?: string[]
  sourceLang?: string
  triggerClassName?: string
}

export const TranslationLanguageSwitcher: FC<
  TranslationLanguageSwitcherProps
> = ({ availableTranslations, sourceLang, triggerClassName }) => {
  const t = useTranslations('translation')
  const tCommon = useTranslations('common')
  const appLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const languages = useMemo(() => {
    const langSet = new Set<string>()

    if (isSupportedLocale(sourceLang)) {
      langSet.add(sourceLang)
    }
    availableTranslations?.forEach((lang) => {
      if (isSupportedLocale(lang)) langSet.add(lang)
    })
    // 兜底：始终把当前 URL locale 纳入，保证 trigger 标签可解析
    if (isSupportedLocale(appLocale)) {
      langSet.add(appLocale)
    }

    return Array.from(langSet).map((code) => ({
      code,
      label: getLanguageLabel(code, tCommon),
      isOriginal: code === sourceLang,
    }))
  }, [appLocale, availableTranslations, sourceLang, tCommon])

  // 实际渲染的内容语种：appLocale 命中时即为 appLocale；否则后端走兜底，落到 sourceLang
  const displayedLanguage = useMemo(() => {
    if (appLocale === sourceLang) return appLocale
    if (availableTranslations?.includes(appLocale)) return appLocale
    return sourceLang ?? appLocale
  }, [appLocale, availableTranslations, sourceLang])

  const handleLanguageChange = useCallback(
    (lang: string) => {
      router.push(pathname, { locale: lang as (typeof locales)[number] })
    },
    [pathname, router],
  )

  if (languages.length <= 1) {
    return null
  }

  return (
    <span data-hide-print className="contents">
      <LanguageSelector
        currentLanguage={appLocale}
        displayedLanguage={displayedLanguage}
        languages={languages}
        originalLabel={t('original')}
        triggerClassName={triggerClassName}
        onLanguageChange={handleLanguageChange}
      />
    </span>
  )
}
