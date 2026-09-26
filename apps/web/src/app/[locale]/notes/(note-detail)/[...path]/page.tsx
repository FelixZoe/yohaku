import '../[id]/page.css'

import type { Metadata } from 'next'
import { permanentRedirect, unstable_rethrow } from 'next/navigation'

import { Paper } from '~/components/layout/container/Paper'
import { NotePasswordForm } from '~/components/modules/note'
import { getContentRedirectPath } from '~/lib/content-locale'
import { buildNotePath, buildNoteSeoPath } from '~/lib/note-route'
import { definePrerenderPage } from '~/lib/request.server'

import type { NoteDataResult } from '../[id]/api'
import { buildNotePageMetadata, NoteDetailPageContent } from '../detail-page'
import { fetchNoteData, type NoteCatchAllParams } from './route-data'

export const generateMetadata = async (props: {
  params: Promise<NoteCatchAllParams>
  searchParams?: Promise<{
    password?: string | string[]
  }>
}): Promise<Metadata> => {
  const params = await props.params
  const searchParams = (await props.searchParams) ?? {}
  const password = Array.isArray(searchParams.password)
    ? searchParams.password[0]
    : searchParams.password

  try {
    const data = await fetchNoteData({
      ...params,
      password,
    })

    return await buildNotePageMetadata({
      locale: params.locale,
      notePayload: data.note,
    })
  } catch (error) {
    unstable_rethrow(error)
    return {}
  }
}

export default definePrerenderPage<NoteCatchAllParams>()<NoteDataResult>({
  searchParamKeys: ['password'],
  fetcher: fetchNoteData,
  requestErrorRenderer(_error, parsed) {
    if (parsed.status === 403) {
      return (
        <Paper>
          <NotePasswordForm />
        </Paper>
      )
    }
  },
  async Component({ data: fetchedData, params, fetchedAt }) {
    const password = Array.isArray(params.password)
      ? params.password[0]
      : params.password
    const canonicalPath = buildNotePath({
      ...fetchedData.note.data,
      password,
    })
    const currentPath = `/notes/${params.path.join('/')}`

    const shouldRedirectPath =
      params.path.length === 1
        ? !!buildNoteSeoPath(fetchedData.note.data)
        : canonicalPath !== currentPath

    const redirectPath = getContentRedirectPath({
      requestedLocale: params.locale,
      requestedPath: shouldRedirectPath ? currentPath : canonicalPath,
      canonicalPath,
    })

    if (redirectPath) {
      permanentRedirect(redirectPath)
    }

    return (
      <NoteDetailPageContent
        fetchedAt={fetchedAt}
        locale={params.locale}
        nid={fetchedData.note.data.nid.toString()}
        notePayload={fetchedData.note}
      />
    )
  },
})
