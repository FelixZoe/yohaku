'use client'

import type { Image } from '@mx-space/api-client'
import type { QueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useFormatter, useTranslations } from 'next-intl'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect } from 'react'
import type { BlogPosting, WithContext } from 'schema-dts'

import { setIsInReading } from '~/atoms/hooks/reading'
import { withClientOnly } from '~/components/common/ClientOnly'
import { GoToAdminEditingButton } from '~/components/modules/shared/GoToAdminEditingButton'
import {
  DataReValidate,
  MarkdownImageRecordProvider,
  MarkdownSelection as SharedMarkdownSelection,
} from '~/components/modules/shared/MarkdownImageRecordProvider'
import { FloatPopover } from '~/components/ui/float-popover'
import { articleMetaOf } from '~/lib/api/article-meta'
import { noopArr } from '~/lib/noop'
import {
  useCurrentNoteDataSelector,
  useCurrentNoteMetaSelector,
  useSetCurrentNoteData,
} from '~/providers/note/CurrentNoteDataProvider'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'
import { queries } from '~/queries/definition'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

export const LdJsonWithAuthor = ({
  baseLdJson,
}: {
  baseLdJson: WithContext<BlogPosting>
}) => {
  const jsonLd = useAggregationSelector(
    (state) =>
      ({
        ...baseLdJson,
        author: {
          '@type': 'Person',
          name: state.user.name,
          url: state.url.webUrl,
        },
      }) as WithContext<BlogPosting>,
  )
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd),
      }}
    />
  )
}

export const NoteInReadingEffect = () => {
  useEffect(() => {
    setIsInReading(true)
  }, [])
  return null
}

export const MarkdownSelection: Component = (props) => {
  const id = useCurrentNoteDataSelector((data) => data?.data?.id)!
  const title = useCurrentNoteDataSelector((data) => data?.data?.title)!
  const canComment = true
  const contentFormat = useCurrentNoteDataSelector(
    (data) => data?.data.contentFormat,
  )
  const content = useCurrentNoteDataSelector((data) => data?.data.content)
  const translationLang = useCurrentNoteMetaSelector((meta) => {
    const article = articleMetaOf(meta).translation
    return article?.isTranslated ? (article.targetLang ?? null) : null
  })
  return (
    <SharedMarkdownSelection
      canComment={canComment}
      content={content}
      contentFormat={contentFormat}
      refId={id}
      title={title}
      translationLang={translationLang}
    >
      {props.children}
    </SharedMarkdownSelection>
  )
}

export const NoteTitle = () => {
  const title = useCurrentNoteDataSelector((data) => data?.data.title)
  const id = useCurrentNoteDataSelector((data) => data?.data.id)

  if (!title) return null
  return (
    <div className="relative">
      <h1 className="mt-8 mb-3 text-balance text-left text-display-36 font-bold leading-tight text-neutral-9/95">
        {title}
      </h1>

      <GoToAdminEditingButton
        className="absolute right-0 top-0"
        id={id!}
        type="notes"
      />
    </div>
  )
}

const NoteDateMeta = () => {
  const created = useCurrentNoteDataSelector((data) => data?.data.createdAt)
  const format = useFormatter()

  if (!created) return null
  const dateFormat = format.dateTime(new Date(created), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <time
      className="font-serif italic"
      dateTime={new Date(created).toISOString()}
    >
      {dateFormat}
    </time>
  )
}
export const NoteHeaderDate = withClientOnly(() => {
  const date = useCurrentNoteDataSelector((data) => ({
    createdAt: data?.data.createdAt,
    modifiedAt: data?.data.modifiedAt,
  }))
  const format = useFormatter()
  const t = useTranslations('common')

  if (!date?.createdAt) return null

  const tips = date.modifiedAt
    ? t('modified_at', {
        date: format.dateTime(new Date(date.modifiedAt), {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
      })
    : ''

  return (
    <FloatPopover
      mobileAsSheet
      TriggerComponent={NoteDateMeta}
      as="span"
      type="tooltip"
      sheet={{
        triggerAsChild: false,
      }}
    >
      {tips}
    </FloatPopover>
  )
})

export const NoteMarkdownImageRecordProvider = (props: PropsWithChildren) => {
  const images = useCurrentNoteDataSelector(
    (data) => data?.data.images || (noopArr as Image[]),
  )!

  return (
    <MarkdownImageRecordProvider images={images}>
      {props.children}
    </MarkdownImageRecordProvider>
  )
}
export const IndentArticleContainer = ({
  children,
  prose = true,
  ref,
  className,
}: PropsWithChildren<{
  prose?: boolean
  ref?: React.Ref<HTMLElement>
  className?: string
}>) => (
  <article className={clsx('relative', prose && 'prose', className)} ref={ref}>
    {children}
  </article>
)

export const NoteDataReValidate: FC<{ fetchedAt: string }> = withClientOnly(
  ({ fetchedAt }) => {
    const dataSetter = useSetCurrentNoteData()

    const nid = useCurrentNoteDataSelector((note) => {
      if (!note) return {}
      return note.data.nid
    })
    const fetchData = useCallback(
      (locale: string, queryClient: QueryClient) =>
        queryClient.fetchQuery(
          queries.note.byNid(nid.toString(), null, locale),
        ),
      [nid],
    )
    const onData = useCallback(
      (data: unknown) => dataSetter(data as NoteWrappedPayloadWithMeta),
      [dataSetter],
    )

    return (
      <DataReValidate
        enabled={!!nid}
        fetchData={fetchData}
        fetchedAt={fetchedAt}
        logMessage="Note data revalidated"
        onData={onData}
      />
    )
  },
)
