'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { useSessionReader } from '~/atoms/hooks/reader'
import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { AutoResizeHeight } from '~/components/modules/shared/AutoResizeHeight'
import { clsxm } from '~/lib/helper'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { resolveCommentGuard } from '../comment-guard'
import type { CommentBaseProps } from '../types'
import { CommentBoxAuthedInput } from './AuthedInput'
import { CommentBoxLegacyForm } from './CommentBoxLegacyForm'
import { CommentBoxMode, setCommentMode, useCommentMode } from './hooks'
import { CommentBoxProvider, CommentCompactContext } from './providers'
import { CommentBoxSignedOutContent } from './SignedOutContent'
import { SwitchCommentMode } from './SwitchCommentMode'

export const CommentBoxRoot: Component<CommentBaseProps> = (props) => {
  const t = useTranslations('comment')
  const {
    refId,
    className,
    afterSubmit,
    initialValue,
    autoFocus,
    anchor,
    compact,
  } = props

  const mode = useCommentMode()

  const sessionReader = useSessionReader()
  const allowGuestComment = useAggregationSelector(
    (data) => data.commentOptions?.allowGuestComment,
    [],
  ) as boolean | undefined | null
  const disableComment = useAggregationSelector(
    (data) => data.commentOptions?.disableComment,
    [],
  ) as boolean | undefined | null
  const { commentsClosed, forceAuthOnly } = resolveCommentGuard({
    allowComment: true,
    disableComment: disableComment ?? undefined,
    allowGuestComment: allowGuestComment ?? undefined,
    hasSessionReader: !!sessionReader,
  })

  useEffect(() => {
    if (sessionReader || forceAuthOnly) {
      setCommentMode(CommentBoxMode['with-auth'])
    }
  }, [forceAuthOnly, sessionReader])

  if (commentsClosed) {
    return (
      <p className="mt-[7.1rem] text-center text-title-20 font-medium">
        {t('comments_closed')}
      </p>
    )
  }

  return (
    <ErrorBoundary>
      <CommentCompactContext value={!!compact}>
        <CommentBoxProvider
          afterSubmit={afterSubmit}
          anchor={anchor}
          initialValue={initialValue}
          refId={refId}
        >
          <div
            data-hide-print
            className={clsxm('group relative w-full min-w-0', className)}
          >
            {!compact && <SwitchCommentMode />}

            <div className="relative w-full">
              {mode === CommentBoxMode.legacy ? (
                <CommentBoxLegacy autoFocus={autoFocus} />
              ) : (
                <CommentBoxWithAuth autoFocus={autoFocus} />
              )}
            </div>
          </div>
        </CommentBoxProvider>
      </CommentCompactContext>
    </ErrorBoundary>
  )
}

const commentBoxResizeClassName = 'px-1'

const CommentBoxLegacy: Component<{ autoFocus?: boolean }> = ({
  autoFocus,
}) => (
  <AutoResizeHeight className={commentBoxResizeClassName}>
    <CommentBoxLegacyForm autoFocus={autoFocus} />
  </AutoResizeHeight>
)

const CommentBoxWithAuth: Component<{ autoFocus?: boolean }> = ({
  autoFocus,
}) => {
  const isReaderLogin = !!useSessionReader()

  return (
    <AutoResizeHeight className={commentBoxResizeClassName}>
      {!isReaderLogin ? (
        <CommentBoxSignedOutContent />
      ) : (
        <CommentBoxAuthedInput autoFocus={autoFocus} />
      )}
    </AutoResizeHeight>
  )
}
