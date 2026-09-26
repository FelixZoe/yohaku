import { getNoteRouteParams } from '~/lib/note-route'
import { routeBuilder, Routes } from '~/lib/route-builder'

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

export interface RailItem {
  date: Date
  fraction: number
  href: string
  id: string
  isCurrentSeason: boolean
  title: string
}

export interface RailSeason {
  endFraction: number
  isCurrent: boolean
  items: RailItem[]
  key: string
  labelFraction: number
  season: SeasonKey
  startFraction: number
  yearLabel: string
}

export interface TimelineModel {
  currentSeasonStart: number | null
  items: RailItem[]
  latest: RailItem
  seasons: RailSeason[]
  total: number
}

export interface RailCluster {
  fraction: number
  id: string
  isCurrentSeason: boolean
  items: RailItem[]
}

const SEASON_MONTH_RANGE: Record<SeasonKey, readonly [number, number]> = {
  spring: [2, 5],
  summer: [5, 8],
  autumn: [8, 11],
  winter: [11, 14],
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

function getSeasonFromMonth(month: number): SeasonKey {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

function buildItemHref(item: any): string {
  if ('nid' in item) {
    return routeBuilder(Routes.Note, { ...getNoteRouteParams(item) })
  }
  return routeBuilder(Routes.Post, {
    category: item.category.slug,
    slug: item.slug,
  })
}

function seasonBounds(season: SeasonKey, year: number): [Date, Date] {
  const [startMonth, endMonth] = SEASON_MONTH_RANGE[season]
  return [new Date(year, startMonth, 1), new Date(year, endMonth, 1)]
}

export function localSeasonFraction(
  item: RailItem,
  season: RailSeason,
): number {
  const denom = season.endFraction - season.startFraction
  if (denom <= 0) return 0.5
  return clamp01((item.fraction - season.startFraction) / denom)
}

// Dots closer than MERGE_THRESHOLD become un-hoverable; merge them into one
// cluster. MAX_CLUSTER_SPAN caps a cluster's width so dense streaks of posts
// can't single-linkage-chain the whole rail into a few fat dots.
const MERGE_THRESHOLD = 0.015
const MAX_CLUSTER_SPAN = 0.05

export function clusterRailItems(items: RailItem[]): RailCluster[] {
  const groups: RailItem[][] = []
  for (const item of items) {
    const group = groups.at(-1)
    if (
      group &&
      item.fraction - group.at(-1)!.fraction <= MERGE_THRESHOLD &&
      item.fraction - group[0]!.fraction <= MAX_CLUSTER_SPAN
    ) {
      group.push(item)
    } else {
      groups.push([item])
    }
  }
  return groups.map((group) => ({
    fraction: group.reduce((sum, it) => sum + it.fraction, 0) / group.length,
    id: group[0]!.id,
    isCurrentSeason: group.some((it) => it.isCurrentSeason),
    items: group,
  }))
}

export function buildTimelineModel(
  rawPosts: any[] | undefined,
  rawNotes: any[] | undefined,
): TimelineModel | null {
  const raw = [...(rawPosts ?? []), ...(rawNotes ?? [])]
  if (raw.length === 0) return null

  const parsed = raw
    .map((item) => ({
      id: String(item.id),
      title: String(item.title),
      href: buildItemHref(item),
      date: new Date(item.createdAt),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const axisStart = parsed[0]!.date.getTime()
  const axisEnd = Math.max(Date.now(), parsed.at(-1)!.date.getTime())
  const span = Math.max(axisEnd - axisStart, 1)
  const toFraction = (time: number) => clamp01((time - axisStart) / span)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentKey = `${currentMonth <= 2 ? now.getFullYear() - 1 : now.getFullYear()}-${getSeasonFromMonth(currentMonth)}`

  const groups = new Map<
    string,
    { season: SeasonKey; year: number; entries: typeof parsed }
  >()
  for (const entry of parsed) {
    const month = entry.date.getMonth() + 1
    const season = getSeasonFromMonth(month)
    const year =
      month <= 2 ? entry.date.getFullYear() - 1 : entry.date.getFullYear()
    const key = `${year}-${season}`
    const group = groups.get(key)
    if (group) group.entries.push(entry)
    else groups.set(key, { season, year, entries: [entry] })
  }

  const items: RailItem[] = []
  const seasons: RailSeason[] = []
  let currentSeasonStart: number | null = null

  for (const [key, group] of groups) {
    const isCurrent = key === currentKey
    const [start, end] = seasonBounds(group.season, group.year)
    const startFraction = toFraction(start.getTime())
    const endFraction = toFraction(end.getTime())
    const seasonItems: RailItem[] = group.entries.map((entry) => ({
      ...entry,
      fraction: toFraction(entry.date.getTime()),
      isCurrentSeason: isCurrent,
    }))
    items.push(...seasonItems)
    if (isCurrent) currentSeasonStart = startFraction
    seasons.push({
      key,
      season: group.season,
      isCurrent,
      items: seasonItems,
      startFraction,
      endFraction,
      labelFraction: (startFraction + endFraction) / 2,
      yearLabel:
        group.season === 'winter'
          ? `${group.year}–${String((group.year + 1) % 100).padStart(2, '0')}`
          : String(group.year),
    })
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime())
  seasons.sort((a, b) => a.startFraction - b.startFraction)

  return {
    items,
    seasons,
    total: items.length,
    latest: items.at(-1)!,
    currentSeasonStart,
  }
}
