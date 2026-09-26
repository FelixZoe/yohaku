import { attachServerFetch } from '~/lib/attach-fetch'
import { getQueryClient } from '~/lib/query-client.server'
import { requestErrorHandler } from '~/lib/request.server'
import type { PostWithTranslation } from '~/queries/definition'
import { queries } from '~/queries/definition'

export interface PageParams extends LocaleParams {
  category: string
  slug: string
}

export type { PostWithTranslation }

export interface PostDataResult {
  post: PostWithTranslation
}

const getPostData = async (
  params: Pick<PageParams, 'category' | 'slug'>,
  lang?: string,
) => {
  const { category, slug } = params
  await attachServerFetch()
  const data = await getQueryClient()
    .fetchQuery(queries.post.bySlug(category, slug, lang))
    .catch(requestErrorHandler)
  return data as PostWithTranslation
}

export const getData = async (params: PageParams): Promise<PostDataResult> => {
  const post = await getPostData(params, params.locale)
  return { post }
}
