import type { Metadata } from 'next'

import type { Locale } from '~/i18n/config'
import { defaultLocale } from '~/i18n/config'

import {
  buildLanguageAlternates,
  buildLocalePrefixedPath,
  getSupportedLocalesFromTranslations,
} from './hreflang'

type MetadataAlternates = NonNullable<Metadata['alternates']>
type MetadataOpenGraph = NonNullable<Metadata['openGraph']>
type AlternateTypesMap = NonNullable<MetadataAlternates['types']>
type AlternateTypeValue = AlternateTypesMap[string]
type AlternateTypeEntry = Extract<AlternateTypeValue, unknown[]>[number]

const RSS_FEED_ALTERNATE_TYPES: AlternateTypesMap = {
  'application/rss+xml': [{ url: 'feed', title: 'RSS Subscribe' }],
}

const toAlternateTypeEntries = (
  value: AlternateTypeValue,
): AlternateTypeEntry[] => {
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [{ url: value }]
}

const mergeAlternateTypes = (
  base: AlternateTypesMap,
  extra: AlternateTypesMap | undefined,
): AlternateTypesMap => {
  if (!extra) return base

  const merged: AlternateTypesMap = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    merged[key] =
      key in base
        ? [
            ...toAlternateTypeEntries(base[key]),
            ...toAlternateTypeEntries(value),
          ]
        : value
  }
  return merged
}

export const SEO_TITLE_SEPARATOR = ' - '

export const resolveTwitterCreator = (
  socialIds?: Record<string, string>,
): string | undefined => {
  const handle = socialIds?.twitter || socialIds?.x
  if (!handle) return undefined

  return `@${handle.replace(/^@/, '')}`
}

export interface PageMetadataDescriptionContext {
  siteName: string
}

export type PageMetadataDescription =
  string | ((context: PageMetadataDescriptionContext) => string)

export interface AssemblePageMetadataOptions {
  description?: PageMetadataDescription
  locale: Locale
  og?: {
    image?: MetadataOpenGraph['images']
    type?: 'website' | 'article'
  }
  path: string
  seo: {
    title: string
    description: string
    keywords?: string[]
  }
  title?: string
  translations?: Parameters<typeof getSupportedLocalesFromTranslations>[0]
  twitterCreator?: string
  types?: MetadataAlternates['types']
}

export const assemblePageMetadata = ({
  seo,
  locale,
  path,
  title,
  description,
  og,
  translations,
  twitterCreator,
  types,
}: AssemblePageMetadataOptions): Metadata => {
  const resolvedDescription =
    typeof description === 'function'
      ? description({ siteName: seo.title })
      : (description ?? seo.description)
  const includeLocales = translations
    ? getSupportedLocalesFromTranslations(translations)
    : undefined
  const xDefaultLocale =
    includeLocales?.find(
      (candidate) => candidate === translations?.sourceLang,
    ) ??
    includeLocales?.[0] ??
    defaultLocale
  const canonical = buildLocalePrefixedPath(locale, path)
  const socialTitle = title
    ? `${title}${SEO_TITLE_SEPARATOR}${seo.title}`
    : seo.title
  const images = og?.image ?? `/home-og?lang=${locale}`

  return {
    ...(title ? { title } : {}),
    description: resolvedDescription,
    alternates: {
      canonical,
      languages: {
        ...buildLanguageAlternates(path, includeLocales),
        'x-default': buildLocalePrefixedPath(xDefaultLocale, path),
      },
      types: mergeAlternateTypes(RSS_FEED_ALTERNATE_TYPES, types),
    },
    openGraph: {
      type: og?.type ?? 'website',
      title: { absolute: socialTitle },
      description: resolvedDescription,
      siteName: seo.title,
      url: canonical,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: { absolute: socialTitle },
      description: resolvedDescription,
      images,
      ...(twitterCreator ? { creator: twitterCreator } : {}),
    },
  }
}
