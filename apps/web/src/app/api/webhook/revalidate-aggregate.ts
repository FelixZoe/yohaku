import type { GenericEvent } from '@mx-space/webhook'
import { BusinessEvents } from '@mx-space/webhook'
import { revalidatePath, revalidateTag } from 'next/cache'

import { defaultLocale, locales } from '~/i18n/config'
import { AGGREGATE_CACHE_TAG } from '~/lib/cache-tags'
import { buildNoteSeoPath } from '~/lib/note-route'

const aggregateSections = ['notes', 'posts', 'says', 'friends', 'timeline']

const buildLocalePaths = (suffix = '') =>
  locales.map((locale) =>
    locale === defaultLocale ? suffix || '/' : `/${locale}${suffix}`,
  )

const aggregateRevalidatePaths = [
  ...buildLocalePaths(),
  ...aggregateSections.flatMap((section) => buildLocalePaths(`/${section}`)),
]

type RevalidateResult = {
  revalidated: string[]
  failed: Array<{ path: string; message: string }>
  count: number
}

const revalidatePathList = async (
  paths: string[],
): Promise<RevalidateResult> => {
  const revalidated: string[] = []
  const failed: Array<{ path: string; message: string }> = []

  for (const path of paths) {
    try {
      revalidatePath(path)
      revalidated.push(path)
    } catch (error) {
      failed.push({
        path,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { revalidated, failed, count: revalidated.length }
}

export const revalidateAggregatePaths = async (): Promise<RevalidateResult> => {
  const result = await revalidatePathList(aggregateRevalidatePaths)

  try {
    revalidateTag(AGGREGATE_CACHE_TAG, 'max')
    result.revalidated.unshift(`tag:${AGGREGATE_CACHE_TAG}`)
    result.count += 1
  } catch (error) {
    result.failed.unshift({
      path: `tag:${AGGREGATE_CACHE_TAG}`,
      message: error instanceof Error ? error.message : String(error),
    })
  }

  return result
}

/**
 * Revalidate the specific detail page for a content event.
 * e.g. POST_UPDATE with slug "my-post" in category "tech" → /posts/tech/my-post
 */
export const revalidateContentPaths = async (
  event: GenericEvent | { payload: any; type: string },
): Promise<RevalidateResult> => {
  const paths = buildContentPaths(event)
  if (paths.length === 0) {
    return { revalidated: [], failed: [], count: 0 }
  }
  return revalidatePathList(paths)
}

function buildContentPaths(event: { payload: any; type: string }): string[] {
  const { type, payload } = event

  switch (type) {
    case BusinessEvents.POST_CREATE:
    case BusinessEvents.POST_UPDATE:
    case 'post.republish': {
      const { slug, category } = payload
      if (!slug || !category?.slug) return []
      const basePath = `/posts/${category.slug}/${slug}`
      return buildLocalePaths(basePath)
    }

    case BusinessEvents.NOTE_CREATE:
    case BusinessEvents.NOTE_UPDATE:
    case 'note.republish': {
      const { nid } = payload
      if (!nid) return []
      const seoPath = buildNoteSeoPath(payload)
      const paths = [
        ...buildLocalePaths(`/notes/${nid}`),
        ...(seoPath ? buildLocalePaths(seoPath) : []),
      ]
      return [...new Set(paths)]
    }

    case BusinessEvents.PAGE_CREATE:
    case BusinessEvents.PAGE_UPDATE: {
      const { slug } = payload
      if (!slug) return []
      const basePath = `/${slug}`
      return buildLocalePaths(basePath)
    }

    case BusinessEvents.POST_DELETE:
    case BusinessEvents.NOTE_DELETE:
    case BusinessEvents.PAGE_DELETE:
    case 'post.unpublish':
    case 'note.unpublish': {
      // For deletes, payload is { data: id } - we can't derive the path
      // The aggregate path revalidation will handle listing pages
      return []
    }

    default: {
      return []
    }
  }
}
