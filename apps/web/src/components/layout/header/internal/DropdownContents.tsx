'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import type { AggregateTop } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useDeferredValue, useState } from 'react'

import { useActivity } from '~/atoms/hooks/activity'
import { useOwnerStatus } from '~/atoms/hooks/status'
import { liveDeskAtom } from '~/atoms/live-desk'
import { getServerTime } from '~/components/common/SyncServerTime'
import { EmptyIcon } from '~/components/icons/empty'
import {
  isSupportIcon,
  socialIconSet,
} from '~/components/modules/home/SocialIcon'
import { FloatPopover } from '~/components/ui/float-popover'
import { RelativeTime } from '~/components/ui/relative-time/RelativeTime'
import { Link } from '~/i18n/navigation'
import {
  emptyActivityAssets,
  fetchActivityAssets,
  resolveActivityAppIconURL,
} from '~/lib/activity-assets'
import { createLiveDeskPresentation } from '~/lib/live-desk/presentation'
import { buildNotePath } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import {
  useAggregationSelector,
  useAppConfigSelector,
} from '~/providers/root/aggregation-data-provider'
import { navigation } from '~/queries/definition/navigation'

import type { IHeaderMenu } from '../config'
import { useHeaderConfigValue } from './HeaderDataConfigureProvider'

interface DropdownProps {
  section: IHeaderMenu
}

// === Home: Mega panel — owner card + pages grid + site stats ===
const HomeDropdownContent: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const locale = useLocale()
  const [renderedAt] = useState(() => Date.now())
  const avatar = useAggregationSelector((data) => data.user.avatar)
  const ownerName = useAggregationSelector((data) => data.user.name)
  const socialIds = useAggregationSelector((data) => data.user.socialIds)
  const ownerStatus = useOwnerStatus()
  const activity = useActivity()
  const deferredProcess = useDeferredValue(activity.process)
  const deferredMedia = useDeferredValue(activity.media)
  const liveDeskEnabled =
    useAppConfigSelector((config) => config.module.liveDesk.enable) === true
  const liveDeskState = useAtomValue(liveDeskAtom)
  const liveDeskPresentation = createLiveDeskPresentation(
    liveDeskState,
    getServerTime().getTime(),
  )
  const liveDeskIsActive = liveDeskState.phase === 'active'
  const {
    data: activityAssets = [
      emptyActivityAssets.appIcon,
      emptyActivityAssets.appDescription,
    ],
  } = useQuery({
    queryKey: ['app-icon', 'app-desc'],
    queryFn: fetchActivityAssets,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const liveDeskApplication = liveDeskPresentation.visible
    ? liveDeskPresentation.application
    : null
  const liveDeskMedia = liveDeskPresentation.visible
    ? liveDeskPresentation.media
    : null
  const applicationName = liveDeskEnabled
    ? liveDeskApplication?.displayName
    : deferredProcess?.name
  const applicationIconURL = liveDeskEnabled
    ? resolveActivityAppIconURL(
        liveDeskApplication?.displayName,
        liveDeskApplication?.iconURL,
        activityAssets[0],
      )
    : deferredProcess?.iconUrl ||
      (deferredProcess?.iconBase64
        ? `data:image/png;base64,${deferredProcess.iconBase64}`
        : null)
  const mediaTitle = liveDeskEnabled
    ? liveDeskMedia?.title ||
      liveDeskMedia?.artist ||
      liveDeskMedia?.playerDisplayName
    : deferredMedia?.title
  const mediaByline = liveDeskEnabled
    ? liveDeskMedia?.title
      ? liveDeskMedia.artist
      : liveDeskMedia?.album
    : deferredMedia?.artist
  const pages = section.subMenu || []

  const socialEntries = (
    Object.entries(socialIds || {}) as [string, string | number][]
  )
    .filter(([type]) => isSupportIcon(type))
    .slice(0, 5)

  const { data: siteInfo } = useQuery({
    queryKey: ['site-info', locale],
    queryFn: () =>
      apiClient.aggregate.proxy.site_info.get<{
        postCount: number
        noteCount: number
        totalWordCount: number
        firstPublishDate: string | null
      }>(),
    staleTime: 5 * 60 * 1000,
  })

  const articleCount = (siteInfo?.postCount ?? 0) + (siteInfo?.noteCount ?? 0)
  const wordCountDisplay = siteInfo?.totalWordCount
    ? locale === 'en'
      ? Math.round(siteInfo.totalWordCount / 1000)
      : Math.round(siteInfo.totalWordCount / 10000)
    : 0
  const days = siteInfo?.firstPublishDate
    ? Math.floor(
        (renderedAt - new Date(siteInfo.firstPublishDate).getTime()) / 86400000,
      )
    : 0

  const stats: { value: number; label: string }[] = [
    { value: articleCount, label: t('nav_dropdown_stat_articles') },
    { value: wordCountDisplay, label: t('nav_dropdown_stat_words') },
    { value: days, label: t('nav_dropdown_stat_days') },
  ]

  const hasPages = pages.length > 0
  const hasStats = !!siteInfo

  return (
    <div className={hasPages ? 'w-[540px] p-3' : 'w-[280px] p-3'}>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: hasPages ? '180px minmax(0,1fr)' : '1fr',
        }}
      >
        {/* Left: Owner card — identity + stats + activity + socials */}
        <div className="flex flex-col gap-2.5 p-2">
          {avatar && (
            <Image
              alt={ownerName ?? t('aria_site_owner_avatar')}
              className="shrink-0 rounded-full ring-1 ring-neutral-3"
              height={42}
              src={avatar}
              width={42}
            />
          )}
          <div className="min-w-0">
            <div className="text-copy-13 font-medium">{ownerName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-label-12 text-neutral-7">
              {ownerStatus ? (
                <>
                  <span>{ownerStatus.emoji}</span>
                  <span className="truncate">{ownerStatus.desc}</span>
                </>
              ) : liveDeskEnabled ? (
                <>
                  <span
                    className={
                      liveDeskIsActive
                        ? 'inline-block size-1.5 shrink-0 rounded-full bg-green-400'
                        : 'inline-block size-1.5 shrink-0 rounded-full bg-neutral-5'
                    }
                  />
                  <span className="text-neutral-6">
                    {t(
                      liveDeskIsActive
                        ? 'nav_dropdown_online'
                        : 'nav_dropdown_quiet',
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block size-1.5 shrink-0 rounded-full bg-green-400" />
                  <span className="text-neutral-6">
                    {t('nav_dropdown_online')}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3.5">
            {hasStats
              ? stats.map((s) => (
                  <div className="flex flex-col gap-0.5" key={s.label}>
                    <span className="font-mono text-copy-15 leading-none tabular-nums text-neutral-9">
                      {s.value}
                    </span>
                    <span className="text-caption-10 uppercase tracking-wider text-neutral-6">
                      {s.label}
                    </span>
                  </div>
                ))
              : [0, 1, 2].map((i) => (
                  <div className="flex flex-col gap-1" key={i}>
                    <div className="h-[13px] w-8 animate-pulse rounded bg-neutral-3/60" />
                    <div className="h-[9px] w-6 animate-pulse rounded bg-neutral-3/40" />
                  </div>
                ))}
          </div>

          {(applicationName || mediaTitle) && (
            <div className="flex flex-col gap-1 border-t border-neutral-4/40 pt-2 text-label-12 text-neutral-7">
              {applicationName && (
                <div className="flex items-center gap-1.5">
                  {applicationIconURL ? (
                    <img
                      alt=""
                      className="size-3.5 shrink-0 rounded-sm object-contain"
                      src={applicationIconURL}
                    />
                  ) : (
                    <i className="i-mingcute-window-line shrink-0 text-copy-13 text-neutral-6" />
                  )}
                  <span className="truncate">{applicationName}</span>
                </div>
              )}
              {mediaTitle && (
                <div className="flex items-center gap-1.5">
                  <i className="i-mingcute-music-2-line shrink-0 text-copy-13 text-neutral-6" />
                  <span className="truncate">
                    {mediaTitle}
                    {mediaByline ? (
                      <span className="text-neutral-6">
                        {' · '}
                        {mediaByline}
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
            </div>
          )}

          {socialEntries.length > 0 && (
            <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-neutral-4/40 pt-2">
              {socialEntries.map(([type, id]) => {
                const entry = socialIconSet[type]
                if (!entry) return null
                const [name, Icon, color, hrefFn] = entry
                return (
                  <FloatPopover
                    key={type}
                    type="tooltip"
                    triggerElement={
                      <a
                        aria-label={name}
                        className="center group flex size-6 rounded text-neutral-6 transition-colors hover:text-[var(--social-color)]"
                        href={hrefFn(String(id))}
                        rel="noreferrer"
                        target="_blank"
                        style={
                          { '--social-color': color } as React.CSSProperties
                        }
                      >
                        <span className="flex items-center justify-center [&_svg]:size-3.5 [&_i]:text-copy-13">
                          {Icon}
                        </span>
                      </a>
                    }
                  >
                    {name}
                  </FloatPopover>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Pages grid */}
        {hasPages && (
          <div className="min-w-0">
            <div className="mb-2 px-1 text-caption-10 font-medium uppercase tracking-wider text-neutral-6">
              {t('nav_dropdown_pages')}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {pages.map((page) => (
                <NavigationMenu.Link
                  closeOnClick
                  className="truncate rounded px-2 py-1.5 text-copy-13 text-neutral-8 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9"
                  key={page.path}
                  render={<Link href={page.path} />}
                >
                  {page.title}
                </NavigationMenu.Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const formatMonthDay = (date: string | Date) => {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}·${pad(d.getDate())}`
}

const RecentIndexLink: FC<{
  date: string | Date
  href: string
  title: string
}> = ({ date, href, title }) => (
  <NavigationMenu.Link
    closeOnClick
    className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-2 rounded px-2 py-1.5 text-neutral-8 transition hover:bg-black/[0.02] hover:text-neutral-9 dark:hover:bg-white/[0.04]"
    render={<Link href={href} />}
  >
    <time
      className="font-mono text-label-12 tabular-nums text-neutral-6"
      dateTime={new Date(date).toISOString()}
    >
      {formatMonthDay(date)}
    </time>
    <span className="line-clamp-2 break-words text-copy-13 leading-snug [word-break:normal]">
      {title}
    </span>
  </NavigationMenu.Link>
)

// === Post: Categories with counts + hover preview ===
const PostsDropdownContent: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const locale = useLocale()
  const categories = useHeaderConfigValue('categoriesAtom')
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const activeSlug = hoveredSlug || categories?.[0]?.slug || null

  const { data: postMenuData } = useQuery({
    ...navigation.posts(locale, activeSlug),
    enabled: !!activeSlug,
  })

  const recentPosts = postMenuData?.recentPosts

  return (
    <div className="w-[520px] p-3">
      <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3">
        {/* Left: Categories */}
        <div>
          <div className="mb-2 text-caption-10 font-medium uppercase tracking-wider text-neutral-6">
            {t('nav_dropdown_categories')}
          </div>
          <div className="flex flex-col gap-0.5">
            {categories?.map((cat) => (
              <NavigationMenu.Link
                closeOnClick
                className="flex items-center justify-between rounded px-2.5 py-1.5 text-copy-13 transition data-[hovered]:bg-black/[0.02] dark:data-[hovered]:bg-white/[0.04] data-[hovered]:text-neutral-9"
                data-hovered={activeSlug === cat.slug ? '' : undefined}
                key={cat.slug}
                render={<Link href={`/categories/${cat.slug}`} />}
                onMouseEnter={() => setHoveredSlug(cat.slug)}
              >
                <span>{cat.name}</span>
                <span className="text-label-12 text-neutral-6">
                  {cat.count}
                </span>
              </NavigationMenu.Link>
            ))}
          </div>
        </div>

        {/* Right: Recent posts */}
        <div className="min-w-0 border-l border-neutral-4/40 pl-3">
          <div className="mb-2 px-2 text-caption-10 font-medium uppercase tracking-wider text-neutral-6">
            {categories?.find((c) => c.slug === activeSlug)?.name}
            {t('nav_dropdown_recent_suffix')}
          </div>
          <div className="flex flex-col gap-0.5">
            {recentPosts?.map((post) => (
              <RecentIndexLink
                date={post.createdAt}
                href={`/posts/${activeSlug}/${post.slug}`}
                key={post.id}
                title={post.title}
              />
            ))}
            {!recentPosts?.length && (
              <div className="py-4 text-center text-label-12 text-neutral-6">
                ...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 border-t border-neutral-4/60 pt-2">
        <NavigationMenu.Link
          closeOnClick
          className="flex items-center justify-between text-label-12 text-neutral-7 transition hover:text-neutral-9"
          render={<Link href={section.path} onClick={section.do} />}
        >
          <span>{t('nav_dropdown_view_all_posts')}</span>
          <span>
            {t('nav_dropdown_posts_count', {
              count: categories?.reduce((sum, c) => sum + c.count, 0) ?? 0,
            })}
          </span>
        </NavigationMenu.Link>
      </div>
    </div>
  )
}

// === Notes: Topics + recent notes (two columns) ===
const NotesDropdownContent: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const topics = useHeaderConfigValue('topicsAtom')
  const recentNotes = useHeaderConfigValue('recentNotesAtom')

  return (
    <div className="w-[520px] p-3">
      <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3">
        {/* Left: Topics */}
        <div>
          <div className="mb-2 text-caption-10 font-medium uppercase tracking-wider text-neutral-6">
            {t('nav_topics')}
          </div>
          {topics && topics.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {topics.map((topic) => (
                <NavigationMenu.Link
                  closeOnClick
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-copy-13 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9"
                  key={topic.slug}
                  render={<Link href={`/notes/series/${topic.slug}`} />}
                >
                  {topic.icon && (
                    <img
                      alt=""
                      className="size-4 shrink-0 rounded object-cover"
                      src={topic.icon}
                    />
                  )}
                  <span className="truncate">{topic.name}</span>
                </NavigationMenu.Link>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-label-12 text-neutral-6">
              ...
            </div>
          )}
        </div>

        {/* Right: Recent notes */}
        <div className="min-w-0 border-l border-neutral-4/40 pl-3">
          <div className="mb-2 px-2 text-caption-10 font-medium uppercase tracking-wider text-neutral-6">
            {t('nav_dropdown_recent_notes')}
          </div>
          <div className="flex flex-col gap-0.5">
            {recentNotes?.map((note) => (
              <RecentIndexLink
                date={note.createdAt}
                href={buildNotePath(note)}
                key={note.nid}
                title={note.title}
              />
            ))}
            {!recentNotes?.length && (
              <div className="py-4 text-center text-label-12 text-neutral-6">
                ...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-neutral-4/60 pt-2">
        <NavigationMenu.Link
          closeOnClick
          className="text-label-12 text-neutral-7 transition hover:text-neutral-9"
          render={<Link href={section.path} />}
        >
          {t('nav_dropdown_view_all_notes')}
        </NavigationMenu.Link>
        <NavigationMenu.Link
          closeOnClick
          className="text-label-12 text-neutral-7 transition hover:text-neutral-9"
          render={<Link href="/notes/series" />}
        >
          {t('nav_dropdown_view_all_topics')}
        </NavigationMenu.Link>
      </div>
    </div>
  )
}

// === Timeline: Category list + recent entries ===
const TimelineDropdownContent: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const items = section.subMenu || []
  const topData = useHeaderConfigValue('topDataAtom')

  const recentEntries = mergeAndSortTopEntries(topData)

  return (
    <div className="w-[320px] p-2.5">
      {/* Top: subMenu items horizontal */}
      <div className="flex gap-1">
        {items.map((item) => {
          const isExternal = item.path.startsWith('http')
          return (
            <NavigationMenu.Link
              closeOnClick
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded px-3 py-2 text-copy-13 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9"
              key={item.path}
              render={
                isExternal ? (
                  <a
                    href={item.path}
                    rel="noopener noreferrer"
                    target="_blank"
                  />
                ) : (
                  <Link href={item.path} />
                )
              }
            >
              {!!item.icon && (
                <span className="flex shrink-0 items-center justify-center text-copy-13 opacity-70">
                  {item.icon}
                </span>
              )}
              <span>
                {item.titleKey ? t(item.titleKey as any) : item.title}
              </span>
            </NavigationMenu.Link>
          )
        })}
      </div>

      {/* Bottom: recent entries */}
      <div className="mt-2 border-t border-neutral-4/60 pt-2">
        <div className="mb-1.5 text-caption-10 font-medium uppercase tracking-wider text-neutral-6">
          {t('nav_dropdown_recent_activity')}
        </div>
        <div className="flex flex-col gap-1">
          {recentEntries.map((entry) => (
            <NavigationMenu.Link
              closeOnClick
              className="rounded bg-neutral-2/60 px-2.5 py-2 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:text-neutral-9"
              key={entry.id}
              render={<Link href={entry.href} />}
            >
              <div className="flex items-center justify-between">
                <div className="truncate text-copy-13 leading-snug">
                  {entry.title}
                </div>
                <span className="ml-2 shrink-0 text-label-12 text-neutral-6">
                  {entry.type === 'post' ? t('nav_posts') : t('nav_notes')}
                </span>
              </div>
              <div className="mt-0.5 text-label-12 text-neutral-6">
                <RelativeTime date={entry.createdAt} />
              </div>
            </NavigationMenu.Link>
          ))}
          {recentEntries.length === 0 && (
            <div className="flex flex-col items-center gap-5 py-4 text-center text-label-12 text-neutral-6">
              <div className="scale-[0.9] text-neutral-8 dark:text-neutral-3">
                <EmptyIcon />
              </div>
              <span>{t('empty_nothing')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TimelineEntry {
  createdAt: string
  href: string
  id: string
  title: string
  type: 'post' | 'note'
}

function mergeAndSortTopEntries(
  topData: AggregateTop | null | undefined,
): TimelineEntry[] {
  if (!topData) return []
  const entries: TimelineEntry[] = []

  for (const post of topData.posts ?? []) {
    entries.push({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt,
      href: `/posts/${post.category.slug}/${post.slug}`,
      type: 'post',
    })
  }
  for (const note of topData.notes ?? []) {
    entries.push({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      href: buildNotePath(note),
      type: 'note',
    })
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return entries.slice(0, 4)
}

// === More: Single column with descriptions ===
const MoreDropdownContent: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const items = section.subMenu || []

  return (
    <div className="p-2">
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isExternal = item.path.startsWith('http')
          return (
            <NavigationMenu.Link
              closeOnClick
              className="flex items-center gap-3 rounded px-3 py-2.5 text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
              key={item.path}
              render={
                isExternal ? (
                  <a
                    href={item.path}
                    rel="noopener noreferrer"
                    target="_blank"
                  />
                ) : (
                  <Link href={item.path} />
                )
              }
            >
              {!!item.icon && (
                <span className="flex w-5 shrink-0 items-center justify-center text-copy-14 opacity-70">
                  {item.icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-copy-13">
                  {item.titleKey ? t(item.titleKey as any) : item.title}
                </div>
                {(item.descriptionKey || item.description) && (
                  <div className="text-label-12 text-neutral-7">
                    {item.descriptionKey
                      ? t(item.descriptionKey as any)
                      : item.description}
                  </div>
                )}
              </div>
            </NavigationMenu.Link>
          )
        })}
      </div>
    </div>
  )
}

export const dropdownTypeMap: Record<string, FC<DropdownProps>> = {
  Home: HomeDropdownContent,
  Post: PostsDropdownContent,
  Note: NotesDropdownContent,
  Timeline: TimelineDropdownContent,
  More: MoreDropdownContent,
}
