import type { CommentModel } from '@mx-space/api-client'

import { insertCommentIntoListCache } from '~/components/modules/comment/comment-cache'
import { queryClient } from '~/providers/root/react-query-provider'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'

export const commentCreateHandler: EventHandler = (data) => {
  // PG cutover renamed the comment model field `ref` -> `refId`
  const payload = data as CommentModel & { ref?: string }
  const refId = payload.refId ?? payload.ref
  if (!refId || !payload.id) return

  insertCommentIntoListCache(queryClient, refId, { ...payload, new: true })
}

export const commentHandlers = {
  [EventTypes.COMMENT_CREATE]: commentCreateHandler,
} as const
