'use client'

import type { TimelineData } from '@mx-space/api-client'
import { TimelineType } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { NormalContainer } from '~/components/layout/container/Normal'
import { openSearchPanel } from '~/components/modules/shared/SearchPanel'
import { TimelineDense } from '~/components/modules/timeline/TimelineDense'
import { TimelineProgress } from '~/components/modules/timeline/TimelineProgress'
import { TimelineRelaxed } from '~/components/modules/timeline/TimelineRelaxed'
import { TimelineSkim } from '~/components/modules/timeline/TimelineSkim'
import { TimelineViewToggle } from '~/components/modules/timeline/TimelineViewToggle'
import type {
  TimelineEntry,
  TimelineView,
} from '~/components/modules/timeline/types'
import {
  TIMELINE_VIEW_STORAGE_KEY,
  TIMELINE_VIEWS,
  TimelineEntryType,
} from '~/components/modules/timeline/types'
import { groupByYearMonth } from '~/components/modules/timeline/utils'
import { BackToTop } from '~/components/ui/back-to-top/BackToTop'
import { MotionButtonBase } from '~/components/ui/button'
import { useRouter } from '~/i18n/navigation'
import { buildNotePath } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { springScrollToElement } from '~/lib/scroller'

const TimelineSearchButton = () => {
  const t = useTranslations('common')
  const isMobile = useIsMobile()
  const router = useRouter()

  return (
    <MotionButtonBase
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-copy-13 text-neutral-10/55 transition-colors duration-200 hover:bg-black/[0.02] hover:text-neutral-10/85 dark:hover:bg-white/4"
      onClick={isMobile ? () => router.push('/search') : openSearchPanel}
    >
      <i className="i-mingcute-search-line text-copy-14 opacity-70" />
      <span>{t('search_title')}</span>
    </MotionButtonBase>
  )
}

const useJumpTo = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const jumpToId = new URLSearchParams(location.search).get('selectId')

      if (!jumpToId) return

      const target = document.querySelector(
        `[data-id="${jumpToId}"]`,
      ) as HTMLElement

      if (!target) return

      target.classList.add('no-shadow')
      springScrollToElement(target, -500).then(() => {
        target.animate(
          [
            {
              backgroundColor: getComputedStyle(
                document.documentElement,
              ).getPropertyValue('accent-color'),
            },
            {
              backgroundColor: 'transparent',
            },
          ],
          {
            duration: 1500,
            easing: 'ease-in-out',
            fill: 'both',
            iterations: 1,
          },
        ).onfinish = () => target.classList.remove('no-shadow')
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [])
}

const isValidView = (v: string | null): v is TimelineView =>
  TIMELINE_VIEWS.includes(v as TimelineView)

const useTimelineView = (): [TimelineView, (next: TimelineView) => void] => {
  const search = useSearchParams()
  const urlView = search.get('view')
  const [stored, setStored] = useState<TimelineView>('relaxed')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMELINE_VIEW_STORAGE_KEY)
      if (isValidView(saved)) setStored(saved)
    } catch {
      // ignore
    }
  }, [])

  const current: TimelineView = isValidView(urlView) ? urlView : stored

  const setView = useCallback((next: TimelineView) => {
    try {
      localStorage.setItem(TIMELINE_VIEW_STORAGE_KEY, next)
    } catch {
      // ignore
    }
    setStored(next)
    const url = new URL(window.location.href)
    if (next === 'relaxed') {
      url.searchParams.delete('view')
    } else {
      url.searchParams.set('view', next)
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }, [])

  return [current, setView]
}

export default function TimelinePage() {
  const t = useTranslations('home')
  const locale = useLocale()
  const search = useSearchParams()
  const router = useRouter()

  const year = search.get('year')
  const type = search.get('type') as 'post' | 'note'
  const nextType = {
    post: TimelineType.Post,
    note: TimelineType.Note,
  }[type]

  const { data } = useQuery<TimelineData>({
    queryKey: ['timeline', nextType, year, locale],
    queryFn: async ({ queryKey }) => {
      const [, nextType, year] = queryKey as [string, TimelineType, string]
      return await apiClient.aggregate.getTimeline({
        type: nextType,
        year: +(year || 0) || undefined,
      })
    },
  })

  useJumpTo()

  const [view, setView] = useTimelineView()
  const pendingAnchorRef = useRef<string | null>(null)

  useEffect(() => {
    if (view !== 'relaxed') return
    const anchor = pendingAnchorRef.current
    if (!anchor) return
    pendingAnchorRef.current = null
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-tl-anchor="${anchor}"]`,
      )
      if (el) void springScrollToElement(el, -80)
    })
  }, [view])

  const memory = search.get('bookmark') || search.get('memory')
  const title = !memory ? t('timeline_page_title') : t('timeline_memory')

  const onBookmarkClick = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('memory', 'true')
    router.push(url.href)
  }, [router])

  const entries = useMemo<TimelineEntry[]>(() => {
    if (!data) return []
    const { posts = [], notes = [] } = data
    const list: TimelineEntry[] = []

    if (!memory) {
      for (const post of posts) {
        list.push({
          title: post.title,
          meta: [post.category.name, t('timeline_post')],
          date: new Date(post.createdAt),
          href: `/posts/${post.category.slug}/${post.slug}`,
          type: TimelineEntryType.Post,
          id: post.id,
        })
      }
    }

    for (const note of notes.filter((n) => (memory ? n.bookmark : true))) {
      const meta = [
        note.mood ? t('timeline_mood', { mood: note.mood }) : undefined,
        note.weather
          ? t('timeline_weather', { weather: note.weather })
          : undefined,
        t('timeline_note'),
      ].filter(Boolean) as string[]

      list.push({
        title: note.title,
        meta,
        date: new Date(note.createdAt),
        href: buildNotePath(note),
        type: TimelineEntryType.Note,
        id: note.id,
        important: note.bookmark,
      })
    }

    return list
  }, [data, memory, t])

  const grouped = useMemo(() => groupByYearMonth(entries), [entries])

  const yearTotal = useMemo(() => {
    const m = new Map<number, number>()
    grouped.forEach((yearBucket, y) => {
      let sum = 0
      yearBucket.forEach((list) => {
        sum += list.length
      })
      m.set(y, sum)
    })
    return m
  }, [grouped])

  const totalCount = useMemo(() => entries.length, [entries])

  const yearCountSuffix = useCallback(
    (count: number) => t('timeline_year_total', { count }),
    [t],
  )

  const handleMonthJump = useCallback(
    (year: number, month: number) => {
      pendingAnchorRef.current = `${year}-${month}`
      setView('relaxed')
    },
    [setView],
  )

  if (!data) return null

  return (
    <NormalContainer>
      <header className="mb-12">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-copy-13 tracking-widest text-neutral-10/70 uppercase">
            {title}
          </span>
          <div className="flex items-center gap-3">
            {!memory && <TimelineViewToggle value={view} onChange={setView} />}
            <TimelineSearchButton />
          </div>
        </div>

        <div className="mb-6 flex items-baseline gap-4">
          <span className="text-[4.5rem] leading-none font-extralight tracking-tighter text-neutral-10/85">
            {totalCount}
          </span>
          <span className="text-copy-14 text-neutral-10/80">
            {t('timeline_posts')}
            {!memory ? t('timeline_keep_going') : t('timeline_look_back')}
          </span>
        </div>

        {!memory && (
          <>
            <TimelineProgress />
            <p className="mt-4 text-copy-13 text-neutral-10/65">
              {t('timeline_live_present')}
            </p>
          </>
        )}
      </header>

      <main className="text-neutral-10/90" key={`${type ?? 'all'}-${view}`}>
        {view === 'relaxed' && (
          <TimelineRelaxed
            grouped={grouped}
            yearCountSuffix={yearCountSuffix}
            yearTotal={yearTotal}
            onBookmarkClick={onBookmarkClick}
          />
        )}
        {view === 'dense' && (
          <TimelineDense
            grouped={grouped}
            yearCountSuffix={yearCountSuffix}
            yearTotal={yearTotal}
            onBookmarkClick={onBookmarkClick}
          />
        )}
        {view === 'skim' && (
          <TimelineSkim
            grouped={grouped}
            yearCountSuffix={yearCountSuffix}
            yearTotal={yearTotal}
            onMonthClick={handleMonthJump}
          />
        )}
      </main>
      <BackToTop />
    </NormalContainer>
  )
}
