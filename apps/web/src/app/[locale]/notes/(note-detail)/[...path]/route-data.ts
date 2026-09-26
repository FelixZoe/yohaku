import { notFound } from 'next/navigation'

import {
  isValidNoteNidSegment,
  isValidNoteSlugDateParts,
} from '~/lib/note-route'

import { getData as getNoteByNidData, type NoteDataResult } from '../[id]/api'
import { getData as getNoteBySlugData } from '../slug-api'

export type NoteCatchAllParams = LocaleParams & {
  password?: string | string[] | null
  path: string[]
}

const resolveNotePath = (path?: string[]) => {
  if (!path?.length) {
    notFound()
  }

  if (path.length === 1) {
    const id = path[0]
    if (!isValidNoteNidSegment(id)) {
      notFound()
    }
    return {
      id,
      kind: 'nid' as const,
    }
  }

  if (path.length === 4) {
    const [year, month, day, slug] = path
    if (!isValidNoteSlugDateParts(year, month, day)) {
      notFound()
    }
    return {
      day,
      kind: 'slug' as const,
      month,
      slug,
      year,
    }
  }

  notFound()
}

export const fetchNoteData = async (
  params: NoteCatchAllParams,
): Promise<NoteDataResult> => {
  const resolved = resolveNotePath(params.path)

  if (resolved.kind === 'nid') {
    return getNoteByNidData({
      ...params,
      id: resolved.id,
    })
  }

  return getNoteBySlugData({
    ...params,
    ...resolved,
  })
}
