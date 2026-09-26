'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useState } from 'react'

import { FloatPopover } from '~/components/ui/float-popover'
import { IconScaleTransition } from '~/components/ui/transition/IconScaleTransnsition'
import { toast } from '~/lib/toast'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { Signature } from '../shared/Signature'

const CC_DEED_URL: Record<string, string> = {
  zh: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans',
  ja: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja',
  en: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en',
}

export const PostCopyright: FC = () => {
  const t = useTranslations('post')
  const tCommon = useTranslations('common')
  const format = useFormatter()
  const locale = useLocale()
  const name = useAggregationSelector((data) => data.user.name)

  const webUrl = useAggregationSelector((data) => data.url.webUrl)
  const data = useCurrentPostDataSelector(
    (data) => {
      if (!webUrl) return null
      if (!data) return null
      return {
        title: data.title,
        link: `${webUrl}/posts/${data.category.slug}/${data.slug}`,
        date: data.modifiedAt,
        isPremium: data.isPremium,
      }
    },
    [webUrl],
  )

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data!.link)
      setCopied(true)
      toast.success(tCommon('copy_article_link'))
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!data) return null
  const { title, link, date, isPremium } = data
  const lastModified = date
    ? format.dateTime(new Date(date), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : ''

  return (
    <footer className="mt-8 w-full pt-5" id="copyright">
      <div className="h-px bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.04]" />

      <div className="mt-5 flex flex-col gap-1.5 text-label-12 text-neutral-6">
        <div>
          {title} · {name}
          {lastModified && ` · ${lastModified}`}
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <span className="break-all">{link}</span>
          <button
            data-hide-print
            aria-label={t('copyright_copy')}
            className="hidden shrink-0 rounded transition-colors hover:bg-neutral-2 size-4 md:flex items-center justify-center"
            type="button"
            onClick={handleCopy}
          >
            <IconScaleTransition
              className="size-3.5 text-neutral-4"
              icon1="i-mingcute-copy-2-fill"
              icon2="i-mingcute-check-line"
              status={copied ? 'done' : 'init'}
            />
          </button>
        </div>

        {isPremium ? (
          <div>{t('copyright_reserved')}</div>
        ) : (
          <div>
            {t('copyright_license_prefix')}
            <FloatPopover
              asChild
              mobileAsSheet
              type="tooltip"
              triggerElement={
                <a
                  className="mx-0.5 text-neutral-6 underline decoration-neutral-3 underline-offset-2 transition-colors hover:text-accent"
                  href={CC_DEED_URL[locale] ?? CC_DEED_URL.en}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  CC BY-NC-SA 4.0
                </a>
              }
            >
              {t('copyright_license_tooltip')}
            </FloatPopover>
            {t('copyright_license_suffix')}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end pt-2">
        <Signature />
      </div>
    </footer>
  )
}
