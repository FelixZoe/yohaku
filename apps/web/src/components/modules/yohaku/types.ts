// apps/web/src/components/modules/yohaku/types.ts
export type YohakuState = 'idle' | 'reading' | 'anchored' | 'closing'

export interface YohakuMeta {
  difficulty: 'easy' | 'medium' | 'hard'
  genre: string
  reading_time_min: number
}

export interface RefTarget {
  quote: string
  section?: string
}
