'use client'

import type { ArticleTranslation } from '@mx-space/api-client'
import { useLocale, useTranslations } from 'next-intl'
import { Children, type FC, type ReactNode, useCallback, useState } from 'react'

import { TranslatedBadge } from '~/components/modules/translation/TranslatedBadge'
import { locales } from '~/i18n/config'
import { usePathname, useRouter } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import { aiNoticeTrail } from './notice-card-ai-fold'

const itemStackClass =
  '[&>div:not(:empty)~div:not(:empty)]:border-t [&>div:not(:empty)~div:not(:empty)]:border-black/[0.03] dark:[&>div:not(:empty)~div:not(:empty)]:border-white/[0.03]'

interface NoticeCardProps {
  children: ReactNode
  className?: string
}

export const NoticeCard: FC<NoticeCardProps> = ({ children, className }) => {
  const validChildren = Children.toArray(children).filter(Boolean)
  if (validChildren.length === 0) return null

  return (
    <div
      className={clsxm(
        'relative overflow-hidden rounded border border-black/[0.03]',
        'bg-gradient-to-br from-accent/[0.04] via-[rgba(255,228,180,0.06)] to-accent/[0.02]',
        'dark:from-accent/[0.06] dark:via-[rgba(255,228,180,0.04)] dark:to-accent/[0.03]',
        'dark:border-white/5',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-5 -top-5 size-[120px] dark:opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(255,228,180,0.12), transparent 70%)',
        }}
      />
      <div className={clsxm('relative', itemStackClass)}>
        {validChildren.map((child, index) => (
          <div key={index}>{child}</div>
        ))}
      </div>
    </div>
  )
}

export type NoticeCardTone =
  'info' | 'success' | 'warning' | 'error' | 'secondary'

interface NoticeCardItemProps {
  action?: ReactNode
  children?: ReactNode
  icon?: string
  title?: ReactNode
  tone?: NoticeCardTone
}

const toneTintBg: Record<NoticeCardTone, string> = {
  info: 'bg-info/[0.04]',
  success: 'bg-success/[0.04]',
  warning: 'bg-warning/[0.05]',
  error: 'bg-error/[0.05]',
  secondary: 'bg-neutral-6/[0.04]',
}

const toneIconColor: Record<NoticeCardTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  secondary: 'text-neutral-6',
}

const NoticeCardItemHeader: FC<{
  icon?: string
  title?: ReactNode
  tone?: NoticeCardTone
  action?: ReactNode
}> = ({ icon, title, tone, action }) => {
  if (!icon && !title && !action) return null
  const textClass = tone ? 'text-neutral-7' : 'text-neutral-6'
  const iconColor = tone ? toneIconColor[tone] : 'text-accent/80'
  return (
    <div
      className={clsxm(
        'flex items-center justify-between gap-2 text-label-12',
        textClass,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {icon && (
          <i className={clsxm(icon, 'text-copy-16 flex-none', iconColor)} />
        )}
        {title && <span className="truncate">{title}</span>}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  )
}

export const NoticeCardAiFold: FC<{
  chips: string[]
  children: ReactNode
}> = ({ chips, children }) => {
  const t = useTranslations('common')
  const [open, setOpen] = useState(false)
  const trail = aiNoticeTrail(chips)

  return (
    <div>
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-[18px] py-3.5 text-label-12 text-neutral-6 lg:hidden"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <i className="i-mingcute-sparkles-line text-copy-16 flex-none text-accent/80" />
          <span>{t('ai_section')}</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          {trail ? (
            <span
              className={clsxm(
                'min-w-0 truncate text-neutral-6 transition-opacity duration-200 motion-reduce:transition-none',
                open && 'opacity-0',
              )}
            >
              {trail}
            </span>
          ) : null}
          <i
            className={clsxm(
              'i-mingcute-down-line shrink-0 text-copy-13 text-neutral-5 transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>
      <div
        className={clsxm(
          '[interpolate-size:allow-keywords] overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none',
          'max-lg:h-0 lg:h-auto',
          open &&
            'max-lg:h-auto max-lg:border-t max-lg:border-black/[0.03] dark:max-lg:border-white/[0.03]',
        )}
      >
        <div className={itemStackClass}>{children}</div>
      </div>
    </div>
  )
}

export const NoticeCardItem: FC<NoticeCardItemProps> = ({
  children,
  tone,
  icon,
  title,
  action,
}) => {
  const hasHeader = !!(icon || title || action)
  const header = (
    <NoticeCardItemHeader
      action={action}
      icon={icon}
      title={title}
      tone={tone}
    />
  )
  const body = !children ? null : hasHeader ? (
    <div className="mt-1.5">{children}</div>
  ) : (
    children
  )

  return (
    <div className={clsxm('px-[18px] py-3.5', tone && toneTintBg[tone])}>
      {header}
      {body}
    </div>
  )
}

const isSupportedLocale = (code?: string | null): code is string =>
  !!code && (locales as readonly string[]).includes(code)

export const TranslationNoticeContent: FC<{
  articleTranslation: ArticleTranslation
}> = ({ articleTranslation }) => {
  const t = useTranslations('translation')
  const router = useRouter()
  const pathname = usePathname()
  const appLocale = useLocale()

  const sourceLang = articleTranslation.sourceLang
  const canSwitchToOriginal =
    isSupportedLocale(sourceLang) && sourceLang !== appLocale

  const handleViewOriginal = useCallback(() => {
    if (!canSwitchToOriginal) return
    router.push(pathname, { locale: sourceLang as (typeof locales)[number] })
  }, [canSwitchToOriginal, pathname, router, sourceLang])

  return (
    <div className="flex items-center justify-between gap-2 text-label-12 text-neutral-7">
      <div className="flex min-w-0 items-center gap-2">
        <span className="opacity-60">
          <i className="i-mingcute-globe-line text-copy-14" />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">
          {t('banner_title')}
        </span>
        <TranslatedBadge articleTranslation={articleTranslation} />
      </div>
      {canSwitchToOriginal && (
        <button
          className="shrink-0 whitespace-nowrap text-accent underline underline-offset-2"
          onClick={handleViewOriginal}
        >
          {t('banner_viewOriginal')}
        </button>
      )}
    </div>
  )
}
