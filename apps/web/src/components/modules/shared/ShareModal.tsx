'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { FC, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { IcBaselineTelegram } from '~/components/icons/platform/Telegram'
import { TwitterIcon } from '~/components/icons/platform/Twitter'
import { SlotText } from '~/components/ui/slot-text'
import { toast } from '~/lib/toast'
import { getAggregationData } from '~/providers/root/aggregation-data-provider'

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((module) => module.QRCodeSVG),
  { ssr: false },
)

interface ShareData {
  text: string
  title: string
  url: string
}

interface ShareItem {
  icon: ReactNode
  isCopy?: boolean
  name: string
  onClick: (data: ShareData) => void
}

export const ShareModal: FC<ShareData> = ({ url, text, title }) => {
  const t = useTranslations('common')
  const [justCopied, setJustCopied] = useState(false)

  const shareList: ShareItem[] = useMemo(
    () => [
      {
        name: 'Twitter',
        icon: <TwitterIcon />,
        onClick: (data: ShareData) => {
          window.open(
            `https://twitter.com/intent/tweet?url=${data.url}&text=${
              data.text
            }&via=${getAggregationData()?.seo.title}`,
          )
        },
      },
      {
        name: 'Telegram',
        icon: <IcBaselineTelegram className="text-[#2AABEE]" />,
        onClick: (data: ShareData) => {
          window.open(
            `https://telegram.me/share/url?url=${data.url}&text=${data.text}`,
          )
        },
      },
      {
        name: t('copy_link'),
        icon: <i className="i-mingcute-copy-fill" />,
        isCopy: true,
        onClick: (data: ShareData) => {
          navigator.clipboard.writeText(data.url)
          setJustCopied(true)
          window.setTimeout(() => setJustCopied(false), 1500)
          toast.success(t('copied'))
        },
      },
    ],
    [t],
  )

  return (
    <div className="relative grid grid-cols-[200px_auto] gap-5">
      <div className="inline-block size-[200px] bg-neutral-3/80">
        <QRCodeSVG
          className="aspect-square w-[200px]"
          height={200}
          value={url}
          width={200}
        />
      </div>
      <div className="flex flex-col gap-2">
        {t('share_to')}
        <ul className="w-[200px] flex-col gap-2 [&>li]:flex [&>li]:items-center [&>li]:space-x-2">
          {shareList.map(({ name, icon, isCopy, onClick }) => (
            <li
              aria-label={`Share to ${name}`}
              className="flex cursor-pointer items-center space-x-2 rounded-md px-3 py-2 text-copy-16 transition-colors hover:bg-neutral-2"
              key={name}
              role="button"
              onClick={() => onClick({ url, text, title })}
            >
              {icon}
              {isCopy ? (
                <SlotText text={justCopied ? t('copied') : name} />
              ) : (
                <span>{name}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
