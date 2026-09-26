import { unstable_noStore } from 'next/cache'

import { attachServerFetch } from '~/lib/attach-fetch'
import { getQueryClient } from '~/lib/query-client.server'
import { requestErrorHandler } from '~/lib/request.server'
import { queries } from '~/queries/definition'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

export interface NoteParams extends LocaleParams {
  id: string
  password?: string | string[] | null
}

export interface NoteDataResult {
  note: NoteWrappedPayloadWithMeta
}

const getNoteData = async (params: NoteParams, lang?: string) => {
  await attachServerFetch()

  const { id } = params
  const password = Array.isArray(params.password)
    ? params.password[0]
    : (params.password ?? undefined)

  if (password) {
    unstable_noStore()
  }

  const query = queries.note.byNid(id, password, lang)

  const data = await getQueryClient()
    .fetchQuery({
      ...query,
      staleTime: 0,
    })
    .catch(requestErrorHandler)
  return data as NoteWrappedPayloadWithMeta
}

export const getData = async (params: NoteParams): Promise<NoteDataResult> => {
  const note = await getNoteData(params, params.locale || undefined)
  return { note }
}
