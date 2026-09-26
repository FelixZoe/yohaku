'use client'

import type { FC } from 'react'

import {
  BannerNoticeItem,
  normalizeBannerMeta,
  type NormalizedBanner,
} from '~/components/modules/shared/BannerNoticeItem'
import {
  NoticeCard,
  type NoticeCardTone,
} from '~/components/modules/shared/NoticeCard'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

const useNoteBanner = (): NormalizedBanner | null => {
  const meta = useCurrentNoteDataSelector((n) => n?.data.meta)
  return normalizeBannerMeta(meta?.banner)
}

export const NoteRootBanner = () => {
  const banner = useNoteBanner()
  if (!banner) return null
  return (
    <div className="my-6">
      <NoteBanner {...banner} />
    </div>
  )
}

export const NoteBanner: FC<{
  message: string
  type?: NoticeCardTone
}> = (props) => (
  <NoticeCard>
    <BannerNoticeItem {...props} />
  </NoticeCard>
)
