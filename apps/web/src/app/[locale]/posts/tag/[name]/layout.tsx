import type { Metadata } from 'next'
import type { PropsWithChildren } from 'react'

import { NormalContainer } from '~/components/layout/container/Normal'
import type { Locale } from '~/i18n/config'
import { buildPageMetadata } from '~/lib/seo/metadata.server'

export const generateMetadata = async (
  props: NextPageParams<{
    locale: string
    name: string
  }>,
): Promise<Metadata> => {
  const { locale, name } = await props.params
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/posts/tag/${encodeURIComponent(name)}`,
    title: `#${name}`,
  })
}

export default async function Layout(
  props: NextPageParams<
    {
      name: string
    },
    PropsWithChildren
  >,
) {
  return <NormalContainer>{props.children}</NormalContainer>
}
