import type {
  NoteModel,
  NoteResponseMeta,
  NoteWrappedPayload,
} from '@mx-space/api-client'

import { narrowMetaForItem } from '~/lib/api/article-meta'
import type { NotePayloadWithMeta } from '~/lib/api/meta'
import { apiClient } from '~/lib/request'

import { defineQuery } from '../helper'

const LATEST_KEY = 'latest'

export type NoteWrappedPayloadWithMeta = NotePayloadWithMeta<NoteModel> & {
  next?: Partial<NoteModel> | null
  prev?: Partial<NoteModel> | null
}

const stripNeighborBody = (
  neighbor: Partial<NoteModel> | null | undefined,
): Partial<NoteModel> | null | undefined => {
  if (neighbor === null || neighbor === undefined) return neighbor
  const {
    text: _text,
    content: _content,
    ...rest
  } = neighbor as Partial<NoteModel> & {
    text?: unknown
    content?: unknown
  }
  return rest
}

export const withNotePayloadMeta = (
  payload: NoteWrappedPayload & { $meta?: NoteResponseMeta },
): NoteWrappedPayloadWithMeta => {
  const { next, prev, $meta, ...note } = payload as NoteWrappedPayload & {
    $meta?: NoteResponseMeta
  }
  const data = note as NoteModel
  return {
    data,
    meta: narrowMetaForItem($meta, data),
    next: stripNeighborBody(next),
    prev: stripNeighborBody(prev),
  }
}

export const note = {
  byNid: (nid: string, password?: string | null, lang?: string) =>
    defineQuery({
      queryKey: ['note', nid, lang],

      queryFn: async ({ queryKey }) => {
        const [, id, lang] = queryKey as [string, string, string | undefined]

        if (id === LATEST_KEY) {
          return withNotePayloadMeta(await apiClient.note.getLatest())
        }
        const data = await apiClient.note.getNoteByNid(Number(id), {
          password: password || undefined,
          lang: lang || undefined,
          prefer: 'lexical',
        })

        return withNotePayloadMeta(data)
      },
    }),
  bySlugDate: (
    year: number,
    month: number,
    day: number,
    slug: string,
    password?: string | null,
    lang?: string,
  ) =>
    defineQuery({
      queryKey: ['note', 'slug', year, month, day, slug, lang],

      queryFn: async ({ queryKey }) => {
        const [, , year, month, day, slug, lang] = queryKey as [
          string,
          string,
          number,
          number,
          number,
          string,
          string | undefined,
        ]

        const data = await apiClient.note.getNoteBySlugDate(
          year,
          month,
          day,
          slug,
          {
            password: password || undefined,
            lang: lang || undefined,
            prefer: 'lexical',
          },
        )

        return withNotePayloadMeta(data)
      },
    }),
}
