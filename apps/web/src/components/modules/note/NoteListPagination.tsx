'use client'

import type { Pager } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { ListPaginationNav } from '~/components/ui/pagination/ListPaginationNav'
import { hasNextPage, hasPrevPage } from '~/lib/api/meta'

export const NoteListPagination: FC<{ pagination: Pager }> = ({
  pagination,
}) => {
  const t = useTranslations('note')

  return (
    <ListPaginationNav
      ariaLabel="Notes pagination"
      hasNext={hasNextPage(pagination)}
      hasPrev={hasPrevPage(pagination)}
      info={t('pagination_page', { page: pagination.page })}
      nextHref={`/notes?page=${pagination.page + 1}`}
      nextLabel={t('older_notes')}
      prevHref={`/notes?page=${pagination.page - 1}`}
      prevLabel={t('newer_notes')}
    />
  )
}
