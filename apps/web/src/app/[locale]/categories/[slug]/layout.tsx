import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { PropsWithChildren } from 'react'

import { NormalContainer } from '~/components/layout/container/Normal'
import type { Locale } from '~/i18n/config'
import { buildPageMetadata } from '~/lib/seo/metadata.server'

import { getData } from './api'

export const generateMetadata = async (
  props: NextPageParams<{
    locale: string
    slug: string
  }>,
): Promise<Metadata> => {
  const params = await props.params
  const data = await getData(params).catch(() => null)

  if (!data) {
    return {}
  }
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'post',
  })

  return buildPageMetadata({
    locale: params.locale as Locale,
    path: `/categories/${encodeURIComponent(params.slug)}`,
    title: t('category_meta_title', { name: data.name }),
  })
}

export default async function Layout(
  props: NextPageParams<
    {
      slug: string
    },
    PropsWithChildren
  >,
) {
  return <NormalContainer>{props.children}</NormalContainer>
}
