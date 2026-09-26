'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Fragment, useCallback } from 'react'

import { useCurrentRoomCount } from '~/atoms/hooks/activity'
import { withClientOnly } from '~/components/common/ClientOnly'
import { CreativeCommonsIcon } from '~/components/icons/cc'
import { useMaybeInRoomContext } from '~/components/modules/activity'
import { AIGenBadge } from '~/components/modules/ai/AIGenBadge'
import { TranslationLanguageSwitcher } from '~/components/modules/translation/TranslationLanguageSwitcher'
import { FloatPopover } from '~/components/ui/float-popover'
import { locales } from '~/i18n/config'
import { usePathname, useRouter } from '~/i18n/navigation'
import { articleMetaOf } from '~/lib/api/article-meta'
import {
  getMoodLabel,
  getWeatherLabel,
  mood2hue,
  weather2hue,
} from '~/lib/meta-icon'
import {
  useCurrentNoteDataSelector,
  useCurrentNoteMetaSelector,
} from '~/providers/note/CurrentNoteDataProvider'

export const NoteMetaBar = () => {
  return (
    <div className="w-full font-sans text-copy-13">
      <UpperRow />
      <TranslatedInlineNotice />
      <LowerRow />
    </div>
  )
}

const languageNameKey = {
  en: 'language_en',
  ja: 'language_ja',
  ko: 'language_ko',
  zh: 'language_zh',
  'zh-TW': 'language_zh_tw',
} as const

const isSupportedLocale = (code?: string | null): code is string =>
  !!code && (locales as readonly string[]).includes(code)

const TranslatedInlineNotice = () => {
  const articleTranslation = useCurrentNoteMetaSelector(
    (m) => articleMetaOf(m).translation,
  )
  const tCommon = useTranslations('common')
  const tNote = useTranslations('note')
  const appLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const sourceLang = articleTranslation?.sourceLang
  const canSwitch = isSupportedLocale(sourceLang) && sourceLang !== appLocale

  const onSwitch = useCallback(() => {
    if (!canSwitch || !sourceLang) return
    router.push(pathname, { locale: sourceLang as (typeof locales)[number] })
  }, [canSwitch, pathname, router, sourceLang])

  if (!articleTranslation?.isTranslated) return null

  const sourceLangLabel = sourceLang
    ? languageNameKey[sourceLang as keyof typeof languageNameKey]
      ? tCommon(languageNameKey[sourceLang as keyof typeof languageNameKey])
      : sourceLang.toUpperCase()
    : ''

  const text = tNote('inline_translated_from', { lang: sourceLangLabel })

  return (
    <div
      data-hide-print
      className="mt-1 font-serif text-copy-13 italic text-neutral-6"
    >
      {canSwitch ? (
        <button
          className="border-b border-dotted border-accent/45 pb-px text-accent transition-colors duration-150 hover:border-accent/85"
          type="button"
          onClick={onSwitch}
        >
          {text}
          <span aria-hidden> ↗</span>
        </button>
      ) : (
        <span>{text}</span>
      )}
    </div>
  )
}

const HueDot = ({ hue }: { hue: string }) => (
  <span
    aria-hidden
    className="mr-1.5 inline-block size-1.5 translate-y-[-0.1em] rounded-full align-middle"
    style={{ background: hue }}
  />
)

const UpperRow = () => {
  const weather = useCurrentNoteDataSelector((data) => data?.data.weather)
  const mood = useCurrentNoteDataSelector((data) => data?.data.mood)
  const readCount = useCurrentNoteDataSelector((data) => data?.data.readCount)
  const likeCount = useCurrentNoteDataSelector((data) => data?.data.likeCount)
  const roomCtx = useMaybeInRoomContext()
  const realtime = useCurrentRoomCount(roomCtx?.roomName || '')
  const showRealtime = !!roomCtx && realtime > 1

  const hasContext = !!weather || !!mood
  const hasStats = !!readCount || !!likeCount || showRealtime

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 md:grid md:grid-cols-[auto_1fr_auto]">
      <MetaDate />
      {hasContext ? (
        <MetaContextStream mood={mood} weather={weather} />
      ) : (
        <span aria-hidden className="hidden md:block" />
      )}
      {hasStats && (
        <MetaStats
          likeCount={likeCount}
          readCount={readCount}
          realtime={showRealtime ? realtime : 0}
        />
      )}
    </div>
  )
}

const MetaDate = withClientOnly(() => {
  const date = useCurrentNoteDataSelector((data) => ({
    createdAt: data?.data.createdAt,
    modifiedAt: data?.data.modifiedAt,
  }))
  const format = useFormatter()
  const t = useTranslations('common')

  if (!date?.createdAt) return null

  const dateFormat = format.dateTime(new Date(date.createdAt), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const tips = date.modifiedAt
    ? t('modified_at', {
        date: format.dateTime(new Date(date.modifiedAt), {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
      })
    : ''

  return (
    <FloatPopover
      asChild
      mobileAsSheet
      type="tooltip"
      triggerElement={
        <time
          className="font-serif italic text-neutral-7"
          dateTime={new Date(date.createdAt).toISOString()}
        >
          {dateFormat}
        </time>
      }
    >
      {tips}
    </FloatPopover>
  )
})

const MetaContextStream = ({
  weather,
  mood,
}: {
  weather?: string
  mood?: string
}) => {
  const t = useTranslations('common')

  return (
    <span className="font-serif italic text-neutral-7">
      {!!weather && (
        <FloatPopover
          asChild
          mobileAsSheet
          type="tooltip"
          triggerElement={
            <span className="whitespace-nowrap">
              <HueDot hue={weather2hue(weather)} />
              {getWeatherLabel(weather, t)}
            </span>
          }
        >
          {weather}
        </FloatPopover>
      )}
      {!!weather && !!mood && (
        <span aria-hidden className="mx-2 opacity-50">
          ·
        </span>
      )}
      {!!mood && (
        <FloatPopover
          asChild
          mobileAsSheet
          type="tooltip"
          triggerElement={
            <span className="whitespace-nowrap">
              <HueDot hue={mood2hue(mood)} />
              {getMoodLabel(mood, t)}
            </span>
          }
        >
          {mood}
        </FloatPopover>
      )}
    </span>
  )
}

type StatPart = {
  key: 'now' | 'read' | 'like'
  value: number
  label: string
  aria: string
  live?: boolean
}

const MetaStats = ({
  readCount,
  likeCount,
  realtime,
}: {
  readCount?: number
  likeCount?: number
  realtime: number
}) => {
  const tCommon = useTranslations('common')
  const tActivity = useTranslations('activity')

  const parts: StatPart[] = []
  if (realtime > 0) {
    const shortLabel = tActivity('reading_now_short', { count: '' }).trim()
    const longLabel = tActivity('reading_now').trim()
    parts.push({
      key: 'now',
      value: realtime,
      label: shortLabel,
      aria: `${realtime} ${longLabel}`,
      live: true,
    })
  }
  if (readCount) {
    const label = tCommon('meta_reads', { count: '' }).trim()
    parts.push({
      key: 'read',
      value: readCount,
      label,
      aria: `${readCount.toLocaleString()} ${label}`,
    })
  }
  if (likeCount) {
    const label = tCommon('meta_likes', { count: '' }).trim()
    parts.push({
      key: 'like',
      value: likeCount,
      label,
      aria: `${likeCount.toLocaleString()} ${label}`,
    })
  }

  if (parts.length === 0) return null

  const fullText = parts.map((p) => p.aria).join(' · ')

  return (
    <FloatPopover
      asChild
      mobileAsSheet
      type="tooltip"
      triggerElement={
        <span className="inline-flex items-baseline gap-2 text-caption-10 uppercase tracking-[0.22em] text-neutral-7 tabular-nums md:justify-self-end">
          {parts.map((p, i) => (
            <Fragment key={p.key}>
              {i > 0 && (
                <span aria-hidden className="opacity-50">
                  ·
                </span>
              )}
              <span
                aria-label={p.aria}
                className={
                  p.live
                    ? 'inline-flex items-baseline gap-1.5 text-accent'
                    : 'inline-flex items-baseline gap-1.5'
                }
              >
                {p.live && (
                  <span
                    aria-hidden
                    className="size-1.5 self-center rounded-full bg-current motion-safe:[animation:dotPulse_2.4s_ease-in-out_infinite]"
                  />
                )}
                <span>{p.value.toLocaleString()}</span>
                <span className="opacity-80">{p.label}</span>
              </span>
            </Fragment>
          ))}
        </span>
      }
    >
      {fullText}
    </FloatPopover>
  )
}

const LowerRow = () => {
  const aiGen = useCurrentNoteDataSelector((data) => data?.data.meta?.aiGen)
  const translation = useCurrentNoteMetaSelector((m) => {
    const article = articleMetaOf(m).translation
    return {
      availableTranslations: article?.availableTranslations,
      sourceLang: article?.sourceLang,
    }
  })

  const hasAI = aiGen !== undefined && aiGen !== null && aiGen !== ''
  const hasTranslation =
    !!translation.availableTranslations &&
    translation.availableTranslations.length > 0

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-1.5 text-neutral-6">
      {hasAI && <AIGenBadge value={aiGen} />}
      {hasTranslation && (
        <TranslationLanguageSwitcher
          availableTranslations={translation.availableTranslations!}
          sourceLang={translation.sourceLang}
          triggerClassName="text-label-12! font-medium! text-neutral-6! [&_i:first-child]:text-copy-13! px-1! py-0!"
        />
      )}
      <MetaCC />
    </div>
  )
}

const MetaCC = () => {
  const t = useTranslations('post')

  return (
    <FloatPopover
      asChild
      mobileAsSheet
      type="tooltip"
      triggerElement={
        <a
          aria-label="Creative Commons BY-NC-SA 4.0"
          className="ml-auto inline-flex items-center text-neutral-6 transition-opacity hover:opacity-100"
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
          rel="noreferrer"
          target="_blank"
        >
          <CreativeCommonsIcon className="text-icon-sm" />
        </a>
      }
    >
      {t('copyright_license_tooltip')}
    </FloatPopover>
  )
}
