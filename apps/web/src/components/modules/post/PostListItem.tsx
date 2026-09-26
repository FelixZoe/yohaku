'use client'

import type { PostModel, PostResponseMeta } from '@mx-space/api-client'
import clsx from 'clsx'
import { type FC, Fragment, useMemo } from 'react'
import RemoveMarkdown from 'remove-markdown'

import { TagDetailModal } from '~/components/modules/post/fab/PostTagsFAB'
import { TranslatedBadge } from '~/components/modules/translation/TranslatedBadge'
import { useModalStack } from '~/components/ui/modal'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { RelativeTime } from '~/components/ui/relative-time'
import { Link, useRouter } from '~/i18n/navigation'
import { articleMetaOf } from '~/lib/api/article-meta'
import {
  createTagLabeler,
  tagGlossaryPairsOf,
  type TagLabeler,
} from '~/lib/api/tag-glossary'
import { routeBuilder, Routes } from '~/lib/route-builder'

// CJK char counts as 2 latin units; budget tuned for the post-list meta row.
const TAG_VISIBLE_BUDGET = 24
const CJK_RE = /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/
const weighTag = (s: string) =>
  Array.from(s).reduce((n, c) => n + (CJK_RE.test(c) ? 2 : 1), 0)

const partitionTags = (tags: string[]) => {
  let used = 0
  const visible: string[] = []
  for (const tag of tags) {
    const cost = weighTag(tag) + 2 // approximate ", " separator
    if (used + cost > TAG_VISIBLE_BUDGET && visible.length > 0) break
    visible.push(tag)
    used += cost
  }
  return { visible, hiddenCount: tags.length - visible.length }
}

export const PostListItem: FC<{
  data: PostModel
  meta?: PostResponseMeta
}> = ({ data, meta }) => {
  const translation = articleMetaOf(meta, data.id).translation
  const labelTag = useMemo(
    () => createTagLabeler(tagGlossaryPairsOf(meta)),
    [meta],
  )
  const router = useRouter()
  const { present } = useModalStack()
  const categorySlug = data.category?.slug
  const postLink = `/posts/${categorySlug}/${data.slug}`
  const summary =
    data.summary || (data.text ? RemoveMarkdown(data.text).slice(0, 80) : '')
  const tags = data.tags
  const { visible: visibleTags, hiddenCount } = useMemo(
    () =>
      tags?.length ? partitionTags(tags) : { visible: [], hiddenCount: 0 },
    [tags],
  )

  const hasCounts = !!data.readCount || !!data.likeCount
  const counts = (
    <>
      {!!data.readCount && (
        <span className="flex items-center gap-1">
          <i className="i-mingcute-eye-2-line" />
          <NumberSmoothTransition>{data.readCount}</NumberSmoothTransition>
        </span>
      )}
      {!!data.likeCount && (
        <span className="flex items-center gap-1">
          <i className="i-mingcute-heart-line" />
          <NumberSmoothTransition>{data.likeCount}</NumberSmoothTransition>
        </span>
      )}
    </>
  )

  return (
    <Link
      href={postLink}
      prefetch={false}
      className={clsx(
        'block rounded-lg px-4 py-3.5 -mx-4 my-1',
        'transition-all duration-250',
        'hover:bg-white/70 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] hover:-translate-y-px',
        'dark:hover:bg-white/5',
      )}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="text-copy-16 font-medium text-neutral-9">
          {data.title}
        </h3>
      </div>

      {summary && (
        <p className="mt-1 line-clamp-1 text-copy-13 leading-normal text-neutral-6">
          {summary}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-12">
        <span className="whitespace-nowrap text-neutral-5">
          <RelativeTime date={data.createdAt} />
        </span>
        {data.category && (
          <>
            <span className="text-neutral-4">·</span>
            <button
              className="yohaku-link--underline whitespace-nowrap text-accent"
              onClick={(e) => {
                e.preventDefault()
                router.push(
                  routeBuilder(Routes.Category, {
                    slug: data.category!.slug,
                  }),
                )
              }}
            >
              {data.category.name}
            </button>
            {visibleTags.length > 0 ? (
              <>
                <span className="text-neutral-4">/</span>
                {visibleTags.map((tag, index) => (
                  <Fragment key={tag}>
                    <button
                      className="yohaku-link--underline whitespace-nowrap text-accent"
                      onClick={(e) => {
                        e.preventDefault()
                        present({
                          content: () => <TagDetailModal name={tag} />,
                          clickOutsideToDismiss: true,
                          title: `Tag: ${labelTag(tag)}`,
                        })
                      }}
                    >
                      {labelTag(tag)}
                    </button>
                    {index < visibleTags.length - 1 && (
                      <span className="text-neutral-4">,</span>
                    )}
                  </Fragment>
                ))}
                {hiddenCount > 0 && tags && (
                  <button
                    aria-label={`Show ${hiddenCount} more tags`}
                    className="whitespace-nowrap tabular-nums text-neutral-6 hover:text-accent"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      present({
                        content: () => (
                          <PostTagsInlineModal
                            labelTag={labelTag}
                            tags={tags}
                          />
                        ),
                        title: 'Tags',
                      })
                    }}
                  >
                    +{hiddenCount}
                  </button>
                )}
              </>
            ) : null}
          </>
        )}
        {translation?.isTranslated && (
          <TranslatedBadge articleTranslation={translation} />
        )}
        {hasCounts && (
          <span className="ml-auto hidden items-center gap-2.5 text-neutral-4 sm:flex">
            {counts}
          </span>
        )}
      </div>

      {hasCounts && (
        <div className="mt-2 flex justify-end gap-2.5 border-t border-dashed border-border pt-2 text-label-12 text-neutral-4 sm:hidden">
          {counts}
        </div>
      )}
    </Link>
  )
}

const PostTagsInlineModal: FC<{ tags: string[]; labelTag: TagLabeler }> = ({
  tags,
  labelTag,
}) => {
  const { present } = useModalStack()
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={clsx(
            'rounded-full px-3 py-1 text-label-12',
            'bg-neutral-2 text-neutral-8',
            'transition-colors hover:bg-accent/10 hover:text-accent',
          )}
          onClick={() => {
            present({
              content: () => <TagDetailModal name={tag} />,
              clickOutsideToDismiss: true,
              title: `Tag: ${labelTag(tag)}`,
            })
          }}
        >
          {labelTag(tag)}
        </button>
      ))}
    </div>
  )
}
