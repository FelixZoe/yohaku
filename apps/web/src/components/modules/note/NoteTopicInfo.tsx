'use client'

import type { NoteModel, PaginateResult } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { memo, useId, useMemo, useState } from 'react'

import { Link } from '~/i18n/navigation'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

import { NoteTimelineItem } from './NoteTimelineItem'

const HairlineDivider: FC = () => (
  <hr className="my-3 ml-0 w-3/5 border-0 border-t border-dashed border-neutral-4" />
)

export const NoteTopicInfo = memo(() => {
  const topic = useCurrentNoteDataSelector((data) => data?.data.topic)
  const noteId = useCurrentNoteDataSelector((data) => data?.data.id)
  const locale = useLocale()
  const t = useTranslations('note')
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()

  const topicId = topic?.id
  const {
    data: topicNotes,
    isError,
    isLoading,
  } = useQuery({
    queryKey: topicId
      ? [`topic-sidebar-${topicId}`, locale]
      : ['topic-sidebar-empty'],
    enabled: !!topicId,
    queryFn: () =>
      apiClient.note.proxy.topics(topicId!).get<PaginateResult<NoteModel>>({
        params: {
          page: 1,
          size: 6,
          sortBy: 'createdAt',
          sortOrder: -1,
          lang: locale,
        },
      }),
  })

  const total = topicNotes?.pagination?.total ?? 0

  const filteredNotes = useMemo(() => {
    if (!topicNotes) return null
    return topicNotes.data.filter((item) => item.id !== noteId).slice(0, 5)
  }, [noteId, topicNotes])
  const hasRelatedNotes = !!filteredNotes?.length
  const canExpand = isLoading || hasRelatedNotes
  const totalLabel = isLoading || isError ? '–' : total

  if (!topic) return null

  return (
    <>
      <HairlineDivider />
      {canExpand ? (
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between text-copy-13 font-medium leading-tight text-neutral-8 transition-colors hover:text-neutral-9"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          <TopicLabel name={topic.name} total={totalLabel} />
          <m.i
            animate={{ rotate: expanded ? 180 : 0 }}
            aria-hidden="true"
            className="i-mingcute-down-line shrink-0 text-label-12 text-neutral-5"
            transition={{ duration: 0.2 }}
          />
        </button>
      ) : (
        <Link
          className="flex w-full items-center justify-between text-copy-13 font-medium leading-tight text-neutral-8 transition-colors hover:text-neutral-9"
          href={routeBuilder(Routes.NoteTopic, { slug: topic.slug })}
        >
          <TopicLabel name={topic.name} total={totalLabel} />
          <i
            aria-hidden="true"
            className="i-mingcute-arrow-right-up-line shrink-0 text-label-12 text-neutral-5"
          />
        </Link>
      )}

      <AnimatePresence initial={false}>
        {canExpand && expanded && (
          <m.div
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="mt-2">
              {filteredNotes?.map((item) => (
                <NoteTimelineItem
                  active={false}
                  createdAt={item.createdAt}
                  key={item.id}
                  nid={item.nid}
                  slug={item.slug}
                  title={item.title}
                  variant="muted"
                />
              ))}
            </ul>
            <Link
              className="mt-2 inline-block text-label-12 text-neutral-5 transition-colors hover:text-neutral-7"
              href={routeBuilder(Routes.NoteTopic, { slug: topic.slug })}
            >
              {t('topic_view_all', { total })}
            </Link>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
})

NoteTopicInfo.displayName = 'NoteTopicInfo'

const TopicLabel: FC<{ name: string; total: number | string }> = ({
  name,
  total,
}) => (
  <span className="truncate">
    {name}
    <span className="text-neutral-5"> · {total}</span>
  </span>
)
