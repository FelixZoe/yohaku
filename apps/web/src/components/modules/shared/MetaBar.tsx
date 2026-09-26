'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { useCurrentRoomCount } from '~/atoms/hooks/activity'
import { FloatPopover } from '~/components/ui/float-popover'
import { clsxm } from '~/lib/helper'

import { useMaybeInRoomContext } from '../activity'

export const CurrentReadingCountingMetaBarItem: FC<{
  leftElement?: React.ReactNode
  className?: string
}> = ({ leftElement, className }) => {
  const t = useTranslations('activity')
  const roomCtx = useMaybeInRoomContext()
  const count = useCurrentRoomCount(roomCtx?.roomName || '')

  if (!roomCtx) return null

  const hasOthers = count > 1
  const displayLabel = `${t('current_readers')}${count}${t('reading_now')}`

  return (
    <>
      {leftElement}
      <FloatPopover
        asChild
        mobileAsSheet
        type="tooltip"
        triggerElement={
          <span
            aria-label={hasOthers ? displayLabel : undefined}
            className={clsxm(
              'inline-flex items-center gap-1 tabular-nums transition-opacity duration-300',
              hasOthers ? 'opacity-100' : 'opacity-40',
              className,
            )}
          >
            <i className="i-mingcute-eye-2-fill shrink-0" />
            <span
              aria-hidden={!hasOthers}
              className={clsxm(
                'inline-block min-w-[2ch] text-center transition-opacity duration-300',
                hasOthers ? 'opacity-100' : 'opacity-0',
              )}
            >
              {hasOthers ? count : 0}
            </span>
          </span>
        }
      >
        {hasOthers ? displayLabel : t('realtime_tooltip')}
      </FloatPopover>
    </>
  )
}
