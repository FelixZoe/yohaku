export enum TimelineEntryType {
  Post,
  Note,
}

export interface TimelineEntry {
  date: Date
  href: string
  id: string
  important?: boolean
  meta: string[]
  title: string
  type: TimelineEntryType
}

export type TimelineView = 'relaxed' | 'dense' | 'skim'

export const TIMELINE_VIEWS: TimelineView[] = ['relaxed', 'dense', 'skim']
export const TIMELINE_VIEW_STORAGE_KEY = 'yohaku:timeline:view'
