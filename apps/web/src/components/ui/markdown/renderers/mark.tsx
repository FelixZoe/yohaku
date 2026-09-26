'use client'

import { attachMarkInk } from '@yohaku/rich-content/src/lib/highlighter-ink.ts'
import type { PropsWithChildren } from 'react'
import { useEffect, useRef } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'

export const MMark = ({ children }: PropsWithChildren) => {
  const ref = useRef<HTMLElement>(null)
  const isDark = useIsDark()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return attachMarkInk(el, { vivid: isDark ? 'screen' : undefined })
  }, [isDark])

  return (
    <mark className="rounded-md" ref={ref}>
      <span className="px-1">{children}</span>
    </mark>
  )
}
