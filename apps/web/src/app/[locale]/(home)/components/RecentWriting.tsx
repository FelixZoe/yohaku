'use client'

import type { AggregateTopNote, AggregateTopPost } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { RelativeTime } from '~/components/ui/relative-time'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { getNoteRouteParams } from '~/lib/note-route'
import { routeBuilder, Routes } from '~/lib/route-builder'

import { useHomeQueryData } from '../useHomeQueryData'
import { SectionHeading } from './SectionHeading'

type MergedItem =
  (AggregateTopPost & { type: 'post' }) | (AggregateTopNote & { type: 'note' })

function getItemUrl(item: MergedItem): string {
  if (item.type === 'post') {
    return routeBuilder(Routes.Post, {
      category: item.category.slug,
      slug: item.slug,
    })
  }
  return routeBuilder(Routes.Note, {
    ...getNoteRouteParams(item),
  })
}

const WritingItem = ({ item, index }: { item: MergedItem; index: number }) => {
  const t = useTranslations('home')
  const url = getItemUrl(item)
  const isFeatured = index === 0
  const typeLabel = item.type === 'post' ? t('second_post') : t('second_note')
  const weather =
    item.type === 'note' && 'weather' in item ? (item as any).weather : null
  const summary = isFeatured && 'summary' in item ? (item as any).summary : null

  return (
    <div className="relative py-4 pl-10">
      <span
        className={clsxm(
          'absolute left-[19px] top-4 -translate-x-1/2 bg-paper px-1 text-label-12 font-medium tabular-nums tracking-[0.5px]',
          isFeatured ? 'text-accent' : 'text-neutral-6',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {isFeatured ? (
        <Link className="block" href={url}>
          <div className="text-label-12 text-neutral-6">
            {typeLabel}
            {' · '}
            <RelativeTime date={item.createdAt} />
            {weather && <> · {weather}</>}
          </div>
          <h3 className="mt-2 hyphens-auto break-words text-title-20 font-medium leading-normal text-neutral-9 transition-colors hover:text-accent">
            {item.title}
          </h3>
          {summary && (
            <div className="mt-2.5 text-copy-13 leading-[1.8] text-neutral-7">
              {summary}
            </div>
          )}
        </Link>
      ) : (
        <Link className="block" href={url}>
          <div className="flex items-baseline justify-between gap-5">
            <h3 className="hyphens-auto break-words text-copy-14 font-normal text-neutral-8 transition-colors hover:text-accent">
              {item.title}
            </h3>
            <span className="shrink-0 whitespace-nowrap text-label-12 tabular-nums text-neutral-6">
              <RelativeTime date={item.createdAt} />
            </span>
          </div>
          <div className="mt-1 text-label-12 text-neutral-6">
            {item.type === 'note'
              ? typeLabel
              : `${typeLabel}${
                  item.category?.name ? ` · ${item.category.name}` : ''
                }`}
          </div>
        </Link>
      )}
    </div>
  )
}

export const RecentWriting = () => {
  const t = useTranslations('home')
  const { notes, posts } = useHomeQueryData()

  const items = useMemo(() => {
    const merged: MergedItem[] = [
      ...posts.map((p) => ({ ...p, type: 'post' as const })),
      ...notes.map((n) => ({ ...n, type: 'note' as const })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return merged.slice(0, 5)
  }, [notes, posts])

  if (!items.length) return null

  return (
    <div>
      <SectionHeading eyebrow="recentWriting">
        {t('second_recent_writing')}
      </SectionHeading>

      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-[18px] w-0.5 bg-border"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-[18px] top-2 h-[58%] w-0.5 bg-gradient-to-b from-accent to-transparent"
        />
        {items.map((item, index) => (
          <WritingItem index={index} item={item} key={item.id} />
        ))}
      </div>
    </div>
  )
}
