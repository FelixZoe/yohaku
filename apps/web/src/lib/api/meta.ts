import type {
  NoteResponseMeta,
  Pager,
  PostResponseMeta,
} from '@mx-space/api-client'
import { metaFor } from '@mx-space/api-client'

export type NotePayloadWithMeta<T extends { id: string }> = {
  data: T
  meta?: NoteResponseMeta
}

export type PaginateResultWithMeta<T extends { id: string }> = {
  data: T[]
  pagination: Pager
  $meta?: PostResponseMeta
}

export const getArticleTranslation = <T extends { id: string }>(
  item: T,
  meta?: PostResponseMeta | NoteResponseMeta,
) => metaFor(item, meta as any).translation?.article

export const hasNextPage = (pagination: Pager) =>
  pagination.hasNextPage ?? pagination.page < pagination.totalPages

export const hasPrevPage = (pagination: Pager) =>
  pagination.hasPrevPage ?? pagination.page > 1
