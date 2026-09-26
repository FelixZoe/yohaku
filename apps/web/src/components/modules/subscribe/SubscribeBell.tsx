'use client'

import type { SubscribeTypeToBitMap } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { MotionButtonBase } from '~/components/ui/button'

import { useIsEnableSubscribe, usePresentSubscribeModal } from './hooks'

type SubscribeType = keyof typeof SubscribeTypeToBitMap
interface SubscribeBellProps {
  defaultType: SubscribeType[] | SubscribeType
}
export const SubscribeBell: FC<SubscribeBellProps> = (props) => {
  const { defaultType } = props
  const t = useTranslations('subscribe')
  const canSubscribe = useIsEnableSubscribe()
  const { present } = usePresentSubscribeModal(
    ([] as SubscribeType[]).concat(defaultType),
  )

  if (!canSubscribe) {
    return null
  }

  return (
    <div
      data-hide-print
      className="mb-6 flex flex-col items-center justify-center p-4"
    >
      <p className="leading-8 text-white opacity-80">{t('bell_intro')}</p>
      <MotionButtonBase onClick={present}>
        <span className="sr-only">{t('submit')}</span>
        <i className="i-material-symbols-notifications-active-outline mt-4 scale-150 text-title-28 text-accent opacity-50 transition-opacity hover:opacity-100" />
      </MotionButtonBase>
    </div>
  )
}
