'use client'

import type { NoteModel } from '@mx-space/api-client'
import { useFormatter } from 'next-intl'
import type { FC } from 'react'

import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'

import { NoteListItemPaper } from './NoteListItemPaper'

interface YearGroup {
  notes: NoteModel[]
  year: number
}

function groupNotesByYear(notes: NoteModel[]): YearGroup[] {
  const groups: Map<number, NoteModel[]> = new Map()

  for (const note of notes) {
    const year = new Date(note.createdAt).getFullYear()
    if (!groups.has(year)) {
      groups.set(year, [])
    }
    groups.get(year)!.push(note)
  }

  return Array.from(groups.entries()).map(([year, notes]) => ({ year, notes }))
}

export const NoteListTimeline: FC<{ notes: NoteModel[] }> = ({ notes }) => {
  const format = useFormatter()
  const groups = groupNotesByYear(notes)

  let itemIndex = 0

  return (
    <div className="space-y-14">
      {groups.map((group) => {
        const groupStartIndex = itemIndex
        const count = group.notes.length

        return (
          <section className="relative" key={group.year}>
            <BottomToUpSoftScaleTransitionView
              lcpOptimization
              className="mb-7 flex items-baseline gap-5 border-b border-[rgba(60,40,20,0.10)] pb-2.5 dark:border-white/[0.08]"
              delay={groupStartIndex * 100}
            >
              <div>
                <div className="text-caption-10 uppercase tracking-[0.28em] text-[#b09a78] dark:text-[#8a7860]">
                  Anno
                </div>
                <div className="mt-0.5 text-display-36 font-medium leading-none tracking-tight text-neutral-9">
                  {group.year}
                </div>
              </div>
              <div className="flex-1 text-right text-caption-10 uppercase tracking-[0.18em] text-neutral-6">
                {count} letter{count === 1 ? '' : 's'}
              </div>
            </BottomToUpSoftScaleTransitionView>

            <div className="relative space-y-6">
              <div className="absolute bottom-0 left-[11px] top-1 w-px bg-[rgba(60,40,20,0.12)] dark:bg-white/[0.08] lg:hidden" />

              {group.notes.map((note) => {
                const date = new Date(note.createdAt)
                const currentIndex = itemIndex++
                return (
                  <BottomToUpSoftScaleTransitionView
                    lcpOptimization
                    className="relative flex items-stretch gap-6 lg:gap-6"
                    delay={currentIndex * 100}
                    key={note.id}
                  >
                    <div className="hidden w-16 shrink-0 border-r border-[rgba(60,40,20,0.08)] pr-3.5 pt-1 text-right dark:border-white/[0.06] lg:block">
                      <div className="text-title-28 font-medium leading-none tracking-tight text-neutral-9">
                        {String(date.getDate()).padStart(2, '0')}
                      </div>
                      <div className="mt-1.5 text-caption-10 uppercase tracking-[0.18em] text-neutral-6">
                        {format.dateTime(date, { month: 'long' })}
                      </div>
                      <div className="mt-0.5 text-caption-10 uppercase tracking-[0.16em] text-[#b09a78] dark:text-[#8a7860]">
                        {format.dateTime(date, { weekday: 'short' })}
                      </div>
                    </div>

                    <div className="absolute left-[7px] top-2 size-[10px] shrink-0 rounded-full border-[1.5px] border-[rgba(60,40,20,0.25)] bg-[#faf6ee] dark:border-white/30 dark:bg-neutral-2 lg:hidden" />

                    <div className="min-w-0 flex-1 pl-8 lg:pl-0">
                      <div className="mb-1.5 text-caption-10 uppercase tracking-[0.16em] text-neutral-6 lg:hidden">
                        {format.dateTime(date, {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </div>
                      <NoteListItemPaper note={note} />
                    </div>
                  </BottomToUpSoftScaleTransitionView>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
