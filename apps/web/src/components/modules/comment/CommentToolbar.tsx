'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useMemo } from 'react'

import type { SegmentedOption } from '~/components/ui/segmented'
import { Segmented } from '~/components/ui/segmented'
import type { CommentSort } from '~/queries/keys'

interface CommentToolbarProps {
  onSortChange: (sort: CommentSort) => void
  sort: CommentSort
  total: number | null
}

const SORT_ICONS: Record<CommentSort, string> = {
  newest: 'i-mingcute-arrow-down-line',
  oldest: 'i-mingcute-arrow-up-line',
  pinned: 'i-mingcute-pin-line',
}

const SORT_ORDER: CommentSort[] = ['pinned', 'newest', 'oldest']

export const CommentToolbar: FC<CommentToolbarProps> = ({
  total,
  sort,
  onSortChange,
}) => {
  const t = useTranslations('comment')

  const options = useMemo<SegmentedOption<CommentSort>[]>(
    () =>
      SORT_ORDER.map((value) => ({
        icon: SORT_ICONS[value],
        label: t(`sort_${value}`),
        labelHiddenOnMobile: true,
        value,
      })),
    [t],
  )

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-copy-13 font-medium text-neutral-7 tabular-nums">
        {total === null ? '\u00A0' : t('total', { count: total })}
      </span>

      <Segmented
        ariaLabel={t('sort_label')}
        options={options}
        value={sort}
        onChange={onSortChange}
      />
    </div>
  )
}
