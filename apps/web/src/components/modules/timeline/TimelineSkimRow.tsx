'use client'

import { useTimelineReveal } from './useTimelineReveal'

interface TimelineSkimRowProps {
  count: number
  label: string
  onClick?: () => void
  pct: number
}

export const TimelineSkimRow = ({
  label,
  pct,
  count,
  onClick,
}: TimelineSkimRowProps) => {
  const ref = useTimelineReveal<HTMLButtonElement>()
  return (
    <button
      className="yohaku-tl-skim-row w-full appearance-none bg-transparent text-left"
      ref={ref}
      type="button"
      onClick={onClick}
    >
      <span className="yohaku-tl-skim-label">{label}</span>
      <span className="yohaku-tl-skim-chart">
        <span className="yohaku-tl-skim-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="yohaku-tl-skim-count">{count}</span>
    </button>
  )
}
