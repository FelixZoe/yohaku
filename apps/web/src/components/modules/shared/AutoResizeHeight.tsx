'use client'

import { m } from 'motion/react'
import type * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { softSpringPreset } from '~/constants/spring'
import { clsxm } from '~/lib/helper'

interface AnimateChangeInHeightProps {
  children: React.ReactNode
  className?: string
  duration?: number

  spring?: boolean
}

function readObservedBorderHeight(entry: ResizeObserverEntry) {
  const box = entry.borderBoxSize?.[0]
  if (box) return box.blockSize
  return entry.target.getBoundingClientRect().height
}

export const AutoResizeHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
  duration = 0.6,
  spring = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = readObservedBorderHeight(entries[0])
        setHeight(observedHeight)
      })

      resizeObserver.observe(containerRef.current)

      return () => {
        // Cleanup the observer when the component is unmounted
        resizeObserver.disconnect()
      }
    }
  }, [])

  return (
    <m.div
      animate={{ height }}
      className={clsxm('overflow-hidden', className)}
      initial={false}
      style={{ height }}
      transition={spring ? softSpringPreset : { duration }}
    >
      <div className="py-1.5" ref={containerRef}>
        {children}
      </div>
    </m.div>
  )
}
