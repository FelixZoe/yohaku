import type {
  CommentThreadItem,
  PaginateResult,
  ReaderModel,
} from '@mx-space/api-client'
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  hasNextPage as paginationHasNextPage,
  hasPrevPage as paginationHasPrevPage,
} from '~/lib/api/meta'
import { apiClient } from '~/lib/request'
import { buildCommentsListQueryKey, type CommentSort } from '~/queries/keys'

interface UseCommentsQueryOptions {
  around?: string
  sort?: CommentSort
}

type CommentThreadPage = PaginateResult<CommentThreadItem> & {
  readers: Record<string, ReaderModel>
}

export function useCommentsQuery(
  refId: string,
  options: UseCommentsQueryOptions = {},
) {
  const { sort = 'pinned', around } = options
  const key = useMemo(
    () => buildCommentsListQueryKey(refId, { sort, around }),
    [refId, sort, around],
  )

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery<
    CommentThreadPage,
    Error,
    InfiniteData<CommentThreadPage, number>,
    ReturnType<typeof buildCommentsListQueryKey>,
    number
  >({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      const data = await apiClient.comment.getByRefId(refId, {
        page: pageParam,
        sort,
        // Only attach `around` for the first page; otherwise paging forward
        // would keep snapping back to the anchor page.
        ...(pageParam === 1 && around ? { around } : {}),
      })

      return data.$serialized
    },

    meta: {
      persist: false,
    },
    getNextPageParam: (lastPage) =>
      paginationHasNextPage(lastPage.pagination)
        ? lastPage.pagination.page + 1
        : undefined,
    getPreviousPageParam: (firstPage) =>
      paginationHasPrevPage(firstPage.pagination)
        ? firstPage.pagination.page - 1
        : undefined,
    initialPageParam: 1 as number,
  })

  return {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
  }
}
