'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { MotionButtonBase } from '~/components/ui/button'
import { FloatPopover } from '~/components/ui/float-popover'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { resolveCommentGuard } from '../comment-guard'
import {
  CommentBoxMode,
  setCommentMode,
  useCommentBoxHasText,
  useCommentMode,
} from './hooks'

const SwitchCommentModeButton = () => {
  const t = useTranslations('comment')
  const mode = useCommentMode()
  const copyMap = {
    [CommentBoxMode.legacy]: t('switch_to_legacy'),
    [CommentBoxMode['with-auth']]: t('switch_to_auth'),
  }
  const copy = copyMap[mode]
  return (
    <>
      <i
        className={clsx(
          mode === CommentBoxMode.legacy
            ? 'i-mingcute-user-4-line'
            : 'i-material-symbols-dynamic-form-outline',
        )}
      />
      <span className="sr-only">{copy}</span>
    </>
  )
}
export const SwitchCommentMode = () => {
  const t = useTranslations('comment')
  const mode = useCommentMode()
  const copyMap = {
    [CommentBoxMode.legacy]: t('switch_to_legacy'),
    [CommentBoxMode['with-auth']]: t('switch_to_auth'),
  }
  const copy = copyMap[mode]

  const hasText = useCommentBoxHasText()

  const sessionReader = useSessionReader()
  const notLogged = !sessionReader
  const allowGuestComment = useAggregationSelector(
    (data) => data.commentOptions?.allowGuestComment,
    [],
  ) as boolean | undefined | null
  const disableComment = useAggregationSelector(
    (data) => data.commentOptions?.disableComment,
    [],
  ) as boolean | undefined | null
  const { forceAuthOnly } = resolveCommentGuard({
    allowComment: true,
    disableComment: disableComment ?? undefined,
    allowGuestComment: allowGuestComment ?? undefined,
    hasSessionReader: !!sessionReader,
  })

  const isOwnerLogged = useIsOwnerLogged()
  if (isOwnerLogged || sessionReader || forceAuthOnly) return null
  return (
    <MotionButtonBase
      className={clsx(
        'absolute left-0 top-0 z-10 rounded-full text-copy-13',
        'size-6 border border-neutral-3',
        'bg-neutral-2',
        'center flex cursor-pointer',
        'text-neutral-9/50',
        'opacity-0 transition-opacity duration-200 group-[:hover]:opacity-100',
        mode === CommentBoxMode['legacy'] && 'bottom-0 top-auto',
        hasText ||
          (notLogged &&
            mode === CommentBoxMode['with-auth'] &&
            'invisible opacity-0'),
      )}
      onClick={() => {
        setCommentMode(
          mode === CommentBoxMode.legacy
            ? CommentBoxMode['with-auth']
            : CommentBoxMode['legacy'],
        )
      }}
    >
      <FloatPopover TriggerComponent={SwitchCommentModeButton} type="tooltip">
        {copy}
      </FloatPopover>
    </MotionButtonBase>
  )
}
