'use client'

import { attachSelectionInk } from '@yohaku/rich-content/src/lib/highlighter-ink.ts'
import type { RefObject } from 'react'
import { useEffect } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'

export function useSelectionInk(containerRef: RefObject<HTMLElement | null>) {
  const isDark = useIsDark()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    return attachSelectionInk(container, {
      vivid: isDark ? 'screen' : undefined,
    })
  }, [containerRef, isDark])
}
