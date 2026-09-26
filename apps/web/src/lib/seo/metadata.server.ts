import 'server-only'

import type { Metadata } from 'next'

import { fetchAggregationData } from '~/app/[locale]/api'

import type { AssemblePageMetadataOptions } from './metadata'
import { assemblePageMetadata, resolveTwitterCreator } from './metadata'

export type BuildPageMetadataOptions = Omit<
  AssemblePageMetadataOptions,
  'seo' | 'twitterCreator'
>

export const buildPageMetadata = async (
  options: BuildPageMetadataOptions,
): Promise<Metadata> => {
  const data = await fetchAggregationData({ locale: options.locale }).catch(
    () => null,
  )
  if (!data) return {}

  const { seo, user } = data
  const twitterCreator = resolveTwitterCreator(user.socialIds)
  return assemblePageMetadata({ ...options, seo, twitterCreator })
}
