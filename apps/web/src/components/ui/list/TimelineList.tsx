'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useRef } from 'react'

export const TimelineList: Component = ({ children, className }) => {
  const containerRef = useRef<HTMLUListElement>(null)
  const currentLiRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const lis = container.querySelectorAll(':scope > li')
    lis.forEach((li, i) => {
      ;(li as HTMLElement).style.setProperty('--li-index', String(i))
    })
  }, [children])

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return

    const li = (e.target as HTMLElement).closest('li')
    if (!li || !container.contains(li) || li === currentLiRef.current) return

    currentLiRef.current = li
    const containerRect = container.getBoundingClientRect()
    const liRect = li.getBoundingClientRect()

    container.style.setProperty(
      '--indicator-top',
      `${liRect.top - containerRect.top}px`,
    )
    container.style.setProperty('--indicator-height', `${liRect.height}px`)
    container.style.setProperty('--indicator-opacity', '1')
  }, [])

  const handleMouseLeave = useCallback(() => {
    currentLiRef.current = null
    containerRef.current?.style.setProperty('--indicator-opacity', '0')
  }, [])

  return (
    <ul
      className={clsx('yohaku-timeline', className)}
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
      onMouseOver={handleMouseOver}
    >
      {children}
    </ul>
  )
}
