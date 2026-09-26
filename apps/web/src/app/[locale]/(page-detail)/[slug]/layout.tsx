import type { Metadata } from 'next'
import { permanentRedirect, unstable_rethrow } from 'next/navigation'

import { PageColorGradient } from '~/components/common/PageColorGradient'
import type { Locale } from '~/i18n/config'
import { articleMetaOf } from '~/lib/api/article-meta'
import {
  getContentLocaleRedirect,
  getContentRedirectPath,
} from '~/lib/content-locale'
import { getOgUrl } from '~/lib/helper.server'
import { getSummaryFromMd } from '~/lib/markdown'
import { definePrerenderPage } from '~/lib/request.server'
import { buildPageMetadata } from '~/lib/seo/metadata.server'
import { NOINDEX_FOLLOW_ROBOTS } from '~/lib/seo/robots'

import type { PageParams } from './api'
import { getData } from './api'
import { PageDetailShell } from './PageDetailShell'

export const generateMetadata = async (props: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const params = await props.params
  const { slug } = params
  try {
    const page = await getData(slug, params.locale)
    const { data } = page
    const articleTranslation = articleMetaOf(page.meta).translation
    const fallbackLocale = getContentLocaleRedirect(
      params.locale,
      articleTranslation,
    )
    const metadataLocale = fallbackLocale ?? (params.locale as Locale)

    const { title, text } = data
    const description = getSummaryFromMd(text ?? '')

    const ogImage = await getOgUrl(
      'page',
      {
        slug: data.slug,
      },
      metadataLocale,
      { ...data, articleTranslation },
    )

    const metadata = await buildPageMetadata({
      locale: metadataLocale,
      path: `/${data.slug}`,
      title,
      description,
      og: { image: ogImage, type: 'article' },
      translations: {
        sourceLang: articleTranslation?.sourceLang,
        availableTranslations: articleTranslation?.availableTranslations,
      },
    })

    return fallbackLocale
      ? {
          ...metadata,
          robots: NOINDEX_FOLLOW_ROBOTS,
        }
      : metadata
  } catch (error) {
    unstable_rethrow(error)
    return {}
  }
}

export default definePrerenderPage<PageParams>()({
  fetcher(params) {
    return getData(params.slug, params.locale)
  },

  Component: ({ data: page, children, params }) => {
    const { data } = page
    const translation = articleMetaOf(page.meta).translation
    const contentLang = translation?.isTranslated
      ? translation.targetLang
      : translation?.sourceLang

    const canonicalPath = `/${data.slug}`
    const requestedPath = `/${params.slug}`
    const redirectPath = getContentRedirectPath({
      requestedLocale: params.locale,
      requestedPath,
      canonicalPath,
    })

    if (redirectPath) {
      permanentRedirect(redirectPath)
    }

    return (
      <>
        <PageColorGradient bleed seed={data.title + data.subtitle} />
        <PageDetailShell
          contentLang={contentLang}
          data={data}
          enrichments={data.enrichments}
        >
          {children}
        </PageDetailShell>
      </>
    )
  },
})
