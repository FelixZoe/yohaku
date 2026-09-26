'use client'

import type { PostModel } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import { Fragment, useMemo } from 'react'

import { MotionButtonBase } from '~/components/ui/button'
import { FloatPopover } from '~/components/ui/float-popover'
import { useModalStack } from '~/components/ui/modal'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { RelativeTime } from '~/components/ui/relative-time'
import { useIsClient } from '~/hooks/common/use-is-client'
import { useRouter } from '~/i18n/navigation'
import { createTagLabeler, type TagGlossaryPair } from '~/lib/api/tag-glossary'
import { clsxm } from '~/lib/helper'
import { routeBuilder, Routes } from '~/lib/route-builder'

import { TagDetailModal } from './fab/PostTagsFAB'

const Dot: Component = ({ className }) => (
  <span className={clsxm('text-neutral-5', className)}>·</span>
)

const Item: Component = ({ className, children }) => (
  <span className={clsxm('flex items-center gap-2', className)}>
    <Dot />
    {children}
  </span>
)

export const PostMetaBar: Component<{
  meta: Partial<
    Pick<
      PostModel,
      | 'createdAt'
      | 'modifiedAt'
      | 'category'
      | 'tags'
      | 'readCount'
      | 'likeCount'
    >
  >
  tagGlossary?: TagGlossaryPair[]
}> = ({ className, meta, tagGlossary, children }) => {
  const t = useTranslations('common')
  const labelTag = useMemo(() => createTagLabeler(tagGlossary), [tagGlossary])
  const { present } = useModalStack()
  const router = useRouter()
  const isClient = useIsClient()
  return (
    <div
      className={clsxm(
        'flex min-w-0 shrink grow flex-wrap items-center gap-2 text-label-12 text-neutral-6',
        className,
      )}
    >
      {!!meta.createdAt && (
        <span>
          <RelativeTime date={meta.createdAt} />
        </span>
      )}

      {meta.modifiedAt ? (
        <Item>
          {isClient ? (
            <FloatPopover
              mobileAsSheet
              as="span"
              triggerElement={t('edited')}
              type="tooltip"
            >
              {t('edited_at')} <RelativeTime date={meta.modifiedAt} />
            </FloatPopover>
          ) : (
            <span>{t('edited')}</span>
          )}
        </Item>
      ) : null}

      {!!meta.category && (
        <span className="order-last flex min-w-0 basis-full items-center justify-center gap-2 md:order-none md:basis-auto md:justify-start">
          <Dot className="hidden md:inline" />
          <span className="min-w-0 truncate">
            <MotionButtonBase
              className="yohaku-link--underline font-normal text-accent"
              onClick={() =>
                !!meta.category &&
                router.push(
                  routeBuilder(Routes.Category, {
                    slug: meta.category.slug,
                  }),
                )
              }
            >
              {meta.category.name}
            </MotionButtonBase>

            {meta.tags?.length ? (
              <>
                {' / '}
                {meta.tags.map((tag, index) => {
                  const isLast = index === meta.tags!.length - 1
                  const label = labelTag(tag)
                  return (
                    <Fragment key={tag}>
                      <button
                        className="yohaku-link--underline"
                        onClick={() =>
                          present({
                            content: () => <TagDetailModal name={tag} />,
                            clickOutsideToDismiss: true,
                            title: `Tag: ${label}`,
                          })
                        }
                      >
                        {label}
                      </button>
                      {!isLast && ', '}
                    </Fragment>
                  )
                })}
              </>
            ) : null}
          </span>
        </span>
      )}

      {!!meta.readCount && (
        <Item>
          <span>
            <NumberSmoothTransition>{meta.readCount}</NumberSmoothTransition>{' '}
            {t('meta_reads', { count: '' }).trim()}
          </span>
        </Item>
      )}

      {!!meta.likeCount && (
        <Item>
          <span>
            <NumberSmoothTransition>{meta.likeCount}</NumberSmoothTransition>{' '}
            {t('meta_likes', { count: '' }).trim()}
          </span>
        </Item>
      )}

      {children}
    </div>
  )
}
