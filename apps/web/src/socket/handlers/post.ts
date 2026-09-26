import type {
  PostEntitlementReason,
  PostModel,
  PostResponseMeta,
} from '@mx-space/api-client'
import * as React from 'react'

import { entitlementReasonOf } from '~/components/modules/membership/should-unlock-paywall'
import { narrowMetaForItem } from '~/lib/api/article-meta'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { toast } from '~/lib/toast'
import {
  getGlobalCurrentPostData,
  setGlobalCurrentPostData,
} from '~/providers/post/CurrentPostDataProvider'
import { queryClient } from '~/providers/root/react-query-provider'
import type { PostWithTranslation } from '~/queries/definition'
import { queries } from '~/queries/definition'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import { trackerRealtimeEvent, updateMessage } from './types'
import {
  createUpdateHandler,
  hasContentChanged,
  scheduleTocRefresh,
} from './util-update'

export const postCreateHandler: EventHandler = (data) => {
  const { title, category, slug } = data as PostModel
  const open = () => {
    window.peek(`/posts/${category.slug}/${slug}`)
  }
  toast.success(`新篇已立：「${title}」`, {
    onClick: open,
    action: {
      label: '查看',
      onClick: open,
    },
    iconElement: React.createElement('i', {
      className: 'i-mingcute-news-line',
    }),
  })

  trackerRealtimeEvent()
}

const applyPostUpdate = createUpdateHandler<PostModel>({
  getCurrent: () => {
    const current = getGlobalCurrentPostData()
    if (!current) return null
    return { data: current.data, meta: current.meta }
  },
  sanitize: (post) => {
    const nextPost = { ...post }
    Reflect.deleteProperty(nextPost, 'category')
    return nextPost
  },
  applyData: (post) => {
    setGlobalCurrentPostData((draft) => {
      Object.assign(draft.data, post)
    })
  },
  refetchTranslated: async (current, targetLang) => {
    const fresh = await apiClient.post.getPost(
      current.category.slug,
      current.slug,
      {
        lang: targetLang,
        prefer: 'lexical',
      },
    )
    setGlobalCurrentPostData((draft) => {
      draft.data = fresh
      draft.meta = narrowMetaForItem(
        fresh.$meta as PostResponseMeta | undefined,
        fresh,
      )
    })
  },
})

const ENTITLED_REASONS = new Set<PostEntitlementReason>([
  'owner',
  'purchase',
  'membership',
  'free-window',
])

const isEntitledReason = (reason: PostEntitlementReason | undefined) =>
  !!reason && ENTITLED_REASONS.has(reason)

export const postUpdateHandler: EventHandler = (data, ctx) => {
  const current = getGlobalCurrentPostData()
  const reason = entitlementReasonOf(current?.meta?.paywall)
  if (
    !current ||
    current.data.id !== (data as PostModel).id ||
    !isEntitledReason(reason)
  ) {
    applyPostUpdate(data, ctx)
    return
  }
  queryClient
    .fetchQuery({
      ...queries.post.bySlug(
        current.data.category.slug,
        current.data.slug,
        document.documentElement.lang,
      ),
      staleTime: 0,
    })
    .then((fresh) => {
      const next = fresh as PostWithTranslation
      setGlobalCurrentPostData((draft) => {
        draft.data = next.data
        draft.meta = next.meta
      })
      toast.info(updateMessage)
      trackerRealtimeEvent()
      scheduleTocRefresh(hasContentChanged(current.data, next.data))
    })
    .catch(() => {})
}

export const postDeleteHandler: EventHandler = (data, { router }) => {
  const post = data as PostModel
  if (
    location.pathname ===
      routeBuilder(Routes.Post, {
        category: post.category.slug,
        slug: post.slug,
      }) &&
    getGlobalCurrentPostData()?.data.id === post.id
  ) {
    router.replace(routeBuilder(Routes.PageDeletd, {}))
    toast.error('此文已删。')
    trackerRealtimeEvent()
  }
}

export const postHandlers = {
  [EventTypes.POST_CREATE]: postCreateHandler,
  [EventTypes.POST_REPUBLISH]: postCreateHandler,
  [EventTypes.POST_UPDATE]: postUpdateHandler,
  [EventTypes.POST_DELETE]: postDeleteHandler,
  [EventTypes.POST_UNPUBLISH]: postDeleteHandler,
} as const
