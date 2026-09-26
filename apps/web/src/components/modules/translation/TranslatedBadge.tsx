'use client'

import type { ArticleTranslation } from '@mx-space/api-client'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

const getLanguageNames = (
  t: ReturnType<typeof useTranslations<'common'>>,
): Record<string, string> => ({
  en: t('language_en'),
  zh: t('language_zh'),
  'zh-TW': t('language_zh_tw'),
  ja: t('language_ja'),
  ko: t('language_ko'),
})

function getLanguageName(
  code?: string,
  t?: ReturnType<typeof useTranslations<'common'>>,
): string {
  if (!code) return 'Unknown'
  const names = t ? getLanguageNames(t) : {}
  return names[code] || code.toUpperCase()
}

interface TranslatedBadgeProps {
  articleTranslation: ArticleTranslation
  className?: string
}

export function TranslatedBadge({
  articleTranslation,
  className,
}: TranslatedBadgeProps) {
  const t = useTranslations('common')

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-12 font-medium leading-4',
        'bg-accent/8 text-accent/80',
        'dark:bg-accent/10 dark:text-accent/70',
        className,
      )}
    >
      {getLanguageName(articleTranslation.sourceLang, t)}
      <i className="i-mingcute-arrow-right-line text-icon-sm" />
      {getLanguageName(articleTranslation.targetLang, t)}
    </span>
  )
}
