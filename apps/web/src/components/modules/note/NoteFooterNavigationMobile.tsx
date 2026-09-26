'use client'

import type { NoteTimelineItem as NoteTimelineItemData } from '@mx-space/api-client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { memo } from 'react'

import { PresentSheet } from '~/components/ui/sheet/Sheet'
import { OnlyMobile } from '~/components/ui/viewport/OnlyMobile'
import { Link } from '~/i18n/navigation'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { springScrollToTop } from '~/lib/scroller'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'
import { useCurrentNoteNid } from '~/providers/note/CurrentNoteIdProvider'

export const NoteFooterNavigationMobile = memo(() => {
  return (
    <OnlyMobile>
      <NoteFooterNavigationMobileImpl />
    </OnlyMobile>
  )
})
NoteFooterNavigationMobile.displayName = 'NoteFooterNavigationMobile'

const NoteFooterNavigationMobileImpl = () => {
  const noteNid = useCurrentNoteNid()

  const data = useCurrentNoteDataSelector((data) =>
    !data
      ? null
      : {
          next:
            data.next && data.next.nid
              ? {
                  nid: data.next.nid,
                  title: data.next.title,
                  slug: data.next.slug,
                  createdAt: data.next.createdAt,
                }
              : null,
          prev:
            data.prev && data.prev.nid
              ? {
                  nid: data.prev.nid,
                  title: data.prev.title,
                  slug: data.prev.slug,
                  createdAt: data.prev.createdAt,
                }
              : null,
          noteId: data.data.id,
          currentNote: {
            id: data.data.id,
            nid: data.data.nid,
            title: data.data.title,
            createdAt: data.data.createdAt,
          },
        },
  )

  if (!data) return null

  const { next, prev } = data
  const hasPrevNext = !!prev || !!next

  return (
    <section data-hide-print className="mt-4">
      {hasPrevNext && <PrevNextBar next={next} prev={prev} />}
      <TimelineSheetTrigger
        currentNote={data.currentNote}
        noteId={data.noteId}
        noteNid={noteNid}
      />
    </section>
  )
}

const PrevNextBar = memo<{
  prev: {
    nid: number
    title?: string
    slug?: string | null
    createdAt?: Date | string
  } | null
  next: {
    nid: number
    title?: string
    slug?: string | null
    createdAt?: Date | string
  } | null
}>(({ prev, next }) => {
  const t = useTranslations('note')
  return (
    <div className="flex items-end justify-between border-t border-neutral-3/50 pt-3">
      {next ? (
        <Link
          className="max-w-[45%] text-neutral-8 transition-colors hover:text-accent"
          href={routeBuilder(Routes.Note, {
            id: next.nid.toString(),
            slug: next.slug || undefined,
            createdAt: next.createdAt,
          })}
          onClick={springScrollToTop}
        >
          <div className="text-caption-10 uppercase tracking-[1.5px] opacity-50">
            {t('previous_note')}
          </div>
          <div className="truncate text-copy-13">
            {next.title || `#${next.nid}`}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {prev ? (
        <Link
          className="max-w-[45%] text-right text-neutral-8 transition-colors hover:text-accent"
          href={routeBuilder(Routes.Note, {
            id: prev.nid.toString(),
            slug: prev.slug || undefined,
            createdAt: prev.createdAt,
          })}
          onClick={springScrollToTop}
        >
          <div className="text-caption-10 uppercase tracking-[1.5px] opacity-50">
            {t('next_note')}
          </div>
          <div className="truncate text-copy-13">
            {prev.title || `#${prev.nid}`}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
})
PrevNextBar.displayName = 'PrevNextBar'

interface CurrentNoteInfo {
  createdAt: Date | string
  id: string
  nid: number
  title: string
}

const TimelineSheetTrigger = memo<{
  currentNote: CurrentNoteInfo
  noteId: string
  noteNid: string | null | undefined
}>(({ noteId, noteNid, currentNote }) => {
  const t = useTranslations('note')

  return (
    <div className="mt-4">
      <PresentSheet
        triggerAsChild
        title={t('more_notes')}
        content={
          <TimelineSheetContent
            currentNote={currentNote}
            noteId={noteId}
            noteNid={noteNid}
          />
        }
      >
        <button
          className="flex w-full touch-manipulation cursor-pointer items-center gap-2 py-2.5 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px active:opacity-90 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          type="button"
        >
          <span className="h-px min-w-[1rem] flex-1 bg-neutral-3/55 dark:bg-neutral-4/40" />
          <span className="shrink-0 rounded-sm bg-neutral-2/90 px-2.5 py-1 text-caption-10 font-semibold tracking-[0.5px] text-neutral-8 dark:bg-white/[0.06]">
            {t('more_notes')}
          </span>
          <span className="h-px min-w-[1rem] flex-1 bg-neutral-3/55 dark:bg-neutral-4/40" />
        </button>
      </PresentSheet>
    </div>
  )
})
TimelineSheetTrigger.displayName = 'TimelineSheetTrigger'

const TimelineSheetContent = memo<{
  currentNote: CurrentNoteInfo
  noteId: string
  noteNid: string | null | undefined
}>(({ noteId, noteNid, currentNote }) => {
  const locale = useLocale()

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

  const initialData: NoteTimelineItemData[] = [
    {
      title: currentNote.title,
      nid: currentNote.nid,
      id: currentNote.id,
      createdAt: currentNote.createdAt as string,
    } as NoteTimelineItemData,
  ]

  const items = timelineData || initialData
  const currentNid = Number.parseInt(noteNid || '0')

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const isActive = item.nid === currentNid
        return (
          <Link
            key={item.id}
            className={`flex items-center rounded-md px-3 py-[7px] text-label-12 ${
              isActive
                ? 'bg-accent/7 font-medium text-accent'
                : 'text-neutral-6'
            }`}
            href={routeBuilder(Routes.Note, {
              id: item.nid,
              slug:
                'slug' in item && typeof item.slug === 'string'
                  ? item.slug
                  : undefined,
              createdAt: item.createdAt,
            })}
            onClick={springScrollToTop}
          >
            <span
              className={`mr-2 size-1 shrink-0 rounded-full ${
                isActive ? 'bg-accent' : 'bg-neutral-4'
              }`}
            />
            <span className="truncate">{item.title}</span>
          </Link>
        )
      })}
    </div>
  )
})
TimelineSheetContent.displayName = 'TimelineSheetContent'
