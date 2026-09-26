import './Comment.css'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { atom, useAtomValue } from 'jotai'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { FC, PropsWithChildren } from 'react'
import {
  createContext,
  memo,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { Avatar } from '~/components/ui/avatar'
import { FloatPopover } from '~/components/ui/float-popover'
import { BlockLinkRenderer } from '~/components/ui/markdown/renderers/LinkRenderer'
import { RelativeTime } from '~/components/ui/relative-time'
import {
  getStrategyIconComponent,
  UserAuthStrategyIcon,
} from '~/components/ui/user/UserAuthStrategyIcon'
import { softSpringPreset } from '~/constants/spring'
import type { AuthSocialProviders } from '~/lib/authjs'
import { apiClient } from '~/lib/request'
import { jotaiStore } from '~/lib/store'
import { buildCommentsQueryKey } from '~/queries/keys'

import { CommentActionButtonGroup } from './CommentActionButtonGroup'
import { useCommentBoxRefIdValue } from './CommentBox/hooks'
import { CommentMarkdown } from './CommentMarkdown'
import {
  CommentModerationBadge,
  useCommentModeration,
} from './CommentModeration'
import { CommentPinButton, OcticonGistSecret } from './CommentPinButton'
import {
  CommentMarkdownContainerRefContext,
  useCommentById,
  useCommentByIdSelector,
  useCommentMarkdownContainerRef,
  useCommentReader,
} from './CommentProvider'
import {
  type CommentThreadInfiniteData,
  type CommentThreadViewItem,
  type CommentWithAnchor,
  mergeThreadRepliesIntoPages,
} from './thread'

export const Comment: Component<{
  commentId: string
  className?: string
}> = memo(function Comment(props) {
  const { commentId, className } = props
  const comment = useCommentById(commentId)

  if (!comment) return null
  // FIXME 兜一下后端给的脏数据
  if (typeof comment === 'string') return null
  return <CommentRender className={className} comment={comment} />
})
const CommentRender: Component<{
  comment: CommentThreadViewItem
}> = (props) => {
  const { comment, className } = props
  const t = useTranslations('comment')
  const tMembership = useTranslations('membership')

  const elAtom = useMemo(() => atom<HTMLDivElement | null>(null), [])
  const isSingleLinkContent = useMemo(() => {
    const trimmedContent = comment.text
    if (!trimmedContent) return false
    const isSingleLine = trimmedContent.split('\n').length === 1
    const isURL = URL.canParse(trimmedContent)

    return isSingleLine && isURL
  }, [comment.text])
  const reader = useCommentReader(comment.readerId)
  const moderation = useCommentModeration(comment.id)

  const {
    id: cid,

    authProvider,
    text,
    location,
    isWhispers,
    url,
  } = comment

  const avatar = reader?.image || comment.avatar
  const rawAuthor = reader?.name || comment.author
  const author =
    (typeof rawAuthor === 'string' ? rawAuthor.trim() : '') ||
    t('author_fallback')
  const parentId = comment.parentCommentId ?? null
  const displayText = comment.isDeleted ? t('deleted_placeholder') : text

  const authorUrl = useMemo(() => {
    if (url) return url
    if (authProvider === 'github' && reader?.handle) {
      return `https://github.com/${reader.handle}`
    }
    return null
  }, [authProvider, url, reader?.handle])

  const authorElement = authorUrl ? (
    <a
      className="max-w-full shrink-0 break-all"
      href={authorUrl}
      rel="noreferrer"
      target="_blank"
    >
      {author}
    </a>
  ) : (
    <span className="max-w-full shrink-0 break-all">{author}</span>
  )

  const ownerBadge =
    reader?.role === 'owner' ? (
      <span
        className={clsx(
          'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5',
          'text-label-12 font-medium leading-none',
          'bg-accent/10 text-accent',
        )}
      >
        {t('owner_badge')}
      </span>
    ) : null

  const isMember = !!reader?.isMember && reader.role !== 'owner'
  const memberBadge = isMember ? (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5',
        'text-label-12 font-medium leading-none',
        'bg-accent/10 text-accent',
      )}
    >
      <i className="i-mingcute-vip-1-line size-3" />
      {tMembership('badge_member')}
    </span>
  ) : null

  const { anchor } = comment

  const CommentNormalContent = (
    <div
      className={clsx(
        'comment__message',
        'relative inline-block rounded-xl text-neutral-9',
        'border border-[var(--field-border)] bg-[var(--field-bg)]',
        '[background-image:var(--field-gradient)]',
        'shadow-[var(--field-shadow)]',
        'max-w-[calc(100%-3rem)]',
        'rounded-tl-sm md:rounded-bl-sm md:rounded-tl-xl',
        'ml-4 px-3 py-2 md:ml-0',
        moderation && 'border-dashed opacity-75',
      )}
    >
      {anchor?.mode === 'range' && (
        <div className="mb-1.5 border-l-2 border-accent/40 pl-2 text-label-12 italic text-neutral-6">
          {anchor.quote}
        </div>
      )}
      {anchor?.mode === 'block' && (
        <div className="mb-1.5 text-label-12 text-neutral-6">
          <span>
            {t('commented_on_block', {
              text: `${anchor.snapshotText.slice(0, 40)}${anchor.snapshotText.length > 40 ? '…' : ''}`,
            })}
          </span>
        </div>
      )}
      <CommentMarkdownContainerRefContext>
        <CommentMarkdown>{displayText}</CommentMarkdown>

        <EditedCommentFooter commentId={comment.id} />
      </CommentMarkdownContainerRefContext>

      {!moderation && <CommentActionButtonGroup commentId={comment.id} />}
    </div>
  )
  return (
    <>
      <CommentHolderContext value={elAtom}>
        <m.li
          className={clsx('relative my-2', className)}
          data-comment-id={cid}
          data-parent-id={parentId}
          data-reader-id={comment.readerId}
          transition={softSpringPreset}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          initial={
            comment['new']
              ? {
                  opacity: 0,
                  scale: 0.93,
                  y: 20,
                }
              : true
          }
        >
          <div className="group flex w-full items-stretch gap-4">
            <div
              className={clsx(
                'flex shrink-0 self-end md:relative md:w-9',
                'absolute top-0 z-1',
              )}
            >
              <Avatar
                alt={t('avatar_alt', { author })}
                src={avatar}
                className={clsx(
                  'size-6 bg-neutral-3 ring-2 md:size-9',
                  isMember ? 'ring-accent/60' : 'ring-neutral-3',
                )}
              />
              {authProvider &&
                !!getStrategyIconComponent(
                  authProvider as AuthSocialProviders,
                ) && (
                  <div className="center absolute bottom-0 -right-1.5 flex size-3.5 rounded-full bg-neutral-1 ring-[1.5px] ring-neutral-3">
                    <UserAuthStrategyIcon
                      className="size-3"
                      strategy={authProvider as AuthSocialProviders}
                    />
                  </div>
                )}
            </div>

            {/* Header */}
            <div
              className={clsx(
                'flex flex-1 flex-col',
                'w-full min-w-0 items-start',
              )}
            >
              <span
                className={clsx(
                  'flex items-center gap-2 font-semibold text-neutral-9',
                  'relative w-full min-w-0 justify-center',
                  'mb-2 pl-10 md:pl-0',
                )}
              >
                <span className="ml-2 flex grow flex-col flex-wrap items-start gap-0.5 md:flex-row md:items-center md:gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {authorElement}
                    {ownerBadge}
                    {memberBadge}
                    {moderation && <CommentModerationBadge item={moderation} />}
                  </span>
                  <span className="-mt-1 flex min-w-0 shrink select-none flex-wrap items-center space-x-2 md:mt-0 md:self-end">
                    <span className="inline-flex shrink-0 text-[0.71rem] font-medium opacity-40">
                      <RelativeTime date={comment.createdAt} />
                    </span>
                    {!!location && (
                      <span className="min-w-0 max-w-full truncate break-all text-[0.71rem] opacity-35">
                        {t('from_location', { location })}
                      </span>
                    )}
                    {!!isWhispers && <OcticonGistSecret />}
                  </span>
                </span>

                {!moderation && (
                  <span className="shrink-0">
                    <CommentPinButton comment={comment} />
                  </span>
                )}
              </span>

              {/* Content */}
              {isSingleLinkContent && !moderation ? (
                <div className="relative inline-block">
                  <BlockLinkRenderer
                    fallback={CommentNormalContent}
                    href={text}
                    accessory={
                      <CommentActionButtonGroup
                        className="bottom-4"
                        commentId={comment.id}
                      />
                    }
                  />
                </div>
              ) : (
                CommentNormalContent
              )}
            </div>
          </div>
        </m.li>

        <CommentBoxHolderProvider />
      </CommentHolderContext>
      {comment.replyWindow?.hasHidden && (
        <LoadMoreRepliesButton comment={comment} />
      )}
      {comment.children.length > 0 && (
        <ul className="my-3 space-y-3">
          {comment.children.map((child) => (
            <Comment className="ml-9" commentId={child.id} key={child.id} />
          ))}
        </ul>
      )}
    </>
  )
}

const LoadMoreRepliesButton: FC<{
  comment: CommentThreadViewItem
}> = ({ comment }) => {
  const t = useTranslations('comment')
  const queryClient = useQueryClient()
  const refId = useCommentBoxRefIdValue()
  const [remaining, setRemaining] = useState(
    comment.replyWindow?.hiddenCount ?? 0,
  )

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      return apiClient.comment.getThreadReplies(comment.id, {
        cursor: comment.replyWindow?.nextCursor,
        size: 10,
      })
    },
    onSuccess: (result) => {
      const replyWindow = {
        total:
          comment.replyWindow?.total ??
          comment.replyCount ??
          result.replies.length,
        returned: (comment.replies?.length ?? 0) + result.replies.length,
        threshold: comment.replyWindow?.threshold ?? 20,
        hasHidden: !result.done,
        hiddenCount: result.remaining,
        nextCursor: result.nextCursor,
      }

      queryClient.setQueriesData<CommentThreadInfiniteData>(
        { queryKey: buildCommentsQueryKey(refId) },
        (oldData) => {
          if (!oldData) return oldData
          return mergeThreadRepliesIntoPages(oldData, {
            rootCommentId: comment.id,
            replies: result.replies as unknown as CommentWithAnchor[],
            replyWindow,
          })
        },
      )
      setRemaining(result.remaining)
    },
  })

  if (!comment.replyWindow?.hasHidden) return null

  return (
    <div className="ml-13 mt-2">
      <button
        className="cursor-pointer rounded-full border border-neutral-3 px-3 py-1 text-label-12 text-neutral-7 transition-colors hover:border-neutral-4 hover:text-neutral-9"
        disabled={isPending}
        type="button"
        onClick={() => mutateAsync()}
      >
        {isPending
          ? t('loading_more_replies')
          : t('load_more_replies', {
              count: remaining || comment.replyWindow.hiddenCount,
            })}
      </button>
    </div>
  )
}

const CommentHolderContext = createContext(atom(null as null | HTMLDivElement))

const CommentBoxHolderProvider = () => {
  const ref = useRef<HTMLDivElement>(null)
  const commentBoxHolderElementAtom = use(CommentHolderContext)
  useLayoutEffect(() => {
    jotaiStore.set(commentBoxHolderElementAtom, ref.current)

    return () => {
      jotaiStore.set(commentBoxHolderElementAtom, null)
    }
  }, [commentBoxHolderElementAtom])
  return <div ref={ref} />
}

export const CommentBoxHolderPortal = (props: PropsWithChildren) => {
  const portalElement = useAtomValue(use(CommentHolderContext))

  if (!portalElement) return null

  return createPortal(props.children, portalElement)
}

const EditedCommentFooter: FC<{
  commentId: string
}> = ({ commentId }) => {
  const t = useTranslations('common')
  const editedAt = useCommentByIdSelector(
    commentId,
    useCallback((comment) => comment?.editedAt, []),
  )
  const ref = useCommentMarkdownContainerRef()

  const lastNode = useMemo(() => {
    if (!ref) return null
    return ref.lastChild
  }, [ref])
  const lastNodeIsParagraph = useMemo(() => {
    if (!lastNode) return false
    return lastNode.nodeName === 'P'
  }, [lastNode])

  if (!editedAt) return null

  const InlineEl = (
    <FloatPopover
      type="tooltip"
      triggerElement={
        <span className="ml-2 text-label-12 text-neutral-7">{t('edited')}</span>
      }
    >
      <div>
        <span>{t('edited_at')}</span> <RelativeTime date={editedAt} />
      </div>
    </FloatPopover>
  )
  if (!lastNodeIsParagraph) return <div className="[&_*]:!ml-0">{InlineEl}</div>

  return createPortal(InlineEl, lastNode as HTMLDivElement)
}
