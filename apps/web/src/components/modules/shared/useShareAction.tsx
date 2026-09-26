'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { useIsClient } from '~/hooks/common/use-is-client'

import { useModalStack } from '../../ui/modal'
import { ShareModal } from './ShareModal'

interface ShareableModel {
  text?: string | null
  title: string
}

export const useShareAction = <T extends ShareableModel>({
  buildUrl,
  getModel,
}: {
  buildUrl: (model: T) => string
  getModel: () => T | null | undefined
}) => {
  const t = useTranslations('common')
  const isClient = useIsClient()
  const { present } = useModalStack()

  const handleShare = useCallback(() => {
    const model = getModel()

    if (!model) return

    const hasShare = 'share' in navigator
    const title = t('share_treasure')
    const url = buildUrl(model)
    const text = t('share_message', { title: model.title })

    if (hasShare)
      navigator.share({
        title: model.title,
        text: model.text ?? undefined,
        url,
      })
    else {
      present({
        title: t('share_content'),
        clickOutsideToDismiss: true,
        content: () => <ShareModal text={text} title={title} url={url} />,
      })
    }
  }, [buildUrl, getModel, present, t])

  return { canShare: isClient, handleShare }
}
