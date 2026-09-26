import { dehydrate } from '@tanstack/react-query'
import { getTranslations } from 'next-intl/server'

import { QueryHydrate } from '~/components/common/QueryHydrate'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { isShallowEqualArray } from '~/lib/lodash'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'
import { definePrerenderPage, requestErrorHandler } from '~/lib/request.server'

import { FETCH_SIZE, QUERY_KEY } from './constants'
import { List } from './list'
import { PostBox } from './post-box'

export default definePrerenderPage<{ locale: string }>()({
  async fetcher() {
    const queryClient = getQueryClient()
    try {
      // Prefetch the first page of shorthand so the list is in the SSR HTML.
      // Prevents the empty -> populated reflow that produces CLS 0.669.
      await queryClient.prefetchInfiniteQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
          const data = await apiClient.shorthand.getList({
            before: undefined,
            size: FETCH_SIZE,
          })
          return data
        },
        initialPageParam: undefined as undefined | string,
      })
    } catch (error) {
      return requestErrorHandler(error)
    }
    return null
  },
  async Component() {
    const t = await getTranslations('thinking')
    const queryClient = getQueryClient()

    const dehydrateState = dehydrate(queryClient, {
      shouldDehydrateQuery(query) {
        return isShallowEqualArray(query.queryKey as any, QUERY_KEY)
      },
    })

    return (
      <QueryHydrate state={dehydrateState}>
        <div>
          <BottomToUpSoftSpringTransitionView lcpOptimization delay={0}>
            <header>
              <h1 className="flex items-end gap-3 text-title-28 font-normal text-neutral-9">
                <span>{t('page_title')}</span>
                <a
                  aria-hidden
                  className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-2/40 text-neutral-5 transition-colors hover:text-[#EE802F]"
                  data-event="Say RSS click"
                  href="/thinking/feed"
                  rel="noreferrer"
                  target="_blank"
                >
                  <i className="i-mingcute-rss-fill text-icon-lg" />
                </a>
              </h1>
              <p className="mt-2 text-copy-15 leading-relaxed text-neutral-6">
                {t('page_subtitle')}
              </p>
            </header>
          </BottomToUpSoftSpringTransitionView>
          <main className="mt-9">
            <BottomToUpSoftSpringTransitionView lcpOptimization delay={60}>
              <PostBox />
            </BottomToUpSoftSpringTransitionView>
            <List />
          </main>
        </div>
      </QueryHydrate>
    )
  },
})
