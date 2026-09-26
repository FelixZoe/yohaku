'use client'

import type { NoteModel } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { Paper } from '~/components/layout/container/Paper'
import { Link } from '~/i18n/navigation'
import { topicWarmHue } from '~/lib/color'
import { buildNotePath } from '~/lib/note-route'

export const NoteListItemPaper: FC<{ note: NoteModel }> = ({ note }) => {
  const coverSrc = note.meta?.cover as string | undefined
  const href = buildNotePath(note)
  const summary = (note as { summary?: string }).summary
  const t = useTranslations('note')

  const metaParts: string[] = []
  if (note.weather) metaParts.push(note.weather)
  if (note.mood) metaParts.push(note.mood)

  return (
    <Link className="group block" href={href}>
      <Paper
        as="article"
        className="!m-0 transition-transform duration-150 hover:-translate-y-0.5"
        contentClassName="!p-0"
      >
        {note.bookmark && <BookmarkRibbon />}
        {coverSrc && (
          <div className="overflow-hidden rounded-t-[3px]">
            <img
              alt={note.title}
              className="h-[110px] w-full object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(60,40,20,0.08)]"
              src={coverSrc}
            />
          </div>
        )}

        <div className="px-5 pb-4 pt-3.5">
          {(note.topic || metaParts.length > 0) && (
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-10 uppercase tracking-[0.16em] text-neutral-6">
              {note.topic && <TopicChip name={note.topic.name} />}
              {metaParts.map((part, i) => (
                <span className="flex items-center gap-2" key={part}>
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="size-[3px] rounded-full bg-neutral-6/60"
                    />
                  )}
                  {part}
                </span>
              ))}
            </div>
          )}

          <h3 className="m-0 text-copy-16 font-medium leading-snug tracking-tight text-neutral-9 transition-colors group-hover:text-accent">
            {note.title}
          </h3>

          {summary && (
            <p className="mt-1 truncate text-copy-13 leading-relaxed text-neutral-7">
              {summary}
            </p>
          )}

          <div className="mt-2.5 flex items-baseline justify-between gap-4 border-t border-[rgba(60,40,20,0.06)] pt-2 dark:border-white/[0.05]">
            <span className="text-caption-10 uppercase tracking-[0.22em] text-[#b09a78] dark:text-[#8a7860]">
              Letter №<span className="tabular-nums">{note.nid}</span>
            </span>
            <span className="text-label-12 italic tracking-[0.03em] text-[#8c6239] transition-opacity group-hover:opacity-70 dark:text-[#d4a574]">
              {t('read_full_note')} →
            </span>
          </div>
        </div>
      </Paper>
    </Link>
  )
}

const TopicChip: FC<{ name: string }> = ({ name }) => {
  const hue = topicWarmHue(name)
  return (
    <span
      className="rounded-[2px] px-2 py-px text-caption-10 font-semibold tracking-[0.12em] text-white/95"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 52%, 50%), hsl(${hue}, 52%, 42%) 40%, hsl(${hue}, 52%, 34%))`,
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      {name}
    </span>
  )
}

const BookmarkRibbon: FC = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute right-[18px] -top-px z-[2] h-[38px] w-3.5"
    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))' }}
  >
    <div
      className="size-full bg-gradient-to-b from-[#a83a2c] to-[#742418]"
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
      }}
    />
  </div>
)
