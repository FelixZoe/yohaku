import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { PropsWithChildren } from 'react'

import { WiderContainer } from '~/components/layout/container/Wider'
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
  const feedUrl = buildLocalePrefixedPath(locale as Locale, '/says/feed')
  return buildPageMetadata({
    locale: locale as Locale,
    path: '/says',
    title: t('page_title_says'),
    description: ({ siteName }) => t('page_description_says', { siteName }),
    types: {
      'application/rss+xml': [
        {
          url: feedUrl,
          title: `${t('page_title_says')} - ${t('rss_subscribe')}`,
        },
      ],
    },
  })
}
export default async function Layout(props: PropsWithChildren) {
  return <WiderContainer>{props.children}</WiderContainer>
}
