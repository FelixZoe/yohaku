'use client'

import { useTranslations } from 'next-intl'
import type { FC, PropsWithChildren } from 'react'

import { useIsEnableSubscribe, usePresentSubscribeModal } from './hooks'

export const SubscribeTextButton: FC<PropsWithChildren> = ({ children }) => {
  const t = useTranslations('common')
  const canSubscribe = useIsEnableSubscribe()
  const { present } = usePresentSubscribeModal()

  if (!canSubscribe) {
    return null
  }

  return (
    <>
      {children}
      <span>
        <button type="button" onClick={present}>
          {t('subscribe')}
        </button>
      </span>
    </>
  )
}
