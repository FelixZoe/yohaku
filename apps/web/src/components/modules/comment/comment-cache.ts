import type { CommentModel, ReaderModel } from '@mx-space/api-client'
import type { QueryClient } from '@tanstack/react-query'

import { buildCommentsQueryKey } from '~/queries/keys'

import type {
  CommentListSort,
  CommentThreadInfiniteData,
  CommentWithAnchor,
} from './thread'
import { insertCommentIntoThreadPages } from './thread'

export const insertCommentIntoListCache = (
  queryClient: QueryClient,
  refId: string,
  comment: CommentModel | CommentWithAnchor,
  reader?: (ReaderModel & { id?: string | null }) | null,
) => {
  const entries = queryClient.getQueriesData<CommentThreadInfiniteData>({
    queryKey: buildCommentsQueryKey(refId),
  })

  for (const [queryKey, value] of entries) {
    // the prefix also matches the non-infinite `['comments', refId, 'anchors']` query
    if (!value || !Array.isArray(value.pages)) continue

    const sortSegment = queryKey[2]
    const sort: CommentListSort =
      sortSegment === 'newest' || sortSegment === 'oldest'
        ? sortSegment
        : 'pinned'

    const next = insertCommentIntoThreadPages(
      value,
      comment as CommentWithAnchor,
      { sort, reader },
    )
    if (next !== value) {
      queryClient.setQueryData(queryKey, next)
    }
  }
}
