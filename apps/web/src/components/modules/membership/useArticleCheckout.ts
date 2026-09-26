'use client'

import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { apiClient } from '~/lib/request'

import { currentReturnPath } from './checkout-helpers'

export const useArticleCheckout = (postId: string | undefined) => {
  const t = useTranslations('membership')
  return useMutation({
    mutationFn: () =>
      apiClient.membership.articleCheckout(postId!, currentReturnPath()),
    onSuccess: (res) => {
      window.location.href = res.checkoutUrl
    },
    onError: () => toast.error(t('checkout_failed')),
  })
}
