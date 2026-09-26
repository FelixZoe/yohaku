import { unstable_noStore } from 'next/cache'

import { attachServerFetch } from '~/lib/attach-fetch'
import { getQueryClient } from '~/lib/query-client.server'
import { requestErrorHandler } from '~/lib/request.server'
import { queries } from '~/queries/definition'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

interface NoteSlugParams extends LocaleParams {
  day: string
  month: string
  password?: string | string[] | null
  slug: string
  year: string
}

export interface NoteDataResult {
  note: NoteWrappedPayloadWithMeta
}

const getNoteData = async (params: NoteSlugParams, lang?: string) => {
  await attachServerFetch()

  const password = Array.isArray(params.password)
    ? params.password[0]
    : (params.password ?? undefined)

  if (password) {
    unstable_noStore()
  }

  const query = queries.note.bySlugDate(
    Number(params.year),
    Number(params.month),
    Number(params.day),
    params.slug,
    password,
    lang,
  )

  const data = await getQueryClient()
    .fetchQuery({
      ...query,
      staleTime: 0,
    })
    .catch(requestErrorHandler)

  return data as NoteWrappedPayloadWithMeta
}

export const getData = async (
  params: NoteSlugParams,
): Promise<NoteDataResult> => {
  const note = await getNoteData(params, params.locale || undefined)
  return { note }
}
