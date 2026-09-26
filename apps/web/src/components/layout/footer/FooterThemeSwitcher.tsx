'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { flushSync } from 'react-dom'

import { useIsClient } from '~/hooks/common/use-is-client'
import { transitionViewIfSupported } from '~/lib/dom'
import { clsxm } from '~/lib/helper'

import { FooterKv } from './FooterKv'

export const FooterThemeSwitcher = () => {
  const t = useTranslations('common')
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()

  const options = [
    { value: 'light', label: t('theme_light'), aria: t('aria_theme_light') },
    { value: 'system', label: t('theme_system'), aria: t('aria_theme_system') },
    { value: 'dark', label: t('theme_dark'), aria: t('aria_theme_dark') },
  ]
  const current = isClient && theme ? theme : 'system'

  const handleSelect = (value: string) => {
    transitionViewIfSupported(
      () => {
        // eslint-disable-next-line @eslint-react/dom/no-flush-sync
        flushSync(() => setTheme(value))
      },
      { rootAnimation: true },
    )
  }

  return (
    <FooterKv label={t('footer_theme')}>
      <span className="inline-flex items-baseline">
        {options.map((o, i) => (
          <span key={o.value}>
            <button
              aria-label={o.aria}
              aria-pressed={current === o.value}
              type="button"
              className={clsxm(
                'transition-colors duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                current === o.value
                  ? 'text-neutral-8 underline decoration-current/30 underline-offset-2'
                  : 'text-neutral-6 hover:text-neutral-8',
              )}
              onClick={() => handleSelect(o.value)}
            >
              {o.label}
            </button>
            {i < options.length - 1 && (
              <span aria-hidden className="mx-1 select-none text-neutral-5">
                ·
              </span>
            )}
          </span>
        ))}
      </span>
    </FooterKv>
  )
}
