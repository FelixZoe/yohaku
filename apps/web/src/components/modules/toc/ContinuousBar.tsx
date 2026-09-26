'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { clsxm } from '~/lib/helper'

interface ContinuousBarProps {
  className?: string
  containerRef: React.RefObject<HTMLElement | null>
  visibleIds: Set<string>
}

export const ContinuousBar = ({
  containerRef,
  visibleIds,
  className,
}: ContinuousBarProps) => {
  const [barStyle, setBarStyle] = useState<{
    top: number
    height: number
  } | null>(null)

  const rafRef = useRef<number>(0)
  const mutationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // TocGroup animation duration is 400ms; wait for it to settle before recalculating
  const GROUP_ANIMATION_DURATION = 450

  const recalculate = useCallback(() => {
    const container = containerRef.current
    if (!container || visibleIds.size === 0) {
      setBarStyle(null)
      return
    }

    const items = container.querySelectorAll<HTMLElement>('li[data-anchor-id]')
    let firstEl: HTMLElement | null = null
    let lastEl: HTMLElement | null = null

    for (const item of items) {
      const anchorId = item.dataset.anchorId
      if (anchorId && visibleIds.has(anchorId)) {
        if (!firstEl) firstEl = item
        lastEl = item
      }
    }

    if (!firstEl || !lastEl) {
      setBarStyle(null)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const firstRect = firstEl.getBoundingClientRect()
    const lastRect = lastEl.getBoundingClientRect()

    const top = firstRect.top - containerRect.top + container.scrollTop
    const height = lastRect.bottom - firstRect.top

    setBarStyle({ top, height })
  }, [containerRef, visibleIds])

  useEffect(() => {
    recalculate()
  }, [recalculate])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(recalculate)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    // Debounced recalculate for DOM mutations (group expand/collapse animations).
    // Waits for animation to finish before recalculating to avoid mid-animation jitter.
    const onMutation = () => {
      clearTimeout(mutationTimerRef.current)
      mutationTimerRef.current = setTimeout(() => {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(recalculate)
      }, GROUP_ANIMATION_DURATION)
    }

    const mutationObserver = new MutationObserver(onMutation)
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(mutationTimerRef.current)
      container.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      mutationObserver.disconnect()
    }
  }, [containerRef, recalculate])

  if (!barStyle) return null

  return (
    <span
      className={clsxm(
        'absolute left-0 w-[2px] rounded-sm',
        'bg-gradient-to-b from-accent from-80% to-transparent',
        'transition-[top,height] duration-400',
        className,
      )}
      style={{
        top: barStyle.top,
        height: barStyle.height,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow:
          '0 0 6px color-mix(in srgb, var(--color-accent) 35%, transparent), 1px 0 12px color-mix(in srgb, var(--color-accent) 12%, transparent)',
      }}
    />
  )
}
