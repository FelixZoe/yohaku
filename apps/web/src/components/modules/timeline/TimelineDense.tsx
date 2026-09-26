'use client'

import { useLocale, useTranslations } from 'next-intl'

import { TimelineItem } from './TimelineItem'
import { TimelineMonthGroup } from './TimelineMonthGroup'
import { TimelineYearRow } from './TimelineYearRow'
import { TimelineEntryType } from './types'
import type { YearMonthMap } from './utils'
import { formatMonthLabel, sortMonthsDesc, sortYearsDesc } from './utils'

interface TimelineDenseProps {
  grouped: YearMonthMap
  onBookmarkClick?: () => void
  yearCountSuffix: (count: number) => string
  yearTotal: Map<number, number>
}

export const TimelineDense = ({
  grouped,
  yearTotal,
  onBookmarkClick,
  yearCountSuffix,
}: TimelineDenseProps) => {
  const t = useTranslations('home')
  const locale = useLocale()
  const years = sortYearsDesc(grouped)

  return (
    <>
      {years.map((year) => {
        const yearBucket = grouped.get(year)!
        return (
          <section className="mb-6" key={year}>
            <TimelineYearRow
              className="mb-2"
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
                      dense
                      entry={entry}
                      key={entry.id}
                      typeLabel={
                        entry.type === TimelineEntryType.Post
                          ? t('timeline_post')
                          : t('timeline_note')
                      }
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
