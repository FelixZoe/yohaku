'use client'

import { memo, useEffect } from 'react'

import { usePathname } from '~/i18n/navigation'
import { springScrollToTop } from '~/lib/scroller'

export const ScrollTop = memo(() => {
  const pathname = usePathname()
  useEffect(() => {
    springScrollToTop()
  }, [pathname])
  return null
})

ScrollTop.displayName = 'ScrollTop'
