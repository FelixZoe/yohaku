import chroma from 'chroma-js'
import type { Metadata } from 'next'
import type { BlogPosting, BreadcrumbList, WithContext } from 'schema-dts'

import { PageColorGradient } from '~/components/common/PageColorGradient'
import type { Locale } from '~/i18n/config'
import { articleMetaOf } from '~/lib/api/article-meta'
import { topicStringToHue } from '~/lib/color'
import { getContentLocaleRedirect } from '~/lib/content-locale'
import { getOgUrl } from '~/lib/helper.server'
import { getSummaryFromMd, getWordCountFromMd } from '~/lib/markdown'
import { buildNotePath } from '~/lib/note-route'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'
import { buildPageMetadata } from '~/lib/seo/metadata.server'
import { NOINDEX_FOLLOW_ROBOTS } from '~/lib/seo/robots'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

import { LdJsonWithAuthor } from './[id]/pageExtra'
import { NoteDetailClient } from './NoteDetailClient'

export const buildNotePageMetadata = async ({
  locale,
  notePayload,
}: {
  locale: string
  notePayload: NoteWrappedPayloadWithMeta
}): Promise<Metadata> => {
  const { data } = notePayload
  const articleTranslation = articleMetaOf(notePayload.meta).translation
  const fallbackLocale = getContentLocaleRedirect(locale, articleTranslation)
  const metadataLocale = fallbackLocale ?? (locale as Locale)
  const description = getSummaryFromMd(data.text ?? '')

  const ogUrl = await getOgUrl(
    'note',
    {
      nid: data.nid.toString(),
    },
    metadataLocale,
    { ...data, articleTranslation },
  )

  const metadata = await buildPageMetadata({
    locale: metadataLocale,
    path: buildNotePath(data),
    title: data.title,
    description,
    og: { image: ogUrl, type: 'article' },
    translations: {
      sourceLang: articleTranslation?.sourceLang,
      availableTranslations: articleTranslation?.availableTranslations,
    },
  })

  return fallbackLocale
    ? { ...metadata, robots: NOINDEX_FOLLOW_ROBOTS }
    : metadata
}

export const NoteDetailPageContent = ({
  fetchedAt,
  locale,
  nid,
  notePayload,
}: {
  fetchedAt: string
  locale: string
  nid: string
  notePayload: NoteWrappedPayloadWithMeta
}) => {
  const { data } = notePayload

  const coverImage = data.images?.find((i) => i.src === data.meta?.cover)
  const topicAccent = data.topic?.name
    ? chroma.hsl(topicStringToHue(data.topic.name), 0.35, 0.5).hex()
    : null
  const coverAccent =
    data.meta?.cover && coverImage?.accent ? coverImage.accent : null
  const pageAccent = topicAccent ?? coverAccent

  const wordCount = getWordCountFromMd(data.text ?? '', locale)
  const jsonLd: WithContext<BlogPosting> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.title,
    image: data.meta?.cover ? [data.meta.cover] : undefined,
    description: data.summary || (data.text ?? '').slice(0, 200),
    datePublished: data.createdAt,
    dateModified: data.modifiedAt || undefined,
    wordCount,
  }

  const breadcrumbLd: WithContext<BreadcrumbList> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: buildLocalePrefixedPath(locale as Locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Notes',
        item: buildLocalePrefixedPath(locale as Locale, '/notes'),
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
      {!!pageAccent && <PageColorGradient baseColor={pageAccent} />}
      <NoteDetailClient
        fetchedAt={fetchedAt}
        nid={nid}
        notePayload={notePayload}
      />
    </>
  )
}
