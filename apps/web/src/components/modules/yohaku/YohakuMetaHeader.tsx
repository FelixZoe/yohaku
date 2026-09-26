'use client'

import { useLocale, useTranslations } from 'next-intl'

import { clsxm } from '~/lib/helper'

import type { YohakuMeta } from './types'

export type YohakuMetaFormat = 'plain' | 'literary'

const HAN_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * Convert 1–99 to its Chinese form (一 / 十 / 二十一 / 九十九). Returns null
 * outside that range so the caller can fall back to Arabic numerals.
 */
function numToHan(n: number): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 99) return null
  if (n < 10) return HAN_DIGIT[n]
  if (n === 10) return '十'
  if (n < 20) return `十${HAN_DIGIT[n - 10]}`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones === 0
    ? `${HAN_DIGIT[tens]}十`
    : `${HAN_DIGIT[tens]}十${HAN_DIGIT[ones]}`
}

// Mirrors mx-core `INSIGHTS_GENRES` in apps/core/src/modules/ai/ai.prompts.ts
const KNOWN_GENRES = [
  'architecture',
  'tutorial',
  'post-mortem',
  'comparison',
  'mechanism',
  'diary',
  'travelogue',
  'essay',
  'review',
  'memorial',
  'retrospective',
] as const
type KnownGenre = (typeof KNOWN_GENRES)[number]

function isKnownGenre(g: string): g is KnownGenre {
  return (KNOWN_GENRES as readonly string[]).includes(g)
}

interface Part {
  field: 'time' | 'difficulty' | 'genre'
  value: string
}

type Translator = ReturnType<typeof useTranslations<'common'>>

function buildLiteraryParts(meta: YohakuMeta, t: Translator): Part[] {
  const han = numToHan(meta.reading_time_min)
  const time = han
    ? t('yohaku_meta_literary_time', { count: han })
    : t('yohaku_meta_literary_time_fallback', { count: meta.reading_time_min })

  const difficulty = t(
    `yohaku_difficulty_literary_${meta.difficulty}` as
      | 'yohaku_difficulty_literary_easy'
      | 'yohaku_difficulty_literary_medium'
      | 'yohaku_difficulty_literary_hard',
  )

  const genreNormalized = meta.genre.toLowerCase()
  const genre = isKnownGenre(genreNormalized)
    ? t(
        `yohaku_genre_literary_${genreNormalized.replaceAll('-', '_')}` as
          | 'yohaku_genre_literary_architecture'
          | 'yohaku_genre_literary_tutorial'
          | 'yohaku_genre_literary_post_mortem'
          | 'yohaku_genre_literary_comparison'
          | 'yohaku_genre_literary_mechanism'
          | 'yohaku_genre_literary_diary'
          | 'yohaku_genre_literary_travelogue'
          | 'yohaku_genre_literary_essay'
          | 'yohaku_genre_literary_review'
          | 'yohaku_genre_literary_memorial'
          | 'yohaku_genre_literary_retrospective',
      )
    : meta.genre

  return [
    { field: 'time', value: time },
    { field: 'difficulty', value: difficulty },
    { field: 'genre', value: genre },
  ]
}

function buildPlainParts(meta: YohakuMeta, t: Translator): Part[] {
  const time = t('yohaku_meta_time', { count: meta.reading_time_min })
  const difficulty = t(
    `yohaku_difficulty_${meta.difficulty}` as
      | 'yohaku_difficulty_easy'
      | 'yohaku_difficulty_medium'
      | 'yohaku_difficulty_hard',
  )
  const genreNormalized = meta.genre.toLowerCase()
  const genre = isKnownGenre(genreNormalized)
    ? t(
        `yohaku_genre_${genreNormalized.replaceAll('-', '_')}` as
          | 'yohaku_genre_architecture'
          | 'yohaku_genre_tutorial'
          | 'yohaku_genre_post_mortem'
          | 'yohaku_genre_comparison'
          | 'yohaku_genre_mechanism'
          | 'yohaku_genre_diary'
          | 'yohaku_genre_travelogue'
          | 'yohaku_genre_essay'
          | 'yohaku_genre_review'
          | 'yohaku_genre_memorial'
          | 'yohaku_genre_retrospective',
      )
    : meta.genre
  return [
    { field: 'time', value: time },
    { field: 'difficulty', value: difficulty },
    { field: 'genre', value: genre },
  ]
}

export function YohakuMetaHeader({
  meta,
  className,
  format = 'plain',
}: {
  meta: YohakuMeta | null
  className?: string
  format?: YohakuMetaFormat
}) {
  const locale = useLocale()
  const t = useTranslations('common')
  if (!meta) return null
  const isLiterary = format === 'literary' && locale.startsWith('zh')
  const parts = isLiterary
    ? buildLiteraryParts(meta, t)
    : buildPlainParts(meta, t)
  return (
    <div
      className={clsxm(
        'yohaku-meta-header inline-flex items-center',
        isLiterary
          ? 'font-serif text-label-12 italic tracking-[0.5px] text-[color:color-mix(in_oklch,var(--yohaku-note-ink,#6b5a40),transparent_25%)]'
          : 'text-caption-10 font-medium tracking-[2.5px] text-neutral-7 uppercase',
        className,
      )}
    >
      {parts.map((part, idx) => (
        <span className="inline-flex items-center" key={part.field}>
          {idx > 0 && (
            <span aria-hidden className="mx-2 text-neutral-5">
              ·
            </span>
          )}
          <span data-yohaku-meta-field={part.field}>{part.value}</span>
        </span>
      ))}
    </div>
  )
}
