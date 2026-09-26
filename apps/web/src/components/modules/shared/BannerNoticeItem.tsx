'use client'

import type { FC } from 'react'

import { NoticeCardItem, type NoticeCardTone } from './NoticeCard'

const toneIcon: Record<NoticeCardTone, string> = {
  info: 'i-mingcute-information-line',
  success: 'i-mingcute-check-circle-line',
  warning: 'i-mingcute-alert-line',
  error: 'i-mingcute-close-circle-line',
  secondary: 'i-mingcute-quote-left-line',
}

export interface NormalizedBanner {
  message: string
  type: NoticeCardTone
}

export const normalizeBannerMeta = (
  banner: unknown,
): NormalizedBanner | null => {
  if (!banner) return null
  if (typeof banner === 'string') {
    return { type: 'info', message: banner }
  }
  if (typeof banner === 'object' && 'message' in banner) {
    const b = banner as { type?: NoticeCardTone; message: string }
    return { type: b.type ?? 'info', message: b.message }
  }
  return null
}

export const BannerNoticeItem: FC<{
  message: string
  type?: NoticeCardTone
}> = ({ message, type = 'info' }) => (
  <NoticeCardItem icon={toneIcon[type]} title={message} tone={type} />
)
