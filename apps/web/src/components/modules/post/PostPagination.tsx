'use client'

import type { Pager } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { ListPaginationNav } from '~/components/ui/pagination/ListPaginationNav'
import { hasNextPage, hasPrevPage } from '~/lib/api/meta'

export const PostPagination: FC<{
  pagination: Pager
  sortParams?: string
}> = ({ pagination, sortParams }) => {
  const t = useTranslations('common')
  const href = (page: number) => {
    const params = new URLSearchParams(sortParams || '')
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return `/posts${qs ? `?${qs}` : ''}`
  }

  return (
    <ListPaginationNav
      ariaLabel="Pagination"
      hasNext={hasNextPage(pagination)}
      hasPrev={hasPrevPage(pagination)}
      nextHref={href(pagination.page + 1)}
      nextLabel={t('pagination_next')}
      prevHref={href(pagination.page - 1)}
      prevLabel={t('pagination_prev')}
      info={t('pagination_page_info', {
        current: pagination.page,
        total: pagination.totalPages,
      })}
    />
  )
}
