import type {
  PostModel,
  PostResponseMeta,
  SkillBundleView,
} from '@mx-space/api-client'

import { narrowMetaForItem } from '~/lib/api/article-meta'
import { apiClient } from '~/lib/request'

import { defineQuery } from '../helper'

export type { SkillBundleView }

export type PostPayloadWithMeta = {
  data: PostModel
  meta?: PostResponseMeta
}

export type PostWithTranslation = PostPayloadWithMeta

export const post = {
  bySlug: (category: string, slug: string, lang?: string) =>
    defineQuery({
      queryKey: ['post', category, slug, lang],

      queryFn: async ({ queryKey }) => {
        const [, category, slug, lang] = queryKey as [
          string,
          string,
          string,
          string | undefined,
        ]

        const data = await apiClient.post.getPost(category, slug, {
          lang: lang || undefined,
          prefer: 'lexical',
        })

        return {
          data,
          meta: narrowMetaForItem(
            data.$meta as PostResponseMeta | undefined,
            data,
          ),
        }
      },
    }),
}
