'use client'

import type { PropsWithChildren } from 'react'

import { useTimelineReveal } from './useTimelineReveal'

interface TimelineMonthGroupProps {
  label: string
  month: number
  year: number
}

export const TimelineMonthGroup = ({
  label,
  year,
  month,
  children,
}: PropsWithChildren<TimelineMonthGroupProps>) => {
  const ref = useTimelineReveal<HTMLDivElement>()
  return (
    <div data-tl-anchor={`${year}-${month}`}>
      <div className="yohaku-tl-month" ref={ref}>
        {label}
      </div>
      {children}
    </div>
  )
}
