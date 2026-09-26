'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { LoadMoreIndicator } from '~/components/modules/shared/LoadMoreIndicator'
import { Loading } from '~/components/ui/loading'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { apiClient } from '~/lib/request'

import { FETCH_SIZE, QUERY_KEY } from './constants'
import { ThinkingItem } from './item'

export const List = () => {
  const [hasNext, setHasNext] = useState(true)

  const { data, isLoading, fetchNextPage } = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: async ({ pageParam }) => {
      const data = await apiClient.shorthand.getList({
        before: pageParam,
        size: FETCH_SIZE,
      })

      if (data.length < FETCH_SIZE) {
        setHasNext(false)
      }
      return data
    },
    enabled: hasNext,
    refetchOnMount: true,

    getNextPageParam: (l) => (l.length > 0 ? l.at(-1)?.id : undefined),
    initialPageParam: undefined as undefined | string,
  })

  if (isLoading) return <Loading useDefaultLoadingText />

  return (
    <ul className="list-none p-0">
      {data?.pages.map((page) =>
        page.map((item, i) => {
          const delay = Math.min(i, 5) * 45
          return (
            <BottomToUpSoftSpringTransitionView
              lcpOptimization
              delay={delay}
              key={item.id}
            >
              <ThinkingItem item={item} />
            </BottomToUpSoftSpringTransitionView>
          )
        }),
      )}

      {hasNext && (
        <LoadMoreIndicator
          onLoading={() => {
            fetchNextPage()
          }}
        />
      )}
    </ul>
  )
}
