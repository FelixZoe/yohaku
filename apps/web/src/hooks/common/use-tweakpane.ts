'use client'

import type { RefObject } from 'react'
import { useEffect } from 'react'
import type { Pane } from 'tweakpane'

type Build = (pane: Pane) => void | (() => void)

export function useTweakpane(
  hostRef: RefObject<HTMLElement | null>,
  title: string,
  build: Build,
  deps: unknown[],
) {
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let teardown: (() => void) | undefined

    void (async () => {
      const { Pane } = await import('tweakpane')
      if (disposed) return
      const pane = new Pane({ container: host, title })
      const extra = build(pane)
      teardown = () => {
        extra?.()
        pane.dispose()
      }
    })()

    return () => {
      disposed = true
      teardown?.()
    }
  }, deps)
}
