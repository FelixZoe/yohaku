import { dehydrate } from '@tanstack/react-query'
import type { Metadata } from 'next'

import { QueryHydrate } from '~/components/common/QueryHydrate'
import type { Locale } from '~/i18n/config'
import { isShallowEqualArray } from '~/lib/lodash'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'
import { definePrerenderPage, requestErrorHandler } from '~/lib/request.server'
import { buildPageMetadata } from '~/lib/seo/metadata.server'

import { Hero } from './components/Hero'
import { HomePageTimeLine } from './components/HomePageTimeLine'
import { SecondScreen } from './components/SecondScreen'
import { Windsock } from './components/Windsock'
import { getQueryKey } from './query'

export const generateMetadata = async (props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await props.params
  return buildPageMetadata({ locale: locale as Locale, path: '/' })
}

export default definePrerenderPage<{ locale: string }>()({
  async fetcher({ locale }) {
    const queryClient = getQueryClient()
    const queryKey = getQueryKey(locale)

    try {
      return await queryClient.fetchQuery({
        queryKey,
        queryFn: async () => (await apiClient.aggregate.getTop(5)).$serialized,
      })
    } catch (error) {
      return requestErrorHandler(error)
    }
  },
  async Component(props) {
    const queryClient = getQueryClient()
    const queryKey = getQueryKey(props.params.locale)

    const dehydrateState = dehydrate(queryClient, {
      shouldDehydrateQuery(query) {
        return isShallowEqualArray(query.queryKey as any, queryKey)
      },
    })

    return (
      <QueryHydrate state={dehydrateState}>
        <Hero />
        <SecondScreen />
        <HomePageTimeLine />
        <Windsock />
        {props.children}
      </QueryHydrate>
    )
  },
})
