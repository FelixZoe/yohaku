'use client'

import { useLocale } from 'next-intl'

import { TimelineSkimRow } from './TimelineSkimRow'
import { TimelineYearRow } from './TimelineYearRow'
import type { YearMonthMap } from './utils'
import {
  formatMonthLabel,
  maxMonthCount,
  sortMonthsDesc,
  sortYearsDesc,
} from './utils'

interface TimelineSkimProps {
  grouped: YearMonthMap
  onMonthClick?: (year: number, month: number) => void
  yearCountSuffix: (count: number) => string
  yearTotal: Map<number, number>
}

export const TimelineSkim = ({
  grouped,
  yearTotal,
  yearCountSuffix,
  onMonthClick,
}: TimelineSkimProps) => {
  const locale = useLocale()
  const years = sortYearsDesc(grouped)

  return (
    <>
      {years.map((year) => {
        const yearBucket = grouped.get(year)!
        const max = maxMonthCount(yearBucket)
        return (
          <section className="mb-6" key={year}>
            <TimelineYearRow
              className="mb-2"
              countLabel={yearCountSuffix(yearTotal.get(year) ?? 0)}
              year={year}
            />
            {sortMonthsDesc(yearBucket).map((month) => {
              const list = yearBucket.get(month)!
              const pct = Math.max(6, Math.round((list.length / max) * 100))
              return (
                <TimelineSkimRow
                  count={list.length}
                  key={`${year}-${month}`}
                  label={formatMonthLabel(year, month, locale)}
                  pct={pct}
                  onClick={() => onMonthClick?.(year, month)}
                />
              )
            })}
          </section>
        )
      })}
    </>
  )
}
