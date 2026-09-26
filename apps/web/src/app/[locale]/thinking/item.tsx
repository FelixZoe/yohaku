'use client'

import type { RecentlyModel } from '@mx-space/api-client'
import {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
} from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { memo, useMemo, useState } from 'react'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { PaperSheet } from '~/components/layout/container/PaperSheet'
import { CommentBoxRootLazy, CommentsLazy } from '~/components/modules/comment'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { StyledButton } from '~/components/ui/button'
import { Divider } from '~/components/ui/divider'
import { FloatPopover } from '~/components/ui/float-popover'
import { EnrichmentMapProvider } from '~/components/ui/link-card'
import { Markdown } from '~/components/ui/markdown'
import { useModalStack } from '~/components/ui/modal'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { RelativeTime } from '~/components/ui/relative-time'
import { Link, usePathname } from '~/i18n/navigation'
import { parseCompanionMomentMetadata } from '~/lib/companion-moment'
import { parseRecentlyContent } from '~/lib/enrichment/recently'
import { sample } from '~/lib/lodash'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { toast } from '~/lib/toast'
import { urlBuilder } from '~/lib/url-builder'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { CompanionMomentContext } from './companion-moment-context'
import { QUERY_KEY } from './constants'

export const ThinkingItem: FC<{
  item: RecentlyModel
}> = memo(({ item }) => {
  const t = useTranslations('common')
  const tHome = useTranslations('home')
  const owner = useAggregationSelector((a) => a.user)!
  const pathname = usePathname()
  const isInThinkingDetailRoute = pathname.includes(Routes.ThinkingItem)
  const { present } = useModalStack()
  const companionMoment = parseCompanionMomentMetadata(item.metadata)
  const isContextOnly = !item.content.trim() && companionMoment !== null
  const parsed = useMemo(
    () => parseRecentlyContent(item.content, item.enrichments),
    [item.content, item.enrichments],
  )
  const bareLinkVerbKey =
    parsed.kind === 'enriched' && parsed.description === null
      ? parsed.link.verbKey
      : null

  const handleUp = (id: string) => {
    apiClient.recently
      .attitude(id, RecentlyAttitudeEnum.Up)
      .then(({ code }) => {
        if (code === RecentlyAttitudeResultEnum.Inc) {
          toast.success(sample(['(￣▽￣*) ゞ', '(＾▽＾)']))
        } else {
          toast.success('[○･｀Д´･○]')
        }
      })
  }

  const handleDown = (id: string) => {
    apiClient.recently
      .attitude(id, RecentlyAttitudeEnum.Down)
      .then(({ code }) => {
        if (code === RecentlyAttitudeResultEnum.Inc) {
          toast.success('(╥_╥)')
        } else {
          toast.success('ヽ (・∀・) ﾉ')
        }
      })
  }

  return (
    <li className="group relative mb-7 list-none">
      <PaperSheet />
      <div className="relative z-1 p-[18px_18px_16px] md:p-[26px_30px_22px]">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-copy-14 font-medium text-neutral-9">
            {owner.name}
            {bareLinkVerbKey && (
              <span className="ml-1.5 text-copy-13 font-normal text-neutral-7">
                {tHome(bareLinkVerbKey)}
              </span>
            )}
          </span>
          <span className="font-sans text-copy-13 tracking-[0.04em] text-neutral-5">
            <RelativeTime date={item.createdAt} />
            {item.modifiedAt && (
              <FloatPopover
                mobileAsSheet
                as="span"
                triggerElement={t('edited')}
                type="tooltip"
                wrapperClassName="text-copy-13 ml-1"
              >
                {t('edited_at')} <RelativeTime date={item.modifiedAt} />
              </FloatPopover>
            )}
          </span>
        </div>

        <div className="min-w-0 max-w-full text-copy-15 leading-[1.82] text-neutral-9">
          {item.content && (
            <EnrichmentMapProvider value={item.enrichments}>
              <Markdown forceBlock variant="comment">
                {item.content}
              </Markdown>
            </EnrichmentMapProvider>
          )}
          {companionMoment && (
            <CompanionMomentContext
              metadata={companionMoment}
              primary={isContextOnly}
            />
          )}
          {!!item.ref && <RefPreview refModel={item.ref} />}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-[22px] gap-y-2 border-t border-dashed border-border pt-3 text-label-12 text-neutral-5">
          <button
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
            onClick={() => handleUp(item.id)}
          >
            <i className="i-mingcute-heart-line" />
            <span className="sr-only">{t('like')}</span>
            <NumberSmoothTransition>{item.up}</NumberSmoothTransition>
          </button>
          <button
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
            onClick={() => handleDown(item.id)}
          >
            <i className="i-mingcute-heart-crack-line" />
            <span className="sr-only">{t('dislike')}</span>
            <NumberSmoothTransition>{item.down}</NumberSmoothTransition>
          </button>

          {item.allowComment && !isInThinkingDetailRoute && (
            <button
              className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
              onClick={() => {
                present({
                  title: t('comment'),
                  content: () => <CommentModal {...item} />,
                })
              }}
            >
              <i className="i-mingcute-comment-line" />
              <span className="sr-only">{t('comment')}</span>
              <NumberSmoothTransition>
                {item.commentsIndex}
              </NumberSmoothTransition>
            </button>
          )}

          <EditButton item={item} />
          <DeleteButton id={item.id} />

          {!isInThinkingDetailRoute && (
            <Link
              className="ml-auto inline-flex items-center gap-1 opacity-0 transition-opacity duration-250 hover:text-accent group-hover:opacity-100"
              href={routeBuilder(Routes.ThinkingItem, { id: item.id })}
            >
              <span>{t('actions_view')}</span>
              <i className="i-mingcute-arrow-right-circle-line" />
            </Link>
          )}
        </div>
      </div>
    </li>
  )
})

ThinkingItem.displayName = 'ThinkingItem'

const RefPreview: FC<{ refModel: any }> = (props) => {
  const t = useTranslations('common')
  const title = props.refModel?.title

  const url = useMemo(() => urlBuilder.build(props.refModel), [props.refModel])

  if (!title) {
    return null
  }

  return (
    <>
      <Divider className="my-4 w-12 bg-border" />
      <p className="flex items-center gap-2 text-copy-13 text-neutral-6">
        {t('published_at')} <i className="i-mingcute-link-3-line" />
        <PeekLink className="yohaku-link--underline" href={url}>
          {title}
        </PeekLink>
      </p>
    </>
  )
}

const DeleteButton = (props: { id: string }) => {
  const t = useTranslations('common')
  const isLogin = useIsOwnerLogged()
  const queryClient = useQueryClient()

  const handleDelete = () => {
    apiClient.shorthand
      .proxy(props.id)
      .delete()
      .then(() => {
        toast.success(t('delete_success'))

        queryClient.setQueryData<InfiniteData<RecentlyModel[]>>(
          QUERY_KEY,
          (old) =>
            produce(old, (draft) => {
              draft?.pages.forEach((page) => {
                page.forEach((item, index) => {
                  if (item.id === props.id) {
                    page.splice(index, 1)
                  }
                })
              })
            }),
        )
      })
  }
  const { present } = useModalStack()
  if (!isLogin) return null

  return (
    <button
      className="inline-flex items-center gap-1.5 text-error transition-colors hover:text-error/80"
      onClick={() => {
        present({
          title: t('delete_confirm_default'),
          content: ({ dismiss }) => (
            <div className="w-[300px] space-y-4">
              <div className="mt-4 flex justify-end space-x-4">
                <StyledButton
                  className="bg-neutral-2/80 text-error!"
                  variant="primary"
                  onClick={() => {
                    handleDelete()
                    dismiss()
                  }}
                >
                  {t('actions_confirm')}
                </StyledButton>
                <StyledButton variant="primary" onClick={dismiss}>
                  {t('actions_cancel')}
                </StyledButton>
              </div>
            </div>
          ),
        })
      }}
    >
      <i className="i-mingcute-delete-line" />
      <span className="sr-only">{t('actions_delete')}</span>
    </button>
  )
}

const CommentModal = (props: RecentlyModel) => {
  const t = useTranslations('common')
  const { id, allowComment, content } = props
  const companionMoment = parseCompanionMomentMetadata(props.metadata)

  return (
    <div className="max-w-[95vw] overflow-y-auto overflow-x-hidden md:w-[500px] lg:w-[600px] xl:w-[700px]">
      <span>{allowComment && t('reply_to')}</span>

      <Markdown allowsScript className="mt-4" variant="comment">
        {content}
      </Markdown>
      {companionMoment && (
        <CompanionMomentContext
          metadata={companionMoment}
          primary={!content.trim()}
        />
      )}

      {allowComment && <CommentBoxRootLazy className="my-12" refId={id} />}

      <CommentsLazy refId={id} />
    </div>
  )
}

const EditButton = (props: { item: RecentlyModel }) => {
  const t = useTranslations('common')
  const isLogin = useIsOwnerLogged()
  const queryClient = useQueryClient()
  const { present } = useModalStack()

  if (!isLogin) return null

  return (
    <button
      className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
      onClick={() => {
        present({
          title: t('actions_edit'),
          content: ({ dismiss }) => (
            <EditModal
              dismiss={dismiss}
              item={props.item}
              queryClient={queryClient}
            />
          ),
        })
      }}
    >
      <i className="i-mingcute-quill-pen-line" />
      <span className="sr-only">{t('actions_edit')}</span>
    </button>
  )
}

const EditModal = ({
  item,
  dismiss,
  queryClient,
}: {
  item: RecentlyModel
  dismiss: () => void
  queryClient: ReturnType<typeof useQueryClient>
}) => {
  const t = useTranslations('common')
  const [content, setContent] = useState(item.content)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error(t('content_empty'))
      return
    }
    setLoading(true)
    try {
      await apiClient.shorthand.proxy(item.id).put({ data: { content } })
      toast.success(t('edit_success'))
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      dismiss()
    } catch {
      toast.error(t('edit_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-[400px] max-w-[90vw] space-y-4">
      <textarea
        autoFocus
        className="h-[200px] w-full resize-none rounded-lg border border-border bg-transparent p-3 text-copy-14"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end space-x-4">
        <StyledButton disabled={loading} variant="primary" onClick={handleSave}>
          {loading ? t('actions_saving') : t('actions_save')}
        </StyledButton>
        <StyledButton variant="primary" onClick={dismiss}>
          {t('actions_cancel')}
        </StyledButton>
      </div>
    </div>
  )
}
