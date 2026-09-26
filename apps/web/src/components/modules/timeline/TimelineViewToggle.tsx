'use client'

import { m } from 'motion/react'
import { useTranslations } from 'next-intl'

import type { TimelineView } from './types'
import { TIMELINE_VIEWS } from './types'

interface TimelineViewToggleProps {
  onChange: (next: TimelineView) => void
  value: TimelineView
}

const labelKey: Record<TimelineView, string> = {
  relaxed: 'timeline_view_relaxed',
  dense: 'timeline_view_dense',
  skim: 'timeline_view_skim',
}

export const TimelineViewToggle = ({
  value,
  onChange,
}: TimelineViewToggleProps) => {
  const t = useTranslations('home')

  return (
    <div className="yohaku-tl-toggle" role="tablist">
      {TIMELINE_VIEWS.map((v) => {
        const selected = v === value
        return (
          <button
            aria-selected={selected}
            className="yohaku-tl-toggle-btn"
            key={v}
            role="tab"
            type="button"
            onClick={() => onChange(v)}
          >
            {t(labelKey[v])}
            {selected && (
              <m.span
                className="yohaku-tl-toggle-underline"
                layoutId="yohaku-tl-toggle-underline"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
