'use client'

import type { NoteResponseMeta } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { createModelDataProvider } from 'jojoo/react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useEffect } from 'react'

import { queries } from '~/queries/definition'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

const {
  ModelDataProvider,
  ModelDataAtomProvider,
  getGlobalModelData: getModelData,
  setGlobalModelData: setModelData,
  useModelDataSelector,
  useSetModelData,
} = createModelDataProvider<NoteWrappedPayloadWithMeta>()

const useCurrentNoteMetaSelector = <T,>(
  selector: (meta: NoteResponseMeta | undefined) => T,
  deps?: any[],
) => useModelDataSelector((state) => selector((state ?? undefined)?.meta), deps)

export {
  ModelDataAtomProvider as CurrentNoteDataAtomProvider,
  ModelDataProvider as CurrentNoteDataProvider,
  getModelData as getCurrentNoteData,
  setModelData as setCurrentNoteData,
  useModelDataSelector as useCurrentNoteDataSelector,
  useCurrentNoteMetaSelector,
  useSetModelData as useSetCurrentNoteData,
}

export const SyncNoteDataAfterLoggedIn = () => {
  const nid = useModelDataSelector((data) => data?.data.nid)
  const password = useSearchParams().get('password')
  const locale = useLocale()
  const { data } = useQuery({
    ...queries.note.byNid(nid?.toString() || '', password, locale),
    enabled: !!nid,
  })

  useEffect(() => {
    if (data) {
      const noteData = data as NoteWrappedPayloadWithMeta
      setModelData((draft) => {
        draft.data = noteData.data
        draft.meta = noteData.meta
        draft.next = noteData.next
        draft.prev = noteData.prev
      })
    }
  }, [data])

  return null
}
