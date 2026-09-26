'use client'

import { useInView } from 'react-intersection-observer'

import { clsxm } from '~/lib/helper'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

export const Signature = () => {
  const signatureConfig = useAppConfigSelector(
    (state) => state.module.signature,
  )
  const signature = signatureConfig?.svg
  const animated = signatureConfig?.animated ?? true
  const { ref, inView } = useInView()
  if (!signature) return null

  return (
    <div
      data-hide-print
      key={animated && inView ? 'signature' : 'signature-pause'}
      ref={ref}
      className={clsxm(
        'my-2 flex w-full justify-end',
        animated && !inView && 'paused',
        !animated && 'paused',
      )}
      dangerouslySetInnerHTML={{
        __html: signature,
      }}
    />
  )
}
