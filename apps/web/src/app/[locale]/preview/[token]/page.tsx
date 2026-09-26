'use client'

import type {
  NoteModel,
  PageModel,
  PostModel,
  SharedDraftModel,
} from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { use, useMemo } from 'react'

import { PageDetailShell } from '~/app/[locale]/(page-detail)/[slug]/PageDetailShell'
import { MarkdownImageRecordProviderInternal } from '~/app/[locale]/(page-detail)/[slug]/pageExtra'
import { PageMarkdown } from '~/app/[locale]/(page-detail)/[slug]/PageMarkdown'
import { Container as PageContainer } from '~/app/[locale]/(page-detail)/Container'
import { NoteDetailClient } from '~/app/[locale]/notes/(note-detail)/NoteDetailClient'
import { PostDetailClient } from '~/app/[locale]/posts/(post-detail)/[category]/[slug]/PostDetailClient'
import { Container as PostContainer } from '~/app/[locale]/posts/(post-detail)/Container'
import { NoteMainContainerHeightProvider } from '~/components/modules/note/NoteMainContainer'
import { Loading } from '~/components/ui/loading'
import { apiClient } from '~/lib/fetch/fetch.client'
import { LayoutRightSideProvider } from '~/providers/shared/LayoutRightSideProvider'
import type { PostWithTranslation } from '~/queries/definition'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

const sharedBase = (draft: SharedDraftModel) => ({
  id: 'shared-draft',
  allowComment: false,
  content: draft.content,
  contentFormat: draft.contentFormat,
  created: draft.createdAt,
  createdAt: draft.createdAt,
  images: draft.images ?? [],
  isPublished: true,
  likeCount: 0,
  meta: null,
  modifiedAt: null,
  readCount: 0,
  text: draft.text,
  title: draft.title,
})

function SharedDraftPreviewPage(props: { params: Promise<{ token: string }> }) {
  const { token } = use(props.params)
  const t = useTranslations('error')
  const { data, isError, isPending } = useQuery({
    queryFn: () => apiClient.draft.getShared(token),
    queryKey: ['shared-draft', token],
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    meta: { persist: false },
  })

  if (isPending) return <Loading className="mt-[30vh]" />
  if (isError || !data) {
    return (
      <div className="mt-[30vh] text-center opacity-60">
        {t('share_link_expired')}
      </div>
    )
  }

  if (data.refType === 'note') return <SharedNote draft={data} />
  if (data.refType === 'page') {
    return (
      <PageContainer>
        <SharedPage draft={data} />
      </PageContainer>
    )
  }
  return (
    <PostContainer>
      <SharedPost draft={data} />
    </PostContainer>
  )
}

const SharedPost = ({ draft }: { draft: SharedDraftModel }) => {
  const payload = useMemo(
    () =>
      ({
        data: {
          ...sharedBase(draft),
          category: { id: '', name: '', slug: '', type: 0 },
          categoryId: '',
          copyright: false,
          related: [],
          slug: '',
          summary: null,
          tags: [],
        } as unknown as PostModel,
        meta: null,
      }) as unknown as PostWithTranslation,
    [draft],
  )

  return <PostDetailClient preview data={payload} />
}

const SharedNote = ({ draft }: { draft: SharedDraftModel }) => {
  const payload = useMemo(
    () =>
      ({
        data: { ...sharedBase(draft), nid: 1 } as unknown as NoteModel,
        meta: null,
      }) as unknown as NoteWrappedPayloadWithMeta,
    [draft],
  )

  return (
    <NoteMainContainerHeightProvider>
      <div
        className={clsx(
          'relative mx-auto grid min-h-[calc(100vh-6.5rem-10rem)] max-w-[60rem]',
          'mt-12 gap-4 md:grid-cols-1 xl:max-w-[calc(60rem+400px)]',
          'xl:grid-cols-[1fr_minmax(auto,60rem)_1fr] md:mt-24',
        )}
      >
        <div aria-hidden className="hidden xl:block" />
        <NoteDetailClient preview nid="1" notePayload={payload} />
        <LayoutRightSideProvider className="pointer-events-none relative hidden xl:block" />
      </div>
    </NoteMainContainerHeightProvider>
  )
}

const SharedPage = ({ draft }: { draft: SharedDraftModel }) => {
  const model = useMemo(
    () =>
      ({
        ...sharedBase(draft),
        order: 0,
        slug: '',
        subtitle: '',
      }) as unknown as PageModel,
    [draft],
  )

  return (
    <PageDetailShell preview data={model}>
      <MarkdownImageRecordProviderInternal>
        <PageMarkdown />
      </MarkdownImageRecordProviderInternal>
    </PageDetailShell>
  )
}

export default dynamic(() => Promise.resolve(SharedDraftPreviewPage), {
  ssr: false,
})
