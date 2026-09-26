'use client'

import { useTranslations } from 'next-intl'
import type { FC, PropsWithChildren } from 'react'
import { ErrorBoundary as ErrorBoundaryLib } from 'react-error-boundary'
import { tv } from 'tailwind-variants'

import { isChunkError, tryReloadForChunkError } from '~/lib/chunk-error'

import { StyledButton } from '../ui/button'

const fallbackStyles = tv({
  base: 'flex items-center',
  variants: {
    variant: {
      block:
        'w-full flex-col justify-center rounded-xl bg-neutral-6/5 py-6 gap-3',
      inline: 'flex-row rounded-lg bg-neutral-6/5 px-3 py-2 gap-2',
    },
  },
})

const BlockFallback = () => {
  const t = useTranslations('common')
  return (
    <div className={fallbackStyles({ variant: 'block' })}>
      <div className="flex size-10 items-center justify-center rounded-full bg-neutral-6/10">
        <i className="i-mingcute-alert-line text-copy-16 opacity-60" />
      </div>
      <p className="text-copy-13 font-medium">
        {t('error_boundary_block_title')}
      </p>
      <p className="text-label-12 opacity-60">
        {t('error_boundary_block_subtitle')}
      </p>
      <StyledButton
        className="mt-1"
        onClick={() => {
          window.location.reload()
        }}
      >
        {t('actions_refresh')}
      </StyledButton>
    </div>
  )
}

const InlineFallback = () => {
  const t = useTranslations('common')
  return (
    <div className={fallbackStyles({ variant: 'inline' })}>
      <i className="i-mingcute-alert-line size-3.5 opacity-40" />
      <span className="text-label-12 opacity-50">
        {t('error_boundary_inline_text')}
      </span>
    </div>
  )
}

export const ErrorBoundary: FC<
  PropsWithChildren<{ variant?: 'block' | 'inline' }>
> = ({ children, variant = 'block' }) => (
  <ErrorBoundaryLib
    fallbackRender={() =>
      variant === 'inline' ? <InlineFallback /> : <BlockFallback />
    }
    onError={(e) => {
      if (isChunkError(e) && tryReloadForChunkError()) return
      console.error(e)
      // TODO  sentry
    }}
  >
    {children}
  </ErrorBoundaryLib>
)
