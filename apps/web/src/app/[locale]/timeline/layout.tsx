import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { PropsWithChildren } from 'react'

import type { Locale } from '~/i18n/config'
import { buildPageMetadata } from '~/lib/seo/metadata.server'

export const generateMetadata = async (
  props: NextPageParams<{ locale: string }>,
): Promise<Metadata> => {
  const { locale } = await props.params
  const t = await getTranslations({
    namespace: 'common',
    locale,
  })
  return buildPageMetadata({
    locale: locale as Locale,
    path: '/timeline',
    title: t('page_title_timeline'),
    description: ({ siteName }) => t('page_description_timeline', { siteName }),
  })
}

export default function TimelineLayout({ children }: PropsWithChildren) {
  return children
}
