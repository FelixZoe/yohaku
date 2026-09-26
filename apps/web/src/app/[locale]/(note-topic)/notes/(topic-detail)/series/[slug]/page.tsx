'use client'

import type {
  NoteModel,
  PaginateResult,
  TopicModel,
} from '@mx-space/api-client'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { Variants } from 'motion/react'
import { m } from 'motion/react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { NoteTopicAvatar } from '~/components/modules/note/NoteTopicAvatar'
import { NoteTopicMarkdownRender } from '~/components/modules/note/NoteTopicMarkdownRender'
import { LoadMoreIndicator } from '~/components/modules/shared/LoadMoreIndicator'
import { Loading } from '~/components/ui/loading'
import { RelativeTime } from '~/components/ui/relative-time'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import { Link } from '~/i18n/navigation'
import { hasNextPage as paginationHasNextPage } from '~/lib/api/meta'
import { clsxm } from '~/lib/helper'
import { getNoteRouteParams } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'

import { getTopicQuery } from './query'

const listVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.08 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function Page() {
  const { slug } = useParams()
  const locale = useLocale()
  const t = useTranslations('note')

  const { data: topic } = useQuery({
    ...getTopicQuery(slug as string, locale),
    enabled: false,
  })
  if (!topic) throw new Error('topic data is lost :(')

  const [sortAsc, setSortAsc] = useState(true)
  const sortOrder = sortAsc ? 1 : -1

  const {
    data: notes,
    isPending,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['topicId', topic.id, locale, sortOrder],
    queryFn: async ({ queryKey, pageParam }) => {
      const [, topicId, lang, order] = queryKey
      if (!topicId) throw new Error('topicId is not ready :(')
      return await apiClient.note.proxy
        .topics(topicId as string)
        .get<PaginateResult<NoteModel>>({
          params: {
            page: pageParam,
            lang,
            sortBy: 'createdAt',
            sortOrder: order,
          },
        })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      paginationHasNextPage(lastPage.pagination)
        ? lastPage.pagination.page + 1
        : undefined,
  })

  const { data: lastUpdate } = useQuery({
    queryKey: ['topic-recent-update', topic.id],
    queryFn: () => apiClient.note.getTopicRecentUpdate(topic.id),
  })

  const items = useMemo(
    () => notes?.pages.flatMap((p) => p.data) ?? [],
    [notes],
  )
  const total = notes?.pages[0]?.pagination.total ?? 0
  const lastUpdatedAt = lastUpdate?.ts ?? null

  const groups = useMemo(() => groupByYear(items, sortAsc), [items, sortAsc])

  return (
    <BottomToUpSoftScaleTransitionView>
      <article className="text-neutral-10/80">
        <TopicHero
          description={topic.description}
          introduce={topic.introduce}
          lastUpdatedAt={lastUpdatedAt}
          name={topic.name}
          sortAsc={sortAsc}
          topic={topic}
          total={total}
          onToggleSort={() => setSortAsc((v) => !v)}
        />

        <div className="mt-8 h-px bg-neutral-10/8" />

        <section className="mt-2">
          {isPending && items.length === 0 ? (
            <ListSkeleton />
          ) : items.length === 0 ? (
            <p className="my-12 text-center text-copy-13 italic text-neutral-7">
              {t('topic_empty')}
            </p>
          ) : (
            <m.div
              animate="show"
              initial="hidden"
              key={sortOrder}
              variants={listVariants}
            >
              {groups.map((group) => (
                <div key={group.year}>
                  <m.div
                    className="mt-6 text-label-12 font-medium uppercase tracking-widest text-neutral-7/70"
                    variants={itemVariants}
                  >
                    {group.year}
                  </m.div>
                  <ul className="mt-2 space-y-0.5">
                    {group.items.map((child) => (
                      <m.li key={child.id} variants={itemVariants}>
                        <Link
                          className="group flex items-center gap-4 rounded-md px-2 py-1.5 transition-colors hover:bg-neutral-10/4"
                          href={routeBuilder(Routes.Note, {
                            ...getNoteRouteParams(child),
                          })}
                        >
                          <span className="w-12 shrink-0 text-copy-13 tabular-nums text-neutral-10/55 transition-colors group-hover:text-neutral-10/80">
                            {formatMMDD(child.createdAt)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-copy-14 text-neutral-10/85 transition-colors group-hover:text-neutral-10">
                            {child.title}
                          </span>
                        </Link>
                      </m.li>
                    ))}
                  </ul>
                </div>
              ))}
              {hasNextPage && (
                <LoadMoreIndicator className="mt-6" onLoading={fetchNextPage}>
                  <Loading />
                </LoadMoreIndicator>
              )}
            </m.div>
          )}
        </section>
      </article>
    </BottomToUpSoftScaleTransitionView>
  )
}

const TopicHero = ({
  description,
  introduce,
  lastUpdatedAt,
  name,
  onToggleSort,
  sortAsc,
  topic,
  total,
}: {
  description?: string
  introduce: string | null
  lastUpdatedAt: string | Date | null
  name: string
  onToggleSort: () => void
  sortAsc: boolean
  topic: TopicModel
  total: number
}) => {
  const t = useTranslations('note')

  return (
    <header className="relative px-1 pt-6 lg:px-2 lg:pt-10">
      <div className="flex items-start gap-4 lg:gap-5">
        <NoteTopicAvatar
          alt={t('topic_avatar_alt', { name })}
          className="ring-1 ring-black/5"
          icon={topic.icon}
          name={name}
          rounded={14}
          size={56}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="m-0 break-words text-title-24 font-semibold leading-tight text-neutral-10 lg:text-title-28">
            {name}
          </h1>
          {introduce && (
            <div className="mt-2 break-words text-copy-13 text-neutral-10/70 lg:text-copy-14 [&_p]:m-0">
              <NoteTopicMarkdownRender>{introduce}</NoteTopicMarkdownRender>
            </div>
          )}
          {description && (
            <div className="mt-3 break-words text-copy-13 leading-7 text-neutral-7 [&_p]:m-0 [&_p+p]:mt-2">
              <NoteTopicMarkdownRender>{description}</NoteTopicMarkdownRender>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-label-12 text-neutral-7">
            <div className="flex items-center gap-1.5">
              <span>{t('topic_total_notes', { total })}</span>
              {lastUpdatedAt && (
                <>
                  <span className="text-neutral-7/50">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span>{t('topic_recent_update')}</span>
                    <RelativeTime
                      date={lastUpdatedAt}
                      displayAbsoluteTimeAfterDay={Infinity}
                    />
                  </span>
                </>
              )}
            </div>
            <button
              className="inline-flex size-7 shrink-0 items-center justify-center rounded text-neutral-7 transition-colors hover:bg-neutral-10/6 hover:text-neutral-10"
              type="button"
              aria-label={
                sortAsc ? t('topic_sort_newest') : t('topic_sort_oldest')
              }
              onClick={onToggleSort}
            >
              <i
                className={clsxm(
                  'text-copy-13',
                  sortAsc
                    ? 'i-mingcute-sort-ascending-line'
                    : 'i-mingcute-sort-descending-line',
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

const SKELETON_WIDTHS = ['58%', '72%', '64%', '80%']

const ListSkeleton = () => (
  <div className="mt-6">
    <div className="h-3 w-12 animate-pulse rounded bg-neutral-10/8" />
    <ul className="mt-3 space-y-2">
      {SKELETON_WIDTHS.map((width) => (
        <li className="flex items-center gap-4 px-2 py-1.5" key={width}>
          <span className="h-4 w-12 shrink-0 animate-pulse rounded bg-neutral-10/8" />
          <span
            className="h-4 animate-pulse rounded bg-neutral-10/8"
            style={{ width }}
          />
        </li>
      ))}
    </ul>
  </div>
)

const groupByYear = (items: NoteModel[], asc: boolean) => {
  const map = new Map<number, NoteModel[]>()
  for (const item of items) {
    const year = new Date(item.createdAt).getFullYear()
    if (!map.has(year)) map.set(year, [])
    map.get(year)!.push(item)
  }
  const years = [...map.keys()].sort((a, b) => (asc ? a - b : b - a))
  return years.map((year) => ({ year, items: map.get(year)! }))
}

const formatMMDD = (date: string | Date) =>
  Intl.DateTimeFormat('en-us', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
