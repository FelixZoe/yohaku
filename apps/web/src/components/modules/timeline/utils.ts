import type { TimelineEntry } from './types'

export type YearMonthMap = Map<number, Map<number, TimelineEntry[]>>

export function groupByYearMonth(entries: TimelineEntry[]): YearMonthMap {
  const out: YearMonthMap = new Map()
  for (const e of entries) {
    const y = e.date.getFullYear()
    const m = e.date.getMonth()
    let yearBucket = out.get(y)
    if (!yearBucket) {
      yearBucket = new Map()
      out.set(y, yearBucket)
    }
    const monthBucket = yearBucket.get(m)
    if (monthBucket) {
      monthBucket.push(e)
    } else {
      yearBucket.set(m, [e])
    }
  }
  for (const yearBucket of out.values()) {
    for (const monthEntries of yearBucket.values()) {
      monthEntries.sort((a, b) => b.date.getTime() - a.date.getTime())
    }
  }
  return out
}

export function sortYearsDesc(map: YearMonthMap): number[] {
  return Array.from(map.keys()).sort((a, b) => b - a)
}

export function sortMonthsDesc(
  yearBucket: Map<number, TimelineEntry[]>,
): number[] {
  return Array.from(yearBucket.keys()).sort((a, b) => b - a)
}

export function formatMonthLabel(
  year: number,
  month: number,
  locale: string,
): string {
  const date = new Date(year, month, 1)
  const nativeLong = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
    date,
  )
  const enShort = new Intl.DateTimeFormat('en-US', { month: 'short' })
    .format(date)
    .toUpperCase()

  if (locale.startsWith('en')) return nativeLong.toUpperCase()
  return `${nativeLong} · ${enShort}`
}

export function maxMonthCount(
  yearBucket: Map<number, TimelineEntry[]>,
): number {
  let max = 0
  for (const list of yearBucket.values()) {
    if (list.length > max) max = list.length
  }
  return max || 1
}
