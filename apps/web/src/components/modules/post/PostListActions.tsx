'use client'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'

import { useViewport } from '~/atoms/hooks/viewport'
import { MotionButtonBase } from '~/components/ui/button'
import { useModalStack } from '~/components/ui/modal'
import { useRouter } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { springScrollToTop } from '~/lib/scroller'
import { usePageScrollLocationSelector } from '~/providers/root/page-scroll-info-provider'

import { openSearchPanel } from '../shared/SearchPanel'
import { presentPostTagsModal } from './fab/PostTagsFAB'

const outlinedActionButtonClassName = [
  'group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-copy-13',
  'border-black/10 bg-transparent text-neutral-8 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'hover:border-black/15 hover:bg-black/[0.02] hover:text-neutral-9',
  'active:translate-y-px active:border-black/[0.18] active:bg-black/[0.04]',
  'dark:border-white/10 dark:hover:border-white/15 dark:hover:bg-white/4 dark:active:border-white/[0.18] dark:active:bg-white/6',
].join(' ')
const TOP_TAGS_LIMIT = 10

const useShouldShowBackToTop = () => {
  const windowHeight = useViewport((v) => v.h)

  return usePageScrollLocationSelector(
    (scrollTop) => scrollTop > windowHeight / 5,
    [windowHeight],
  )
}

const PostListActionButton = ({
  className,
  iconClassName,
  label,
  onClick,
  show = true,
  variant = 'outlined',
}: {
  className?: string
  iconClassName: string
  label: string
  onClick: () => void
  show?: boolean
  variant?: 'outlined' | 'plain' | 'compact'
}) => {
  if (!show) return null

  const buttonClassName =
    variant === 'plain'
      ? [
          'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-copy-13',
          'text-neutral-7 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'hover:bg-black/[0.02] hover:text-neutral-9',
          'active:translate-y-px active:bg-black/[0.04]',
          'dark:hover:bg-white/4 dark:active:bg-white/6',
        ].join(' ')
      : variant === 'compact'
        ? [
            'group inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-copy-13',
            'text-neutral-6 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:bg-black/[0.02] hover:text-neutral-9',
            'active:translate-y-px active:bg-black/[0.04]',
            'dark:hover:bg-white/4 dark:active:bg-white/6',
          ].join(' ')
        : outlinedActionButtonClassName

  return (
    <MotionButtonBase
      aria-label={label}
      className={clsxm(buttonClassName, className)}
      title={label}
      onClick={onClick}
    >
      <i
        className={clsxm(
          'shrink-0 text-copy-14 opacity-70 transition duration-200 group-hover:opacity-100',
          iconClassName,
        )}
      />
      <span className="min-w-0 truncate">{label}</span>
    </MotionButtonBase>
  )
}

const SearchMobileActionButton = () => {
  const t = useTranslations('common')
  const router = useRouter()

  return (
    <PostListActionButton
      className="w-full justify-center rounded-lg bg-black/[0.015] py-2 dark:bg-white/[0.03]"
      iconClassName="i-mingcute-search-line"
      label={t('search_title')}
      variant="compact"
      onClick={() => router.push('/search')}
    />
  )
}

const SearchAsideActionButton = () => {
  const t = useTranslations('common')

  return (
    <PostListActionButton
      iconClassName="i-mingcute-search-line"
      label={t('search_title')}
      variant="plain"
      onClick={openSearchPanel}
    />
  )
}

const AllTagsMobileActionButton = () => {
  const t = useTranslations('common')
  const { present } = useModalStack()

  return (
    <PostListActionButton
      className="w-full justify-center rounded-lg bg-black/[0.015] py-2 dark:bg-white/[0.03]"
      iconClassName="i-mingcute-hashtag-line"
      label={t('all_tags')}
      variant="compact"
      onClick={() => {
        presentPostTagsModal(present, t('tag_cloud'))
      }}
    />
  )
}

const PostTagsAsideList = () => {
  const t = useTranslations('common')
  const router = useRouter()
  const { present } = useModalStack()
  const { data } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => await apiClient.category.getAllTags(),
    staleTime: 1000 * 60 * 60 * 24,
  })

  if (!data?.length) return null
  const topTags = [...data]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_TAGS_LIMIT)

  return (
    <div className="mt-3 border-t border-black/[0.05] pt-3 dark:border-white/[0.06]">
      <div>
        <div className="flex flex-wrap gap-2">
          {topTags.map((tag) => (
            <MotionButtonBase
              key={tag.name}
              className={clsxm(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5',
                'border-black/[0.06] bg-black/[0.02] text-label-12 text-neutral-8',
                'transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:border-black/[0.1] hover:bg-black/[0.04] hover:text-neutral-9',
                'active:translate-y-px active:bg-black/[0.06]',
                'dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05] dark:active:bg-white/[0.06]',
              )}
              onClick={() => {
                router.push(routeBuilder(Routes.Tag, { name: tag.name }))
              }}
            >
              <span>{tag.name}</span>
              {!!tag.count && (
                <span className="text-label-12 text-neutral-5">
                  ({tag.count})
                </span>
              )}
            </MotionButtonBase>
          ))}
        </div>
        <button
          className="mt-3 text-label-12 text-neutral-5 underline decoration-black/15 underline-offset-4 transition-colors hover:text-neutral-9 dark:decoration-white/15"
          onClick={() => {
            presentPostTagsModal(present, t('tag_cloud'))
          }}
        >
          {t('all_tags')}
        </button>
      </div>
    </div>
  )
}

const BackToTopAsideActionButton = () => {
  const t = useTranslations('common')

  return (
    <PostListActionButton
      iconClassName="i-mingcute-arow-to-up-line"
      label={t('back_to_top')}
      variant="plain"
      onClick={springScrollToTop}
    />
  )
}

export const PostListMobileActions = () => <PostListMobileActionsInner />

const PostListMobileActionsInner = () => (
  <div
    data-hide-print
    className="mb-5 mt-2 border-b border-black/[0.06] pb-3 dark:border-white/[0.06] lg:hidden"
  >
    <div className="grid grid-cols-2 gap-2">
      <SearchMobileActionButton />
      <AllTagsMobileActionButton />
    </div>
  </div>
)

export const PostListActionAside = () => (
  <aside data-hide-print className="relative hidden h-full lg:block">
    <PostListActionAsideInner />
  </aside>
)

const PostListActionAsideInner = () => {
  const shouldShowBackToTop = useShouldShowBackToTop()

  return (
    <div className="mt-24 sticky top-[172px]">
      <div className="ml-auto w-full rounded-md border border-black/[0.04] bg-white/40 p-3.5 dark:border-white/[0.05] dark:bg-white/[0.04]">
        <div className="flex flex-col gap-2">
          <SearchAsideActionButton />
        </div>
        <PostTagsAsideList />
        <AnimatePresence initial={false}>
          {shouldShowBackToTop && (
            <m.div
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0, y: -6 }}
              initial={{ height: 0, opacity: 0, y: -6 }}
              transition={{
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="mt-3 border-t border-black/[0.05] pt-3 dark:border-white/[0.06]">
                <BackToTopAsideActionButton />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
