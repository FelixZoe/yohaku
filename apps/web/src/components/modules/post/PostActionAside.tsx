'use client'

import { m, useAnimationControls } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { MotionButtonBase } from '~/components/ui/button'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { clsxm } from '~/lib/helper'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { toast } from '~/lib/toast'
import { urlBuilder } from '~/lib/url-builder'
import {
  getGlobalCurrentPostData,
  setGlobalCurrentPostData,
  useCurrentPostDataSelector,
} from '~/providers/post/CurrentPostDataProvider'
import { useIsEoFWrappedElement } from '~/providers/shared/WrappedElementProvider'

import { ArticleRightAside } from '../shared/ArticleRightAside'
import {
  AsideActionMark,
  AsideDonatePopover,
  useDonateAction,
} from '../shared/AsideActionControl'
import type { CommentModalProps } from '../shared/CommentModal'
import { useLikeAction } from '../shared/useLikeAction'
import { usePresentCommentModal } from '../shared/usePresentCommentModal'
import { useShareAction } from '../shared/useShareAction'
import { usePresentSubscribeModal } from '../subscribe'

export const usePostLikeAction = (id: string, initialCount: number) => {
  const onLiked = useCallback(() => {
    setGlobalCurrentPostData((draft) => {
      draft.data.likeCount += 1
    })
  }, [])

  return useLikeAction({
    id,
    initialCount,
    kind: 'Post',
    onLiked,
  })
}

export const PostBottomBarAction: Component = () => {
  const isMobile = useIsMobile()
  if (!isMobile) return null
  return (
    <div className="my-6 flex items-center justify-center space-x-8">
      <LikeButton />
      <ShareButton />
      <SubscribeButton />
      <AsideDonateButton />
    </div>
  )
}

/**
 * PostActionAside - 排版边注风格
 *
 * 直接作为 TOC 底部插槽渲染，避免独立绝对定位追着 TOC 布局壳做几何补偿。
 */
export const PostActionAside: Component = ({ className }) => {
  return (
    <ArticleRightAside
      tocFooterSlot={
        <aside
          aria-label="文章操作"
          className={clsxm(
            'flex max-h-[400px] flex-col gap-4 p-4',
            'transition-opacity duration-300',
            className,
          )}
        >
          <LikeMark />
          <ShareMark />
          <SubscribeMark />
          <DonateMark />
          <PostAsideCommentMark />
        </aside>
      }
    />
  )
}

const PostAsideCommentMark = () => {
  const { title, id } =
    useCurrentPostDataSelector((data) => ({
      title: data?.title,
      id: data?.id,
    })) || {}
  const isEof = useIsEoFWrappedElement()
  if (!id) return null
  if (isEof) return null

  return <AsideCommentMark refId={id} title={title!} />
}

const AsideCommentMark = (props: CommentModalProps) => {
  const { canPresent, commentLabel, presentCommentModal } =
    usePresentCommentModal(props)

  if (!canPresent) return null

  return (
    <AsideActionMark
      activeColor="text-pink-500"
      iconClass="i-mingcute-comment-line"
      iconClassActive="i-mingcute-comment-fill"
      label={commentLabel}
      onClick={presentCommentModal}
    />
  )
}

const SubscribeMark = () => {
  const { present } = usePresentSubscribeModal(['post_c'])
  return (
    <AsideActionMark
      activeColor="text-accent"
      iconClass="i-mingcute-notification-line"
      iconClassActive="i-mingcute-notification-fill"
      label="订阅"
      onClick={present}
    />
  )
}

const LikeMark = () => {
  const t = useTranslations('common')
  const control = useAnimationControls()

  const id = useCurrentPostDataSelector((data) => data?.id)
  const initialLikeCount = useCurrentPostDataSelector((data) => data?.likeCount)
  const { handleLike, isLiked, likeCount } = usePostLikeAction(
    id ?? '',
    initialLikeCount ?? 0,
  )

  if (!id) return null

  return (
    <AsideActionMark
      active={isLiked}
      activeColor="text-warning"
      count={likeCount || undefined}
      iconClass="i-mingcute-thumb-up-line"
      iconClassActive="i-mingcute-thumb-up-fill"
      label={t('aria_like_post')}
      onClick={() => {
        handleLike()
        control.start('tap')
        toast.success(t('like_post'), {
          iconElement: (
            <m.i
              animate={{ scale: 1.22 }}
              className="text-warning"
              initial={{ scale: 0.96 }}
            >
              <i className="i-mingcute-thumb-up-fill" />
            </m.i>
          ),
        })
      }}
    />
  )
}

const ShareMark = () => {
  const t = useTranslations('common')
  const { canShare, handleShare } = useShareAction({
    getModel: () => getGlobalCurrentPostData()?.data,
    buildUrl: (post) =>
      urlBuilder(
        routeBuilder(Routes.Post, {
          slug: post.slug,
          category: post.category.slug,
        }),
      ).href,
  })

  if (!canShare) return null

  return (
    <AsideActionMark
      activeColor="text-info"
      iconClass="i-mingcute-share-forward-line"
      label={t('aria_share_post')}
      onClick={handleShare}
    />
  )
}

const DonateMark = () => {
  const { canRender, donateLabel, openDonate } = useDonateAction()

  if (!canRender) return null

  return (
    <AsideDonatePopover
      triggerElement={
        <AsideActionMark
          activeColor="text-red-400"
          iconClass="i-mingcute-gift-line"
          iconClassActive="i-mingcute-gift-fill"
          label={donateLabel}
          onClick={openDonate}
        />
      }
    />
  )
}

const AsideDonateButton = () => {
  const { canRender, openDonate } = useDonateAction()

  if (!canRender) return null

  return (
    <MotionButtonBase className="flex flex-col space-y-2" onClick={openDonate}>
      <i className="i-mingcute-heart-fill text-title-24 opacity-80 duration-200 hover:opacity-100 hover:text-red-400" />
    </MotionButtonBase>
  )
}

const LikeButton = () => {
  const t = useTranslations('common')
  const control = useAnimationControls()

  const id = useCurrentPostDataSelector((data) => data?.id)
  const initialLikeCount = useCurrentPostDataSelector((data) => data?.likeCount)
  const { handleLike, isLiked, likeCount } = usePostLikeAction(
    id ?? '',
    initialLikeCount ?? 0,
  )

  if (!id) return null

  return (
    <MotionButtonBase
      aria-label={t('aria_like_post')}
      className="relative flex flex-col space-y-2"
      onClick={() => {
        handleLike()
        control.start('tap')
        toast.success(t('like_post'), {
          iconElement: (
            <m.i
              animate={{ scale: 1.22 }}
              className="text-warning"
              initial={{ scale: 0.96 }}
            >
              <i className="i-mingcute-thumb-up-line" />
            </m.i>
          ),
        })
      }}
    >
      <m.i
        animate={control}
        transition={{ ease: 'easeInOut' }}
        className={clsxm(
          'relative flex text-title-24 opacity-80 duration-200 hover:opacity-100 hover:text-warning',
          isLiked && 'text-warning',
        )}
        variants={{
          tap: { scale: 1.3 },
        }}
      >
        <i className="i-mingcute-thumb-up-line" />
        {!!likeCount && (
          <span className="absolute -bottom-1 -right-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-label-12 font-medium text-white">
            <NumberSmoothTransition>
              {likeCount > 99 ? '99+' : likeCount}
            </NumberSmoothTransition>
          </span>
        )}
      </m.i>
    </MotionButtonBase>
  )
}

const ShareButton = () => {
  const t = useTranslations('common')
  const { canShare, handleShare } = useShareAction({
    getModel: () => getGlobalCurrentPostData()?.data,
    buildUrl: (post) =>
      urlBuilder(
        routeBuilder(Routes.Post, {
          slug: post.slug,
          category: post.category.slug,
        }),
      ).href,
  })

  if (!canShare) return null

  return (
    <MotionButtonBase
      aria-label={t('aria_share_post')}
      className="flex flex-col space-y-2"
      onClick={handleShare}
    >
      <i className="i-mingcute-share-forward-line text-title-24 opacity-80 duration-200 hover:opacity-100 hover:text-info" />
    </MotionButtonBase>
  )
}

const SubscribeButton = () => {
  const { present } = usePresentSubscribeModal(['post_c'])
  return (
    <MotionButtonBase className="flex flex-col space-y-2" onClick={present}>
      <i className="i-mingcute-notification-line text-title-24 opacity-80 duration-200 hover:opacity-100 hover:text-accent" />
    </MotionButtonBase>
  )
}
