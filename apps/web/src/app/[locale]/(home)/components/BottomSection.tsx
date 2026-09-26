'use client'

import type { RecentlyModel } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { RelativeTime } from '~/components/ui/relative-time'
import { Link } from '~/i18n/navigation'
import {
  companionMomentSummary,
  parseCompanionMomentMetadata,
} from '~/lib/companion-moment'
import { parseRecentlyContent } from '~/lib/enrichment/recently'
import { getNoteRouteParams } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'

import { SectionHeading } from './SectionHeading'

const useRecentlyData = (locale: string) =>
  useQuery({
    queryKey: ['recently', 'home', locale],
    queryFn: async () =>
      (await apiClient.recently.getList({ size: 20 })).$serialized,
    staleTime: 5 * 60 * 1000,
  })

const useRecentComments = (locale: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['home-activity-recent', locale],
    queryFn: async () =>
      (await apiClient.activity.getRecentActivities()).$serialized,
    refetchOnMount: true,
    meta: { persist: true },
  })
  const comments = useMemo(() => {
    if (!data?.comment) return []
    const seen = new Set<string>()
    const unique: typeof data.comment = []
    for (const c of data.comment) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      unique.push(c)
      if (unique.length >= 3) break
    }
    return unique
  }, [data])
  return { comments, isLoading }
}

type CommentItem = {
  createdAt: string
  author: string
  text: string
  id: string
  title: string
  slug?: string
  nid?: string
  type: string
  category?: { slug: string; name: string }
}

const Musings = ({
  musings,
  isLoading,
}: {
  musings: RecentlyModel[]
  isLoading: boolean
}) => {
  const t = useTranslations('home')

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div className="h-12 animate-pulse rounded bg-neutral-3" key={i} />
        ))}
      </div>
    )
  }

  if (!musings.length) return null

  return (
    <div className="flex flex-col gap-5">
      {musings.map((musing) => {
        const parsed = parseRecentlyContent(musing.content, musing.enrichments)
        const companionMoment = parseCompanionMomentMetadata(musing.metadata)
        const contextSummary = companionMoment
          ? companionMomentSummary(companionMoment)
          : ''
        return (
          <div className="border-l border-neutral-4 pl-[18px]" key={musing.id}>
            <div className="text-copy-14 leading-[1.9] text-neutral-7">
              {parsed.kind === 'enriched' ? (
                <>
                  {parsed.description !== null && (
                    <div className="whitespace-pre-line">
                      「{parsed.description}」
                    </div>
                  )}
                  <div
                    className={parsed.description !== null ? 'mt-1' : undefined}
                  >
                    {t(parsed.link.verbKey)}
                    {' 「'}
                    <a
                      className="yohaku-link--underline transition-colors hover:text-accent"
                      href={parsed.link.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {parsed.link.title}
                    </a>
                    {'」'}
                  </div>
                </>
              ) : (
                <>「{parsed.content || contextSummary}」</>
              )}
            </div>
            <div className="mt-1.5 text-label-12 text-neutral-6">
              <RelativeTime date={musing.createdAt} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Letters = ({
  comments,
  isLoading,
}: {
  comments: CommentItem[]
  isLoading: boolean
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="h-16 animate-pulse rounded bg-neutral-3" key={i} />
        ))}
      </div>
    )
  }

  if (!comments.length) return null

  return (
    <div>
      {comments.map((comment) => {
        const commentUrl =
          comment.type === 'notes' && comment.nid
            ? routeBuilder(
                Routes.Note,
                getNoteRouteParams({ nid: Number(comment.nid) }),
              )
            : comment.slug && comment.category?.slug
              ? routeBuilder(Routes.Post, {
                  category: comment.category.slug,
                  slug: comment.slug,
                })
              : undefined

        return (
          <div
            className="flex gap-3 border-b border-border py-3.5 first:pt-1 last:border-0 last:pb-0"
            key={comment.id}
          >
            <span
              aria-hidden
              className="mt-1 shrink-0 select-none font-serif text-title-28 leading-none text-neutral-4"
            >
              &ldquo;
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-copy-13 leading-[1.78] text-neutral-7">
                {comment.text}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3 text-label-12 text-neutral-6">
                {commentUrl && comment.title ? (
                  <Link
                    className="truncate transition-colors hover:text-accent"
                    href={commentUrl}
                  >
                    {comment.title}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="shrink-0 whitespace-nowrap">
                  &mdash; {comment.author}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const BottomSection = () => {
  const t = useTranslations('home')
  const locale = useLocale()
  const recentlyQuery = useRecentlyData(locale)
  const commentsQuery = useRecentComments(locale)

  const musings = useMemo(() => {
    if (!recentlyQuery.data?.length) return []
    const items = recentlyQuery.data as RecentlyModel[]
    return items.slice(0, 2)
  }, [recentlyQuery.data])

  const showMusings = musings.length > 0 || recentlyQuery.isLoading
  const showLetters =
    commentsQuery.comments.length > 0 || commentsQuery.isLoading

  if (!showMusings && !showLetters) return null

  return (
    <div className="flex flex-col">
      {showMusings && (
        <div>
          <SectionHeading eyebrow="musings">
            {t('second_musings')}
          </SectionHeading>
          <Musings isLoading={recentlyQuery.isLoading} musings={musings} />
        </div>
      )}

      {showMusings && showLetters && <div className="my-7 h-px bg-border" />}

      {showLetters && (
        <div>
          <SectionHeading eyebrow="letters">
            {t('second_letters')}
          </SectionHeading>
          <Letters
            comments={commentsQuery.comments}
            isLoading={commentsQuery.isLoading}
          />
        </div>
      )}
    </div>
  )
}
