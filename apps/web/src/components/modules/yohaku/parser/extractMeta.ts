import type { YohakuMeta } from '../types'

const ALLOWED_DIFFICULTIES: ReadonlyArray<YohakuMeta['difficulty']> = [
  'easy',
  'medium',
  'hard',
]

export function extractMeta(markdown: string): YohakuMeta | null {
  const trimmed = markdown.trimEnd()
  // take last occurrence: scan from end using global match; body is greedy
  // but forbidden to cross `-->`, so `}` inside a JSON string doesn't
  // terminate early while multiple trailers stay independent.
  // eslint-disable-next-line unicorn/better-regex
  const globalRe = /<!--\s*insights-meta:\s*(\{(?:(?!-->)[\s\S])*\})\s*-->/g
  let last: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = globalRe.exec(trimmed)) !== null) last = m
  if (!last) return null
  try {
    const parsed = JSON.parse(last[1]) as YohakuMeta
    if (
      typeof parsed?.reading_time_min === 'number' &&
      Number.isFinite(parsed.reading_time_min) &&
      parsed.reading_time_min >= 0 &&
      ALLOWED_DIFFICULTIES.includes(parsed?.difficulty) &&
      typeof parsed?.genre === 'string'
    )
      return parsed
    return null
  } catch {
    return null
  }
}
