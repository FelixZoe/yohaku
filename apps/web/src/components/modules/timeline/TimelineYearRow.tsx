'use client'

import clsx from 'clsx'

import { useTimelineReveal } from './useTimelineReveal'

interface TimelineYearRowProps {
  className?: string
  countLabel: string
  year: number
}

export const TimelineYearRow = ({
  year,
  countLabel,
  className,
}: TimelineYearRowProps) => {
  const ref = useTimelineReveal<HTMLDivElement>()
  return (
    <div className={clsx('yohaku-tl-year-row', className)} ref={ref}>
      <span className="yohaku-tl-year">{year}</span>
      <span className="yohaku-tl-year-count">{countLabel}</span>
    </div>
  )
}
