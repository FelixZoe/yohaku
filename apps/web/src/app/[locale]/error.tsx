'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

// import { captureException } from '@sentry/nextjs'
import { NormalContainer } from '~/components/layout/container/Normal'
import { StyledButton } from '~/components/ui/button'
import { isChunkError, tryReloadForChunkError } from '~/lib/chunk-error'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

export default ({ error, reset }: any) => {
  const t = useTranslations('error')
  const owner = useAggregationSelector((state) => {
    const socialIds = state.user.socialIds
    return {
      email: socialIds?.email || socialIds?.mail,
      name: state.user.name,
    }
  })
  useEffect(() => {
    if (isChunkError(error) && tryReloadForChunkError()) return
    console.error('error', error)
    // captureException(error)
  }, [error])

  return (
    <NormalContainer>
      <div className="center flex min-h-[calc(100vh-10rem)] flex-col">
        <h2 className="mb-5 text-center">
          <p>{t('render_error')}</p>
          <p>
            {t('render_error_contact')}
            {owner?.name ? (
              <>
                {' '}
                {owner.email ? (
                  <a href={`mailto:${owner.email}`}>{owner.name}</a>
                ) : (
                  owner.name
                )}
              </>
            ) : null}
            {t('render_error_thanks')}
          </p>
        </h2>
        <StyledButton variant="primary" onClick={() => location.reload()}>
          {t('refresh')}
        </StyledButton>
      </div>
    </NormalContainer>
  )
}
