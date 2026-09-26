export type CommentSort = 'pinned' | 'newest' | 'oldest'

export const buildCommentsQueryKey = (refId: string) =>
  ['comments', refId] as const

export const buildCommentsListQueryKey = (
  refId: string,
  options?: { sort?: CommentSort; around?: string },
) =>
  [
    'comments',
    refId,
    options?.sort ?? 'pinned',
    options?.around ?? null,
  ] as const
