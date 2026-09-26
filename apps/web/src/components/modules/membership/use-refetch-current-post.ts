'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useCallback } from 'react'

import {
  useCurrentPostDataSelector,
  useSetCurrentPostData,
} from '~/providers/post/CurrentPostDataProvider'
import type { PostWithTranslation } from '~/queries/definition'
import { queries } from '~/queries/definition'

export const useRefetchCurrentPost = () => {
  const category = useCurrentPostDataSelector((post) => post?.category?.slug)
  const slug = useCurrentPostDataSelector((post) => post?.slug)
  const setPostData = useSetCurrentPostData()
  const queryClient = useQueryClient()
  const locale = useLocale()

  const refetch = useCallback(() => {
    if (!category || !slug) return Promise.resolve(false)
    return queryClient
      .fetchQuery({
        ...queries.post.bySlug(category, slug, locale),
        staleTime: 0,
      })
      .then((data) => {
        setPostData(data as PostWithTranslation)
        return true
      })
  }, [category, slug, locale, queryClient, setPostData])

  return { refetch, ready: !!category && !!slug }
}
