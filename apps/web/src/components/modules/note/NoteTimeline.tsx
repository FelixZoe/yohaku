'use client'

import type { NoteTimelineItem as NoteTimelineItemData } from '@mx-space/api-client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TargetAndTransition } from 'motion/react'
import { AnimatePresence, m } from 'motion/react'
import { useLocale } from 'next-intl'
import { memo } from 'react'

import { apiClient } from '~/lib/request'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'
import {
  useActiveNoteNid,
  useBeginNoteNavigation,
  useCurrentNoteNid,
} from '~/providers/note/CurrentNoteIdProvider'

import { NoteTimelineItem } from './NoteTimelineItem'

export const NoteTimeline = memo(() => {
  const noteId = useCurrentNoteNid()
  if (!noteId) return null
  return <NoteTimelineImpl />
})
NoteTimeline.displayName = 'NoteTimeline'

const animateUl: TargetAndTransition = {
  transition: {
    staggerChildren: 0.04,
  },
}

const NoteTimelineImpl = () => {
  const locale = useLocale()
  const note = useCurrentNoteDataSelector((data) => {
    const note = data?.data
    if (!note) return null
    return {
      id: note.id,
      nid: note.nid,
      title: note.title,
      createdAt: note.createdAt,
      isPublished: note.isPublished,
    }
  })
  const activeNoteNid = useActiveNoteNid()
  const handleSelect = useBeginNoteNavigation()

  const noteId = note?.id

  const { data: timelineData } = useQuery({
    queryKey: ['note_timeline', noteId, locale],
    queryFn: async ({ queryKey }) => {
      const [, noteId, lang] = queryKey
      if (!noteId) throw new Error('Missing noteId')
      return await apiClient.note.proxy
        .list(noteId)
        .get<NoteTimelineItemData[]>({
          params: { size: 10, lang },
        })
    },
    enabled: noteId !== undefined,
    placeholderData: keepPreviousData,
  })

  const initialData = note
    ? [
        {
          title: note.title,
          nid: note.nid,
          id: note.id,
          createdAt: note.createdAt,
          isPublished: note.isPublished,
        },
      ]
    : []

  return (
    <AnimatePresence initial={false}>
      <m.ul
        layout
        animate={animateUl}
        className="flex w-full max-w-full flex-col items-start"
      >
        {(timelineData || initialData).map((item) => {
          const isCurrent = item.nid.toString() === activeNoteNid
          return (
            <NoteTimelineItem
              layout
              active={isCurrent}
              createdAt={item.createdAt}
              key={item.id}
              nid={item.nid}
              title={item.title}
              slug={
                'slug' in item && typeof item.slug === 'string'
                  ? item.slug
                  : undefined
              }
              onSelect={handleSelect}
            />
          )
        })}
      </m.ul>
    </AnimatePresence>
  )
}
