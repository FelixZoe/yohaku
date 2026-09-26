'use client'

import { useLocale } from 'next-intl'
import { useEffect } from 'react'
import type { Blog, ItemList, ListItem, Person, WithContext } from 'schema-dts'

import type { Locale } from '~/i18n/config'
import { buildNotePath } from '~/lib/note-route'
import { registerPushWorker } from '~/lib/push-worker'
import { buildLocalePrefixedPath, HREFLANG_BY_LOCALE } from '~/lib/seo/hreflang'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { useHomeQueryData } from './useHomeQueryData'

export default function Home() {
  useEffect(() => {
    registerPushWorker()
  }, [])
  const locale = useLocale() as Locale
  const config = useAggregationSelector((state) => ({
    user: state.user,
    seo: state.seo,
    url: state.url,
  }))
  const socialIds = config?.user.socialIds
  const localizedHomeUrl = config?.url.webUrl
    ? new URL(
        buildLocalePrefixedPath(locale, '/'),
        config.url.webUrl,
      ).toString()
    : undefined
  const sameAs = [
    socialIds?.github && `https://github.com/${socialIds.github}`,
    (socialIds?.twitter || socialIds?.x) &&
      `https://x.com/${socialIds.twitter || socialIds.x}`,
  ].filter((url): url is string => Boolean(url))
  const authorPerson: Person = {
    '@type': 'Person',
    name: config?.user.name,
    url: localizedHomeUrl,
    sameAs,
  }
  const ldJson: WithContext<Blog> = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: config?.seo.title,
    url: localizedHomeUrl,
    description: config?.seo.description,
    author: authorPerson,
    publisher: authorPerson,
    image: {
      '@type': 'ImageObject',
      url: `${config?.url.webUrl}/home-og?lang=${locale}`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': localizedHomeUrl,
    },
    inLanguage: HREFLANG_BY_LOCALE[locale],
    keywords: config?.seo.keywords,
  }
  const { notes, posts } = useHomeQueryData()
  const listLdJson: WithContext<ItemList> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [...notes, ...posts]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((article, index) => {
        const articlePath =
          'nid' in article
            ? buildNotePath(article)
            : `/posts/${article.category.slug}/${article.slug}`

        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'BlogPosting',
            author: {
              '@type': 'Person',
              name: config?.user.name,
              url: config?.url.webUrl,
            },
            headline: article.title,
            image: article.meta?.cover || [],
            name: article.title,
            url: config?.url.webUrl
              ? new URL(
                  buildLocalePrefixedPath(locale, articlePath),
                  config.url.webUrl,
                ).toString()
              : undefined,
            datePublished: article.createdAt,
          },
        } satisfies ListItem
      }),
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ldJson),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(listLdJson),
        }}
      />
    </>
  )
}
