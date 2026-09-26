import type { SayModel } from '@mx-space/api-client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { createElement, useCallback } from 'react'

import { useModalStack } from '~/components/ui/modal'
import { hasNextPage as paginationHasNextPage } from '~/lib/api/meta'
import { apiClient } from '~/lib/request'

import { SayModalForm } from './SayModalForm'

export const sayQueryKey = ['says']

export const useSayListQuery = () =>
  useInfiniteQuery({
    queryKey: sayQueryKey,
    queryFn: async ({ pageParam }) => {
      const data = await apiClient.say.getAllPaginated(pageParam)
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      paginationHasNextPage(lastPage.pagination)
        ? lastPage.pagination.page + 1
        : undefined,
  })

export const useSayModal = () => {
  const { present } = useModalStack()
  const t = useTranslations('says')

  return useCallback(
    (editingData?: SayModel) => {
      present({
        title: editingData ? t('edit_say') : t('publish_say'),
        content: () => createElement(SayModalForm, { editingData }),
        modalClassName: 'w-[500px]',
      })
    },
    [present, t],
  )
}
