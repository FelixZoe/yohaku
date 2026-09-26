import type { NoteModel } from '@mx-space/api-client'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PaperWithEntrance } from '~/components/layout/container/PaperWithEntrance'
import { NoteLatestRender } from '~/components/modules/note/NoteLatestRender'
import { NoteListPagination } from '~/components/modules/note/NoteListPagination'
import { NoteListTimeline } from '~/components/modules/note/NoteListTimeline'
import { NoteTopicBinderClip } from '~/components/modules/note/NoteTopicBinderClip'
import { NothingFound } from '~/components/modules/shared/NothingFound'
import type { Locale } from '~/i18n/config'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'
import { buildPageMetadata } from '~/lib/seo/metadata.server'
import {
  buildPaginatedCanonicalPath,
  isOutOfRangePaginationPage,
} from '~/lib/seo/pagination'

interface Props extends LocaleParams {
  page?: string
}

export const dynamic = 'force-dynamic'

export const generateMetadata = async (
  props: NextPageParams<
    { locale: string },
    { searchParams: Promise<{ page?: string | string[] }> }
  >,
): Promise<Metadata> => {
  const [{ locale }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const t = await getTranslations({
    namespace: 'common',
    locale,
  })

  return buildPageMetadata({
    locale: locale as Locale,
    path: buildPaginatedCanonicalPath('/notes', searchParams.page),
    title: t('page_title_notes'),
    description: ({ siteName }) => t('page_description_notes', { siteName }),
  })
}

const noteListSelect: (keyof NoteModel)[] = [
  'title',
  'nid',
  'meta',
  'topic',
  'topicId' as keyof NoteModel,
  'mood',
  'weather',
  'bookmark',
  'createdAt',
  'slug',
  'id',
]

export default definePrerenderPage<Props>()({
  searchParamKeys: ['page'],
  fetcher: async (params) => {
    const pageNumber = params?.page ? Number.parseInt(params.page) : 1
    const isFirstPage = pageNumber === 1

    const [latestNote, listResult] = await Promise.all([
      isFirstPage ? apiClient.note.getLatest().then((res) => res) : null,
      apiClient.note.getList(pageNumber, 10, {
        select: noteListSelect,
        withSummary: true,
      } as any),
    ])

    return {
      latestNote,
      listResult,
      isFirstPage,
    }
  },
  Component: async ({
    data: { latestNote, listResult, isFirstPage },
    params,
  }) => {
    const t = await getTranslations('note')
    const { data, pagination } = listResult

    if (isOutOfRangePaginationPage(params.page, data?.length ?? 0)) {
      notFound()
    }

    if (!data?.length) {
      return <NothingFound />
    }

    const timelineNotes =
      isFirstPage && latestNote
        ? data.filter((n: NoteModel) => n.id !== latestNote.id)
        : data

    return (
      <div className="mx-auto mt-24 min-w-0 max-w-5xl px-4">
        {isFirstPage && latestNote && (
          <>
            <PaperWithEntrance as="section" className="mb-0!">
              <div className="hidden lg:block">
                {latestNote.topic && (
                  <NoteTopicBinderClip topic={latestNote.topic} />
                )}
              </div>
              <NoteLatestRender note={latestNote} />
            </PaperWithEntrance>
            {timelineNotes.length > 0 && (
              <div className="my-10 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-3/60" />
                <span className="text-label-12 tracking-widest text-neutral-6">
                  {t('older_notes')}
                </span>
                <div className="h-px flex-1 bg-neutral-3/60" />
              </div>
            )}
          </>
        )}
        {timelineNotes.length > 0 && <NoteListTimeline notes={timelineNotes} />}
        <NoteListPagination pagination={pagination} />
      </div>
    )
  },
})
