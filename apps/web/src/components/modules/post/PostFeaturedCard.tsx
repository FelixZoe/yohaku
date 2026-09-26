'use client'

import type { PostModel, PostResponseMeta } from '@mx-space/api-client'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { type FC, Fragment, useMemo } from 'react'
import RemoveMarkdown from 'remove-markdown'

import { TagDetailModal } from '~/components/modules/post/fab/PostTagsFAB'
import { TranslatedBadge } from '~/components/modules/translation/TranslatedBadge'
import { useModalStack } from '~/components/ui/modal'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { RelativeTime } from '~/components/ui/relative-time'
import { Link, useRouter } from '~/i18n/navigation'
import { articleMetaOf } from '~/lib/api/article-meta'
import { createTagLabeler, tagGlossaryPairsOf } from '~/lib/api/tag-glossary'
import { routeBuilder, Routes } from '~/lib/route-builder'

export const PostFeaturedCard: FC<{
  data: PostModel
  meta?: PostResponseMeta
}> = ({ data, meta }) => {
  const translation = articleMetaOf(meta, data.id).translation
  const labelTag = useMemo(
    () => createTagLabeler(tagGlossaryPairsOf(meta)),
    [meta],
  )
  const t = useTranslations('common')
  const router = useRouter()
  const { present } = useModalStack()
  const categorySlug = data.category?.slug
  const postLink = `/posts/${categorySlug}/${data.slug}`
  const hasImage = !!data.images?.length && !!data.images[0]?.src
  const summary =
    data.summary || (data.text ? RemoveMarkdown(data.text).slice(0, 150) : '')

  return (
    <Link
      href={postLink}
      prefetch={false}
      className={clsx(
        'mt-5 block rounded-md p-5 lg:-mx-4',
        'bg-white/50 border border-black/5',
        'dark:bg-white/5 dark:border-white/5',
        'transition-all duration-250',
        'hover:shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:-translate-y-px',
      )}
    >
      <div className={clsx('flex gap-4', hasImage && 'lg:flex-row')}>
        <div className="min-w-0 flex-1">
          {!!data.pinAt && (
            <div className="mb-2 text-label-12 tracking-[1px] text-accent">
              {t('pinned_label')}
            </div>
          )}
          <h2 className="text-copy-16 font-medium text-neutral-9">
            {data.title}
          </h2>
          {summary && (
            <p className="mt-2 line-clamp-2 text-copy-13 leading-[1.7] text-neutral-6">
              {summary}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-12">
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
                {data.tags?.length ? (
                  <>
                    <span className="text-neutral-4">/</span>
                    {data.tags.map((tag, index) => (
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
                        {index < data.tags!.length - 1 && (
                          <span className="text-neutral-4">,</span>
                        )}
                      </Fragment>
                    ))}
                  </>
                ) : null}
              </>
            )}
            {translation?.isTranslated && (
              <TranslatedBadge articleTranslation={translation} />
            )}
          </div>

          {(!!data.readCount || !!data.likeCount) && (
            <div className="mt-3 flex justify-end gap-2.5 border-t border-dashed border-border pt-2 text-label-12 text-neutral-4">
              {!!data.readCount && (
                <span className="flex items-center gap-1">
                  <i className="i-mingcute-eye-2-line" />
                  <NumberSmoothTransition>
                    {data.readCount}
                  </NumberSmoothTransition>
                </span>
              )}
              {!!data.likeCount && (
                <span className="flex items-center gap-1">
                  <i className="i-mingcute-heart-line" />
                  <NumberSmoothTransition>
                    {data.likeCount}
                  </NumberSmoothTransition>
                </span>
              )}
            </div>
          )}
        </div>
        {hasImage && data.images?.[0]?.src && (
          <div
            className="hidden size-[100px] shrink-0 rounded bg-cover bg-center bg-no-repeat lg:block"
            style={{ backgroundImage: `url(${data.images[0].src})` }}
          />
        )}
      </div>
    </Link>
  )
}
