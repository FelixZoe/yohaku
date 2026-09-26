'use client'

import type { PostModel, PostResponseMeta } from '@mx-space/api-client'
import { createModelDataProvider } from 'jojoo/react'

import { isClientSide, isDev } from '~/lib/env'
import type { PostWithTranslation } from '~/queries/definition'

const {
  ModelDataProvider,
  ModelDataAtomProvider,
  getGlobalModelData,
  setGlobalModelData,
  useSetModelData,
  useModelDataSelector,
} = createModelDataProvider<PostWithTranslation>()

declare global {
  interface Window {
    getModelPostData: typeof getGlobalModelData
  }
}
if (isDev && isClientSide) window.getModelPostData = getGlobalModelData

const useCurrentPostDataSelector = <T,>(
  selector: (data: PostModel | undefined) => T,
  deps?: any[],
) => useModelDataSelector((state) => selector((state ?? undefined)?.data), deps)

const useCurrentPostMetaSelector = <T,>(
  selector: (meta: PostResponseMeta | undefined) => T,
  deps?: any[],
) => useModelDataSelector((state) => selector((state ?? undefined)?.meta), deps)

export {
  ModelDataAtomProvider as CurrentPostDataAtomProvider,
  ModelDataProvider as CurrentPostDataProvider,
  getGlobalModelData as getGlobalCurrentPostData,
  setGlobalModelData as setGlobalCurrentPostData,
  useCurrentPostDataSelector,
  useCurrentPostMetaSelector,
  useSetModelData as useSetCurrentPostData,
}
