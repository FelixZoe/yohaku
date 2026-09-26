'use client'

import type {
  NoteModel,
  PaginateResult,
  TopicModel,
} from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { Loading } from '~/components/ui/loading'
import { RelativeTime } from '~/components/ui/relative-time'
import { useIsClient } from '~/hooks/common/use-is-client'
import { Link } from '~/i18n/navigation'
import { getNoteRouteParams } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

import { NoteTopicAvatar } from './NoteTopicAvatar'
import { NoteTopicMarkdownRender } from './NoteTopicMarkdownRender'

export const NoteTopicDetail: FC<{ topic: TopicModel }> = (props) => {
  const { topic } = props
  const { id: topicId } = topic
  const locale = useLocale()
  const t = useTranslations('note')

  const { data, isLoading } = useQuery({
    queryKey: [`topic-${topicId}`, locale],
    queryFn: () =>
      apiClient.note.proxy.topics(topicId).get<PaginateResult<NoteModel>>({
        params: {
          page: 1,
          size: 1,
          sortBy: 'createdAt',
          sortOrder: -1,
          lang: locale,
        },
      }),
  })

  const isMobile = useIsMobile()
  const isClient = useIsClient()
  if (!isClient) return null

  const recent = data?.data[0]
  const total = data?.pagination?.total ?? 0

  return (
    <div
      className={
        isMobile ? 'flex w-full min-w-0 flex-col' : 'flex w-[360px] flex-col'
      }
    >
      <Link
        className="group mb-1 flex min-w-0 items-center gap-2.5"
        href={routeBuilder(Routes.NoteTopic, {
          slug: topic.slug,
        })}
      >
        <NoteTopicAvatar
          alt={t('topic_avatar_alt', { name: topic.name })}
          className="ring-1 ring-border"
          icon={topic.icon}
          name={topic.name}
          size={32}
        />
        <h1 className="m-0! flex min-w-0 flex-1 items-center gap-1.5 text-copy-14 font-medium leading-tight">
          <span className="min-w-0 truncate">{topic.name}</span>
          <i className="i-mingcute-arrow-right-up-line shrink-0 text-label-12 text-neutral-6 transition-colors group-hover:text-neutral-8" />
        </h1>
      </Link>

      <div className="line-clamp-2 break-all text-copy-13 leading-relaxed text-neutral-7 [&>div]:leading-relaxed">
        <NoteTopicMarkdownRender>{topic.introduce}</NoteTopicMarkdownRender>
      </div>

      {topic.description && (
        <div className="mt-2.5 text-copy-13 text-neutral-7 [&>div]:leading-[1.7]">
          <NoteTopicMarkdownRender>{topic.description}</NoteTopicMarkdownRender>
        </div>
      )}

      <hr className="my-3 ml-0 w-full border-0 border-t border-dashed border-neutral-4" />

      {isLoading ? (
        <Loading className="my-2" />
      ) : (
        <>
          {recent && (
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-label-12 leading-[1.6] text-neutral-6">
              <span className="text-neutral-7">{t('topic_recent_update')}</span>
              <Link
                className="min-w-0 truncate text-neutral-8 transition-colors hover:text-neutral-9"
                href={routeBuilder(Routes.Note, {
                  ...getNoteRouteParams(recent),
                })}
              >
                「{recent.title}」
              </Link>
              <span className="text-neutral-5">·</span>
              <RelativeTime
                date={recent.modifiedAt || recent.createdAt}
                displayAbsoluteTimeAfterDay={Infinity}
              />
            </p>
          )}
          <p className="text-label-12 leading-[1.6] text-neutral-6">
            {t('topic_total_notes', { total })}
          </p>
        </>
      )}
    </div>
  )
}

export const ToTopicLink: FC = () => {
  const topic = useCurrentNoteDataSelector((data) => data?.data.topic)
  if (!topic) return null
  return (
    <Link
      href={routeBuilder(Routes.NoteTopic, {
        slug: topic.slug,
      })}
    >
      <span className="grow truncate opacity-80 hover:opacity-100">
        {topic.name}
      </span>
    </Link>
  )
}
