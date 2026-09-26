'use client'

import { useLocale } from 'next-intl'

import { TimelineItem } from './TimelineItem'
import { TimelineMonthGroup } from './TimelineMonthGroup'
import { TimelineYearRow } from './TimelineYearRow'
import type { YearMonthMap } from './utils'
import { formatMonthLabel, sortMonthsDesc, sortYearsDesc } from './utils'

interface TimelineRelaxedProps {
  grouped: YearMonthMap
  onBookmarkClick?: () => void
  yearCountSuffix: (count: number) => string
  yearTotal: Map<number, number>
}

export const TimelineRelaxed = ({
  grouped,
  yearTotal,
  onBookmarkClick,
  yearCountSuffix,
}: TimelineRelaxedProps) => {
  const locale = useLocale()
  const years = sortYearsDesc(grouped)

  return (
    <>
      {years.map((year) => {
        const yearBucket = grouped.get(year)!
        return (
          <section className="mb-8" key={year}>
            <TimelineYearRow
              className="mb-3"
              countLabel={yearCountSuffix(yearTotal.get(year) ?? 0)}
              year={year}
            />
            {sortMonthsDesc(yearBucket).map((month) => {
              const list = yearBucket.get(month)!
              return (
                <TimelineMonthGroup
                  key={`${year}-${month}`}
                  label={formatMonthLabel(year, month, locale)}
                  month={month}
                  year={year}
                >
                  {list.map((entry) => (
                    <TimelineItem
                      entry={entry}
                      key={entry.id}
                      onBookmarkClick={onBookmarkClick}
                    />
                  ))}
                </TimelineMonthGroup>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
