'use client'

import { clsxm } from '~/lib/helper'
import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'

import {
  AsideActionMark,
  AsideDonatePopover,
  useDonateAction,
} from '../shared/AsideActionControl'
import type { CommentModalProps } from '../shared/CommentModal'
import { usePresentCommentModal } from '../shared/usePresentCommentModal'

/**
 * PageActionAside - 排版边注风格
 *
 * 设计语言：与 Post 风格一致
 * - 简洁图标 + 文字，无边框无背景
 * - hover 时显示标签文字
 */
export const PageActionAside: Component = ({ className }) => {
  return (
    <aside
      aria-label="页面操作"
      className={clsxm(
        'flex max-h-[400px] flex-col gap-4 p-4',
        'transition-opacity duration-300',
        className,
      )}
    >
      <PageAsideCommentMark />
      <DonateMark />
    </aside>
  )
}

const PageAsideCommentMark = () => {
  const { title, id } =
    useCurrentPageDataSelector((data) => ({
      title: data?.title,
      id: data?.id,
    })) || {}
  if (!id) return null
  return <AsideCommentMark refId={id} title={title!} />
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
