import type { Metadata } from 'next'
import { unstable_rethrow } from 'next/navigation'
import type { Article, BreadcrumbList, WithContext } from 'schema-dts'

import { PageColorGradient } from '~/components/common/PageColorGradient'
import type { Locale } from '~/i18n/config'
import { articleMetaOf } from '~/lib/api/article-meta'
import { getContentLocaleRedirect } from '~/lib/content-locale'
import { getOgUrl } from '~/lib/helper.server'
import { getSummaryFromMd, getWordCountFromMd } from '~/lib/markdown'
import { definePrerenderPage } from '~/lib/request.server'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'
import { buildPageMetadata } from '~/lib/seo/metadata.server'
import { NOINDEX_FOLLOW_ROBOTS } from '~/lib/seo/robots'

import type { PageParams, PostDataResult } from './api'
import { getData } from './api'
import { LdJsonWithAuthor } from './pageExtra'
import { PostDetailClient } from './PostDetailClient'

export const generateMetadata = async (props: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const params = await props.params
  try {
    const { post } = await getData(params)
    const data = post.data
    const articleTranslation = articleMetaOf(post.meta).translation
    const fallbackLocale = getContentLocaleRedirect(
      params.locale,
      articleTranslation,
    )
    const metadataLocale = fallbackLocale ?? (params.locale as Locale)
    const {
      category: { slug: categorySlug },
      meta,
    } = data
    const description = getSummaryFromMd(data.text ?? '')

    const ogImage = await getOgUrl(
      'post',
      {
        category: categorySlug,
        slug: data.slug,
      },
      metadataLocale,
      { ...data, articleTranslation },
    )

    const metadata = await buildPageMetadata({
      locale: metadataLocale,
      path: `/posts/${categorySlug}/${data.slug}`,
      title: data.title,
      description,
      og: { image: ogImage, type: 'article' },
      translations: {
        sourceLang: articleTranslation?.sourceLang,
        availableTranslations: articleTranslation?.availableTranslations,
      },
    })

    return {
      ...metadata,
      keywords: meta?.keywords,
      category: categorySlug,
      ...(fallbackLocale ? { robots: NOINDEX_FOLLOW_ROBOTS } : {}),
    } satisfies Metadata
  } catch (error) {
    unstable_rethrow(error)
    return {}
  }
}

export default definePrerenderPage<PageParams>()<PostDataResult>({
  fetcher(params) {
    return getData(params)
  },

  Component: async (props) => {
    const { data: fetchedData, params, fetchedAt } = props
    const { post } = fetchedData
    const data = post.data

    const wordCount = getWordCountFromMd(data.text ?? '', params.locale)
    const jsonLd: WithContext<Article> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: data.title,
      image: data.meta?.cover ? [data.meta.cover] : undefined,
      description: data.summary || (data.text ?? '').slice(0, 200),
      datePublished: data.createdAt,
      dateModified: data.modifiedAt || undefined,
      wordCount,
      articleSection: data.category.name,
      keywords: (data.meta?.keywords ?? data.tags ?? []) as string[],
    }

    const breadcrumbLd: WithContext<BreadcrumbList> = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: buildLocalePrefixedPath(params.locale as Locale, '/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: data.category.name,
          item: buildLocalePrefixedPath(
            params.locale as Locale,
            `/categories/${data.category.slug}`,
          ),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: data.title,
        },
      ],
    }

    return (
      <>
        <LdJsonWithAuthor baseLdJson={jsonLd} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbLd),
          }}
        />
        <PageColorGradient bleed seed={data.title + data.category.name} />
        <PostDetailClient data={post} fetchedAt={fetchedAt} />
      </>
    )
  },
})
