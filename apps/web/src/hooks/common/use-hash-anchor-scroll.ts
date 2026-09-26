'use client'

import type { RefObject } from 'react'
import { useEffect } from 'react'

import { springScrollToElement } from '~/lib/scroller'

interface Options {
  delta?: number
  fallback?: (container: HTMLElement, decoded: string) => HTMLElement | null
  maxAttempts?: number
}

export function useHashAnchorScroll(
  containerRef: RefObject<HTMLElement | null>,
  trigger: unknown,
  { fallback, delta = -100, maxAttempts = 30 }: Options = {},
) {
  useEffect(() => {
    if (!trigger) return
    const rawHash = window.location.hash.slice(1)
    if (!rawHash) return

    const decoded = (() => {
      try {
        return decodeURIComponent(rawHash)
      } catch {
        return rawHash
      }
    })()

    let cancelled = false
    let attempts = 0

    const findTarget = (): HTMLElement | null => {
      const direct =
        document.getElementById(decoded) ?? document.getElementById(rawHash)
      const container = containerRef.current
      if (direct && (!container || container.contains(direct))) return direct
      if (container && fallback) return fallback(container, decoded)
      return null
    }

    const tick = () => {
      if (cancelled) return
      const target = findTarget()
      if (target) {
        springScrollToElement(target, delta)
        return
      }
      if (++attempts >= maxAttempts) return
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    return () => {
      cancelled = true
    }
  }, [containerRef, trigger, fallback, delta, maxAttempts])
}
