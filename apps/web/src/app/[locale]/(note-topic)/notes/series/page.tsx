import { getTranslations } from 'next-intl/server'

import { TimelineList } from '~/components/ui/list/TimelineList'
import { TimelineListItem } from '~/components/ui/list/TimelineListItem'
import { TimelineSpineLayout } from '~/components/ui/list/TimelineSpineLayout'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'
import { routeBuilder, Routes } from '~/lib/route-builder'

export default definePrerenderPage()({
  fetcher: async () => await apiClient.topic.getAll(),
  Component: async ({ data }) => {
    const t = await getTranslations('common')

    return (
      <BottomToUpSoftScaleTransitionView>
        <TimelineSpineLayout title={t('page_title_topics')}>
          <TimelineList>
            {data.map((item) => (
              <TimelineListItem
                date={new Date(item.createdAt)}
                key={item.id}
                label={item.name}
                href={routeBuilder(Routes.NoteTopic, {
                  slug: item.slug,
                })}
              />
            ))}
          </TimelineList>
        </TimelineSpineLayout>
      </BottomToUpSoftScaleTransitionView>
    )
  },
})
