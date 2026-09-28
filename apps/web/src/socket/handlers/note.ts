import type {
  NoteModel,
  NoteResponseMeta,
  NoteWrappedPayload,
} from '@mx-space/api-client'
import * as React from 'react'

import { buildNotePath } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { toast } from '~/lib/toast'
import {
  getCurrentNoteData,
  setCurrentNoteData,
} from '~/providers/note/CurrentNoteDataProvider'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'
import { withNotePayloadMeta } from '~/queries/definition/note'
import { EventTypes } from '~/types/events'

import type { EventHandler } from './types'
import { trackerRealtimeEvent } from './types'
import { createUpdateHandler } from './util-update'

export const noteCreateHandler: EventHandler = (data) => {
  const note = data as NoteModel

  const open = () => {
    window.peek(buildNotePath(note))
  }
  toast.success(`新篇已立：「${note.title}」`, {
    onClick: open,
    action: {
      label: '查看',
      onClick: open,
    },
    iconElement: React.createElement('i', {
      className: 'i-mingcute-quill-pen-line',
    }),
    autoClose: false,
  })

  trackerRealtimeEvent()
}

export const noteUpdateHandler = createUpdateHandler<NoteModel>({
  getCurrent: () => {
    const current = getCurrentNoteData()
    if (!current) return null
    return { data: current.data, meta: current.meta }
  },
  applyData: (note) => {
    setCurrentNoteData((draft) => {
      Object.assign(draft.data, note)
    })
  },
  refetchTranslated: async (current, targetLang) => {
    applyNotePayload(await fetchNoteInLang(current.nid, targetLang))
  },
})

export const fetchNoteInLang = async (nid: number, lang: string) => {
  const fresh = await apiClient.note.proxy
    .nid(nid.toString())
    .get<NoteWrappedPayload>({
      params: { lang, prefer: 'lexical', t: Date.now() },
    })
  return withNotePayloadMeta(fresh as Parameters<typeof withNotePayloadMeta>[0])
}

export const applyNotePayload = (wrapped: NoteWrappedPayloadWithMeta) => {
  setCurrentNoteData((draft) => {
    draft.data = wrapped.data
    draft.meta = wrapped.meta as NoteResponseMeta | undefined
    draft.next = wrapped.next
    draft.prev = wrapped.prev
  })
}

export const noteDeleteHandler: EventHandler = (data, { router }) => {
  const note = data as NoteModel
  if (
    location.pathname === buildNotePath(note) &&
    getCurrentNoteData()?.data.id === note.id
  ) {
    router.replace(routeBuilder(Routes.PageDeletd, {}))
    toast.error('此记已删。')
    trackerRealtimeEvent()
  }
}

export const noteHandlers = {
  [EventTypes.NOTE_CREATE]: noteCreateHandler,
  [EventTypes.NOTE_REPUBLISH]: noteCreateHandler,
  [EventTypes.NOTE_UPDATE]: noteUpdateHandler,
  [EventTypes.NOTE_DELETE]: noteDeleteHandler,
  [EventTypes.NOTE_UNPUBLISH]: noteDeleteHandler,
} as const
