'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { normalizeBannerMeta } from '~/components/modules/shared/BannerNoticeItem'
import type { NoticeCardTone } from '~/components/modules/shared/NoticeCard'
import { clsxm } from '~/lib/helper'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

type CaptionTone = NoticeCardTone

const toneLabelClass: Record<CaptionTone, string> = {
  info: 'text-info/85',
  success: 'text-success/85',
  warning: 'text-warning/85',
  error: 'text-error/85',
  secondary: 'text-neutral-6',
}

const toneSeparatorClass: Record<CaptionTone, string> = {
  info: 'text-info/45',
  success: 'text-success/45',
  warning: 'text-warning/45',
  error: 'text-error/45',
  secondary: 'text-neutral-5',
}

interface NoteCaptionProps {
  className?: string
  label: string
  message: string
  tone?: CaptionTone
}

export const NoteCaption: FC<NoteCaptionProps> = ({
  label,
  message,
  tone = 'warning',
  className,
}) => (
  <p
    data-hide-print
    className={clsxm(
      'mt-4 font-serif text-copy-14 leading-[1.75] text-neutral-7',
      className,
    )}
  >
    <span
      className={clsxm(
        'mr-1.5 font-medium italic tracking-[0.4px] [font-variant:small-caps]',
        toneLabelClass[tone],
      )}
    >
      {label}
    </span>
    <span aria-hidden className={clsxm('mr-1.5', toneSeparatorClass[tone])}>
      ·
    </span>
    <span className="italic">{message}</span>
  </p>
)

const useBannerLabel = (tone: CaptionTone): string => {
  const t = useTranslations('note')
  switch (tone) {
    case 'info': {
      return t('caption_label_info')
    }
    case 'success': {
      return t('caption_label_success')
    }
    case 'warning': {
      return t('caption_label_warning')
    }
    case 'error': {
      return t('caption_label_error')
    }
    case 'secondary': {
      return t('caption_label_secondary')
    }
  }
}

export const NoteBannerCaption: FC = () => {
  const meta = useCurrentNoteDataSelector((n) => n?.data.meta)
  const banner = normalizeBannerMeta(meta?.banner)
  const label = useBannerLabel(banner?.type ?? 'info')

  if (!banner) return null

  return (
    <NoteCaption label={label} message={banner.message} tone={banner.type} />
  )
}

export const NotePrivateCaption: FC<{ message: string }> = ({ message }) => {
  const t = useTranslations('note')
  return (
    <NoteCaption
      label={t('caption_label_private')}
      message={message}
      tone="warning"
    />
  )
}
