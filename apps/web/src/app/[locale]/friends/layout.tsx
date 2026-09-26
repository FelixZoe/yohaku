import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { PropsWithChildren } from 'react'

import { NormalContainer } from '~/components/layout/container/Normal'
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
    path: '/friends',
    title: t('page_title_friends'),
    description: ({ siteName }) => t('page_description_friends', { siteName }),
  })
}
export default async function (props: PropsWithChildren) {
  return <NormalContainer>{props.children}</NormalContainer>
}
