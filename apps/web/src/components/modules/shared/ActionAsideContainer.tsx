'use client'

import clsx from 'clsx'

import { usePageScrollElement, useViewport } from '~/atoms/hooks/viewport'
import { clsxm } from '~/lib/helper'
import { usePageScrollLocationSelector } from '~/providers/root/page-scroll-info-provider'
import { useIsEoFWrappedElement } from '~/providers/shared/WrappedElementProvider'

const asideButtonStyles = {
  base: 'text-title-28 opacity-80 duration-200 hover:opacity-100 relative',
}
export const ActionAsideContainer: Component = ({ className, children }) => {
  const isEOA = useIsEoFWrappedElement()
  const h = useViewport((v) => v.h)

  const scrollElement = usePageScrollElement()
  const isEndOfPage = usePageScrollLocationSelector(
    (y) => {
      const threshold = 100

      return y + h >= scrollElement.scrollHeight - threshold
    },
    [h, scrollElement],
  )

  return (
    <div
      className={clsxm(
        'absolute bottom-0 left-0 -mb-4 flex max-h-[400px] p-4 transition-all duration-200 ease-in-out',
        !isEOA ? 'opacity-20 hover:opacity-100' : '',
        className,
      )}
    >
      <div
        className={clsx(
          isEndOfPage && '-rotate-90 [&>button]:!rotate-90',
          'flex origin-top-left flex-col gap-4 duration-200 ease-in-out [&>button]:duration-200',
        )}
      >
        {children}
      </div>
    </div>
  )
}
