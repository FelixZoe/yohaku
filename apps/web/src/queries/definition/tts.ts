import type { AITtsModel } from '@mx-space/api-client'

import { apiClient } from '~/lib/request'

import { defineQuery } from '../helper'

export const tts = {
  byArticle: (articleId: string, lang?: string) =>
    defineQuery({
      queryKey: ['tts', articleId, lang],
      queryFn: async ({ queryKey }) => {
        const [, id, requestedLang] = queryKey as [
          string,
          string,
          string | undefined,
        ]
        const data = await apiClient.ai.getTts({
          articleId: id,
          lang: requestedLang,
        })
        return data as AITtsModel | null
      },
    }),
}
