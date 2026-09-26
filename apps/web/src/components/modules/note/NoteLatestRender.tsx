import type { NoteModel } from '@mx-space/api-client'
import { getFormatter, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { Fragment } from 'react'

import { MdiClockOutline } from '~/components/icons/clock'
import { DividerVertical } from '~/components/ui/divider'
import { Link } from '~/i18n/navigation'
import { topicWarmHue } from '~/lib/color'
import {
  getMoodLabel,
  getWeatherLabel,
  mood2hue,
  weather2hue,
} from '~/lib/meta-icon'
import { buildNotePath } from '~/lib/note-route'

import { Markdown } from '../../ui/markdown'
import { NoteLatestLexicalPreview } from './NoteLatestLexicalPreview'

type MetaItem = { key: string; icon: ReactNode; label: string }

const isMetaItem = (value: unknown): value is MetaItem => Boolean(value)

export async function NoteLatestRender({ note }: { note: NoteModel }) {
  const href = buildNotePath(note)
  const coverSrc = note.meta?.cover as string | undefined
  const format = await getFormatter()
  const t = await getTranslations('note')
  const tCommon = await getTranslations('common')
  const date = new Date(note.createdAt)
  const formattedDate = format.dateTime(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const metaItemCandidates: Array<MetaItem | null> = [
    note.weather
      ? {
          key: 'weather',
          icon: <HueDot hue={weather2hue(note.weather)} />,
          label: getWeatherLabel(note.weather, tCommon),
        }
      : null,
    note.mood
      ? {
          key: 'mood',
          icon: <HueDot hue={mood2hue(note.mood)} />,
          label: getMoodLabel(note.mood, tCommon),
        }
      : null,
    { key: 'date', icon: <MdiClockOutline />, label: formattedDate },
  ]
  const metaItems = metaItemCandidates.filter(isMetaItem)

  const hasPreview =
    (note.contentFormat === 'lexical' && Boolean(note.content)) ||
    Boolean(note.text)

  return (
    <div className="relative">
      {coverSrc ? (
        <Link
          className="relative isolate -mx-4 -mt-8 block h-[220px] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:-mx-[45px] md:-mt-[30px] md:h-[280px]"
          href={href}
        >
          <img
            alt={note.title}
            className="absolute inset-0 size-full object-cover"
            src={coverSrc}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,10,0.05)_0%,rgba(20,15,10,0.25)_55%,rgba(20,15,10,0.78)_100%)]"
          />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-5 pt-10 md:px-[45px] md:pb-6 md:pt-14">
            {metaItems.length > 0 && (
              <EyebrowRow items={metaItems} variant="hero" />
            )}
            <h1 className="m-0 text-title-24 font-bold leading-[1.18] tracking-tight text-[#faf6ee] [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-85 lg:text-title-28">
              {note.title}
            </h1>
          </div>
        </Link>
      ) : (
        <div className="mt-6">
          {note.topic && <MobileTopicTag name={note.topic.name} />}
          {metaItems.length > 0 && (
            <EyebrowRow items={metaItems} variant="letter" />
          )}
          <h1 className="mb-5 text-title-24 font-bold leading-[1.18] tracking-tight text-neutral-9 lg:text-title-28">
            <Link className="transition-colors hover:text-accent" href={href}>
              {note.title}
            </Link>
          </h1>
        </div>
      )}

      {hasPreview && (
        <div
          className="mt-6 max-h-[max(calc(100vh-40rem),500px)] overflow-hidden"
          style={{
            maskImage:
              'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 50%, transparent 100%)',
          }}
        >
          {note.contentFormat === 'lexical' && note.content ? (
            <article className="relative">
              <NoteLatestLexicalPreview content={note.content} />
            </article>
          ) : note.text ? (
            <article className="prose relative">
              <Markdown
                removeWrapper={false}
                value={note.text}
                variant="note"
              />
            </article>
          ) : null}
        </div>
      )}

      <footer className="flex items-baseline justify-between gap-6 border-t border-[rgba(60,40,20,0.08)] pt-4 dark:border-white/[0.06]">
        <span className="font-serif text-caption-10 uppercase tracking-[0.24em] text-[#b09a78] dark:text-[#8a7860]">
          Yohaku · Letter №<span className="tabular-nums">{note.nid}</span>
        </span>
        <Link
          className="whitespace-nowrap font-serif text-copy-13 italic tracking-[0.03em] text-[#8c6239] transition-opacity hover:opacity-70 focus-visible:opacity-70 dark:text-[#d4a574]"
          href={href}
        >
          {t('read_full_note')} →
        </Link>
      </footer>
    </div>
  )
}

function EyebrowRow({
  items,
  variant,
}: {
  items: MetaItem[]
  variant: 'hero' | 'letter'
}) {
  const isHero = variant === 'hero'
  const wrapperClass = isHero
    ? 'mb-1.5 flex flex-wrap items-center gap-y-1 font-serif text-copy-13 uppercase tracking-[0.06em] text-[rgba(250,246,238,0.78)]'
    : 'mb-3 flex flex-wrap items-center gap-y-1 font-serif text-copy-13 uppercase tracking-[0.06em] text-neutral-6'
  const dividerClass = isHero
    ? 'mx-2! scale-y-50 bg-[rgba(250,246,238,0.35)]'
    : 'mx-2! scale-y-50'

  return (
    <div className={wrapperClass}>
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 && <DividerVertical className={dividerClass} />}
          <span className="inline-flex items-center gap-1">
            {item.icon}
            <span>{item.label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}

function HueDot({ hue }: { hue: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 rounded-full"
      style={{ background: hue }}
    />
  )
}

function MobileTopicTag({ name }: { name: string }) {
  const hue = topicWarmHue(name)
  return (
    <div className="mb-3 lg:hidden">
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-label-12 font-medium"
        style={{
          backgroundColor: `hsl(${hue}, 35%, 40%, 0.12)`,
          color: `hsl(${hue}, 35%, 40%)`,
        }}
      >
        {name}
      </span>
    </div>
  )
}
