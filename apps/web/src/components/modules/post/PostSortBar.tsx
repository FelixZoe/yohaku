'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { useRouter } from '~/i18n/navigation'

type SortOption = {
  label: string
  sortBy?: string
  orderBy?: string
}

export const PostSortBar: FC<{ totalCount: number }> = ({ totalCount }) => {
  const t = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSortBy = searchParams.get('sortBy') || ''
  const currentOrderBy = searchParams.get('orderBy') || ''
  const isNoAiFilterActive = searchParams.get('filter') === 'no-ai'

  const sortOptions: SortOption[] = [
    { label: t('sort_latest') },
    { label: t('sort_oldest'), sortBy: 'createdAt', orderBy: 'asc' },
    {
      label: t('sort_recently_updated'),
      sortBy: 'modifiedAt',
      orderBy: 'desc',
    },
  ]

  const isActive = (option: SortOption) => {
    if (!option.sortBy) return !currentSortBy
    return currentSortBy === option.sortBy && currentOrderBy === option.orderBy
  }

  const handleSort = (option: SortOption) => {
    if (isActive(option)) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (option.sortBy) {
      params.set('sortBy', option.sortBy)
      params.set('orderBy', option.orderBy!)
    } else {
      params.delete('sortBy')
      params.delete('orderBy')
    }
    router.push(`/posts${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const toggleNoAiFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (isNoAiFilterActive) {
      params.delete('filter')
    } else {
      params.set('filter', 'no-ai')
    }
    router.push(`/posts${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="mt-5 flex items-center justify-between border-b border-black/[0.06] pb-3 dark:border-white/[0.06]">
      <span className="text-label-12 text-neutral-5">
        {t('posts_total_count', { count: totalCount })}
      </span>
      <div className="flex items-center gap-4">
        <button
          aria-pressed={isNoAiFilterActive}
          className={clsx(
            'flex items-center gap-1 text-label-12 transition-colors',
            isNoAiFilterActive
              ? 'font-medium text-accent'
              : 'text-neutral-5 hover:text-accent',
          )}
          onClick={toggleNoAiFilter}
        >
          <i
            className={clsx(
              isNoAiFilterActive
                ? 'i-mingcute-quill-pen-fill'
                : 'i-mingcute-quill-pen-line',
            )}
          />
          {t('filter_no_ai_written')}
        </button>
        <span
          aria-hidden
          className="h-3 w-px bg-black/[0.08] dark:bg-white/[0.08]"
        />
        {sortOptions.map((option) => (
          <button
            aria-current={isActive(option) ? 'page' : undefined}
            key={option.label}
            className={clsx(
              'text-label-12 transition-colors',
              isActive(option)
                ? 'font-medium text-accent underline underline-offset-[3px]'
                : 'text-neutral-5 hover:text-accent',
            )}
            onClick={() => handleSort(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
