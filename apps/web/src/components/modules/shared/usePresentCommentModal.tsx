'use client'

import { useTranslations } from 'next-intl'

import { useModalStack } from '~/components/ui/modal'
import { useIsClient } from '~/hooks/common/use-is-client'

import type { CommentModalProps } from './CommentModal'
import { CommentModal } from './CommentModal'

export const usePresentCommentModal = (props: CommentModalProps) => {
  const t = useTranslations('common')
  const isClient = useIsClient()
  const { present } = useModalStack()

  return {
    canPresent: isClient,
    commentLabel: t('aria_comment'),
    presentCommentModal: () => {
      present({
        title: t('comment_title'),
        content: (rest) => <CommentModal {...props} {...rest} />,
      })
    },
  }
}
