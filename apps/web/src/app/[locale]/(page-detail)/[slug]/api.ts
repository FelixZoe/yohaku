import type { BaseResponseMeta, PageModel } from '@mx-space/api-client'
import { cache } from 'react'

import { narrowMetaForItem } from '~/lib/api/article-meta'
import { attachServerFetch, runWithLang } from '~/lib/attach-fetch'
import { apiClient } from '~/lib/request'
import { requestErrorHandler } from '~/lib/request.server'

export interface PageParams extends LocaleParams {
  slug: string
}

export interface PageDataResult {
  data: PageModel
  meta?: BaseResponseMeta
}

export const getData = cache(
  async (slug: string, locale?: string): Promise<PageDataResult> => {
    await attachServerFetch()
    const fetchData = () =>
      apiClient.page
        .getBySlug(slug, { prefer: 'lexical' })
        .catch(requestErrorHandler)

    const response = locale
      ? await runWithLang(locale, fetchData)
      : await fetchData()
    const data = response.$serialized

    return {
      data,
      meta: narrowMetaForItem(
        response.$meta as BaseResponseMeta | undefined,
        data,
      ),
    }
  },
)
