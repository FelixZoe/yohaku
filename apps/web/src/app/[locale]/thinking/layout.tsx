import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { PropsWithChildren } from 'react'

import { NormalContainer } from '~/components/layout/container/Normal'
import { DeckleFilter } from '~/components/layout/container/Paper'
import type { Locale } from '~/i18n/config'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'
import { buildPageMetadata } from '~/lib/seo/metadata.server'

export const generateMetadata = async (
  props: NextPageParams<{ locale: string }>,
): Promise<Metadata> => {
  const { locale } = await props.params
  const t = await getTranslations({
    namespace: 'common',
    locale,
  })
  const feedUrl = buildLocalePrefixedPath(locale as Locale, '/thinking/feed')
  return buildPageMetadata({
    locale: locale as Locale,
    path: '/thinking',
    title: t('page_title_thinking'),
    description: ({ siteName }) => t('page_description_thinking', { siteName }),
    types: {
      'application/rss+xml': [
        {
          url: feedUrl,
          title: `${t('page_title_thinking')} - ${t('rss_subscribe')}`,
        },
      ],
    },
  })
}
export default async function Layout(props: PropsWithChildren) {
  return (
    <NormalContainer>
      <DeckleFilter />
      {props.children}
    </NormalContainer>
  )
}
