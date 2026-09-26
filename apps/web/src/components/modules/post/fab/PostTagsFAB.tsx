'use client'

import type { TagModel } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { memo, useCallback, useMemo } from 'react'

import { EmptyIcon } from '~/components/icons/empty'
import { FABPortable } from '~/components/ui/fab'
import { Loading } from '~/components/ui/loading'
import { LoadingMark } from '~/components/ui/loading/LoadingMark'
import { useModalStack } from '~/components/ui/modal'
import { Tag } from '~/components/ui/tag/Tag'
import { Link } from '~/i18n/navigation'
import { createTagLabeler, tagGlossaryPairsOf } from '~/lib/api/tag-glossary'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'

export const presentPostTagsModal = (
  present: ReturnType<typeof useModalStack>['present'],
  title: string,
) => {
  present({
    content: TagsModal,
    clickOutsideToDismiss: true,
    title,
    modalClassName: 'w-[900px] max-w-full',
  })
}

export const PostTagsFAB = () => {
  const t = useTranslations('common')
  const { present } = useModalStack()
  return (
    <FABPortable
      aria-label={t('tag_cloud')}
      title={t('tag_cloud')}
      onClick={() => {
        presentPostTagsModal(present, t('tag_cloud'))
      }}
    >
      <i className="i-mingcute-hashtag-line" />
    </FABPortable>
  )
}

const TagsModal = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['tags', 'with-glossary'],
    queryFn: async () => {
      const tags = await apiClient.category.getAllTags()
      return { tags, tagGlossary: tagGlossaryPairsOf(tags.$meta) }
    },
  })
  const labelTag = useMemo(
    () => createTagLabeler(data?.tagGlossary),
    [data?.tagGlossary],
  )

  const { present } = useModalStack()
  const handleTagClick = useCallback(
    (tag: TagModel) => {
      present({
        content: () => <TagDetailModal {...tag} />,
        clickOutsideToDismiss: true,
        title: (
          <div className="flex items-center gap-2">
            Tag: {labelTag(tag.name)}
            <a
              aria-label={`Go to ${tag.name} tag detail`}
              href={routeBuilder(Routes.Tag, { name: tag.name })}
              rel="noreferrer"
              target="_blank"
            >
              <i className="i-mingcute-arrow-right-up-line translate-y-[2px] opacity-70" />
            </a>
          </div>
        ),
      })
    },
    [present, labelTag],
  )
  if (isLoading) return <Loading />
  if (!data) return <EmptyIcon />
  return (
    <div className="flex flex-wrap gap-3">
      {data.tags.map((tag) => (
        <TagInternal
          key={tag.name}
          {...tag}
          label={labelTag(tag.name)}
          onClick={handleTagClick}
        />
      ))}
    </div>
  )
}

const TagInternal = memo(function TagInternal(
  props: TagModel & {
    label: string
    onClick?: (tag: TagModel) => void
  },
) {
  const { count, label } = props

  return (
    // @ts-ignore
    <Tag count={count} passProps={props} text={label} onClick={props.onClick} />
  )
})

export const TagDetailModal = (props: { name: string }) => {
  const { name } = props
  const { data, isLoading } = useQuery({
    queryKey: [name, 'tag'],
    queryFn: async ({ queryKey }) => {
      const [tagName] = queryKey
      return (await apiClient.category.getTagByName(tagName)).data
    },
    staleTime: 1000 * 60 * 60 * 24,
  })
  const { dismissAll } = useModalStack()
  if (isLoading)
    return (
      <div className="center flex h-24 w-full">
        <LoadingMark size={24} />
      </div>
    )

  if (!data) return <EmptyIcon />

  return (
    <ul className="space-y-2">
      {data
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((item) => (
          <li
            className="flex items-center gap-3"
            data-id={item.id}
            key={item.id}
          >
            <span className="shrink-0 text-copy-13 tabular-nums text-neutral-4">
              {Intl.DateTimeFormat('en-us', {
                month: '2-digit',
                day: '2-digit',
                year: '2-digit',
              }).format(new Date(item.createdAt))}
            </span>
            <Link
              className="yohaku-link--underline min-w-0 truncate text-copy-14 leading-6"
              href={routeBuilder(Routes.Post, {
                category: item.category.slug,
                slug: item.slug,
              })}
              onClick={() => {
                dismissAll()
              }}
            >
              {item.title}
            </Link>
          </li>
        ))}
    </ul>
  )
}
