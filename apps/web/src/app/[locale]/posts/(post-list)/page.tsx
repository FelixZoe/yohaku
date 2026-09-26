import type {
  PaginateResult,
  PostModel,
  PostResponseMeta,
} from '@mx-space/api-client'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { WiderContainer } from '~/components/layout/container/Wider'
import { HeaderHideBg } from '~/components/layout/header/hooks'
import { PostFeaturedCard } from '~/components/modules/post/PostFeaturedCard'
import {
  PostListActionAside,
  PostListMobileActions,
} from '~/components/modules/post/PostListActions'
import { PostListItem } from '~/components/modules/post/PostListItem'
import { PostPagination } from '~/components/modules/post/PostPagination'
import { PostSortBar } from '~/components/modules/post/PostSortBar'
import { NothingFound } from '~/components/modules/shared/NothingFound'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import type { Locale } from '~/i18n/config'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'
import { buildPageMetadata } from '~/lib/seo/metadata.server'
import {
  buildPaginatedCanonicalPath,
  isOutOfRangePaginationPage,
} from '~/lib/seo/pagination'

import { PostListDataRevaildate } from '../data-revalidate'

interface Props extends LocaleParams {
  filter?: string
  orderBy?: string
  page?: string
  size?: string
  sortBy?: string
}

export const dynamic = 'force-dynamic'

export const generateMetadata = async (
  props: NextPageParams<
    { locale: string },
    { searchParams: Promise<{ page?: string | string[] }> }
  >,
): Promise<Metadata> => {
  const [{ locale }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const t = await getTranslations({
    namespace: 'common',
    locale,
  })

  return buildPageMetadata({
    locale: locale as Locale,
    path: buildPaginatedCanonicalPath('/posts', searchParams.page),
    title: t('page_title_posts'),
    description: ({ siteName }) => t('page_description_posts', { siteName }),
  })
}

export default definePrerenderPage<Props>()({
  searchParamKeys: ['filter', 'orderBy', 'page', 'size', 'sortBy'],
  fetcher: async (params) => {
    const { page, size, orderBy, sortBy, filter, locale } = params || {}
    const pageNumber = page ? Number.parseInt(page) : 1
    const currentSize = size ? Number.parseInt(size) : 10

    const result = await apiClient.post.proxy.get<PaginateResult<PostModel>>({
      params: {
        page: pageNumber,
        size: currentSize,
        sortBy,
        sortOrder: orderBy === 'desc' ? -1 : 1,
        truncate: 150,
        lang: locale,
        excludeAiWritten: filter === 'no-ai' ? true : undefined,
      },
    })
    return {
      data: result.data,
      pagination: result.pagination,
      $meta: result.$meta as PostResponseMeta | undefined,
    }
  },
  Component: async (props) => {
    const { params, fetchedAt } = props
    const { data, pagination, $meta } = props.data
    const { page, sortBy, orderBy, filter, locale } = params
    const isNoAiFilterActive = filter === 'no-ai'

    const t = await getTranslations({ namespace: 'common', locale })
    const pageNumber = page ? Number.parseInt(page) : 1

    if (isOutOfRangePaginationPage(page, data?.length ?? 0)) {
      notFound()
    }

    if (!data?.length && !isNoAiFilterActive) {
      return <NothingFound />
    }

    const isFirstPage = pageNumber === 1
    let featuredPost = null
    let listItems = data ?? []

    if (isFirstPage) {
      const pinnedIndex = listItems.findIndex((item) => Boolean(item.pinAt))
      if (pinnedIndex !== -1) {
        featuredPost = listItems[pinnedIndex]
        listItems = listItems.filter((_, i) => i !== pinnedIndex)
      }
    }

    const sortParams = new URLSearchParams()
    if (sortBy) sortParams.set('sortBy', sortBy)
    if (orderBy) sortParams.set('orderBy', orderBy)
    if (isNoAiFilterActive) sortParams.set('filter', 'no-ai')

    let animIndex = 0

    return (
      <WiderContainer>
        <HeaderHideBg />
        <PostListDataRevaildate fetchedAt={fetchedAt} />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-16">
          <div className="min-w-0">
            <BottomToUpSoftSpringTransitionView
              lcpOptimization
              delay={animIndex++ * 60}
            >
              <div className="text-label-12 uppercase tracking-[4px] text-neutral-5">
                Blog
              </div>
              <h1 className="mt-2.5 text-title-28 font-normal text-neutral-9">
                {t('posts_heading')}
              </h1>
            </BottomToUpSoftSpringTransitionView>

            {featuredPost && (
              <BottomToUpSoftSpringTransitionView
                lcpOptimization
                delay={animIndex++ * 60}
              >
                <PostFeaturedCard data={featuredPost} meta={$meta} />
              </BottomToUpSoftSpringTransitionView>
            )}

            <BottomToUpSoftSpringTransitionView
              lcpOptimization
              delay={animIndex++ * 60}
            >
              <Suspense
                fallback={
                  <div
                    aria-hidden
                    className="mt-5 h-[1.25rem] border-b border-black/[0.06] pb-3 dark:border-white/[0.06]"
                  />
                }
              >
                <PostSortBar totalCount={pagination.total} />
              </Suspense>
              <PostListMobileActions />
            </BottomToUpSoftSpringTransitionView>

            <div data-fetch-at={fetchedAt}>
              {listItems.map((item) => (
                <BottomToUpSoftSpringTransitionView
                  lcpOptimization
                  delay={animIndex++ * 60}
                  key={item.id}
                >
                  <PostListItem data={item} meta={$meta} />
                </BottomToUpSoftSpringTransitionView>
              ))}
            </div>

            {listItems.length === 0 && <NothingFound />}

            {listItems.length > 0 && (
              <BottomToUpSoftSpringTransitionView
                lcpOptimization
                delay={animIndex++ * 60}
              >
                <PostPagination
                  pagination={pagination}
                  sortParams={sortParams.toString()}
                />
              </BottomToUpSoftSpringTransitionView>
            )}
          </div>

          <BottomToUpSoftSpringTransitionView
            lcpOptimization
            className="h-full"
            delay={120}
          >
            <PostListActionAside />
          </BottomToUpSoftSpringTransitionView>
        </div>
      </WiderContainer>
    )
  },
})
