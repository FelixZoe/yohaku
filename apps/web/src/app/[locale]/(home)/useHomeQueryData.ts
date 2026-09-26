'use client'

import type { AggregateTop } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

import { getQueryKey } from './query'

export const useHomeQueryData = () => {
  const { locale } = useParams<{ locale: string }>()

  return useQuery({
    queryKey: getQueryKey(locale),
    queryFn: async () => null! as AggregateTop,
    enabled: false,
  }).data!
}
