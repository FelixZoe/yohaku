'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { useSessionReader } from '~/atoms/hooks/reader'
import { StyledButton } from '~/components/ui/button'
import {
  fieldBaseClassName,
  inputRoundedMap,
} from '~/components/ui/input/styles'
import { clsxm } from '~/lib/helper'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'
import { AuthProvidersRender, useAuthProviders } from '~/queries/hooks/authjs'

import { resolveCommentGuard } from '../comment-guard'
import { CommentBoxMode, setCommentMode } from './hooks'

export function CommentBoxSignedOutContent() {
  const t = useTranslations('comment')
  const isReaderLogin = !!useSessionReader()
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
    hasSessionReader: isReaderLogin,
  })
  const providers = useAuthProviders()
  const hasProviders = providers && Object.keys(providers).length > 0

  useEffect(() => {
    if (!providers) return
    if (Object.keys(providers).length === 0 && !forceAuthOnly) {
      setCommentMode(CommentBoxMode.legacy)
    }
  }, [forceAuthOnly, providers])

  if (isReaderLogin) return null

  return (
    <div
      className={clsxm(
        'center flex min-h-[150px] w-full flex-col gap-4 p-6',
        fieldBaseClassName,
        inputRoundedMap.xl,
      )}
    >
      {(hasProviders || forceAuthOnly) && (
        <>
          <p className="text-copy-13">{t('signIn_social')}</p>
          {hasProviders && <AuthProvidersRender />}
        </>
      )}

      {!forceAuthOnly && (
        <StyledButton
          className={clsx(hasProviders ? 'mt-2' : '')}
          type="button"
          variant="secondary"
          onClick={() => {
            setCommentMode(CommentBoxMode.legacy)
          }}
        >
          {t('guest_comment')}
        </StyledButton>
      )}
    </div>
  )
}
