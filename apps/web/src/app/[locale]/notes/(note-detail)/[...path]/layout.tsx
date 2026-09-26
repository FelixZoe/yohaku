import { RequestError } from '@mx-space/api-client'
import { permanentRedirect, unstable_rethrow } from 'next/navigation'
import type { PropsWithChildren } from 'react'

import { getContentRedirectPath } from '~/lib/content-locale'
import { buildNotePath, buildNoteSeoPath } from '~/lib/note-route'

import { fetchNoteData, type NoteCatchAllParams } from './route-data'

export default async function NoteRouteGuard(
  props: PropsWithChildren<{ params: Promise<NoteCatchAllParams> }>,
) {
  const params = await props.params
  let fetchedData: Awaited<ReturnType<typeof fetchNoteData>>

  try {
    fetchedData = await fetchNoteData(params)
  } catch (error) {
    unstable_rethrow(error)

    // Password-protected notes require search parameters, which layouts do not
    // receive. Their page-level fetch retains the existing password flow.
    if (error instanceof RequestError && error.status === 403) {
      return props.children
    }

    throw error
  }

  const canonicalPath = buildNotePath(fetchedData.note.data)
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

  return props.children
}
