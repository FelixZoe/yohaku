'use client'

import { useQuery } from '@tanstack/react-query'
import { m } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { FloatPopover } from '~/components/ui/float-popover'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'

import type { RailCluster, TimelineModel } from './home-timeline.utils'
import {
  buildTimelineModel,
  clusterRailItems,
  localSeasonFraction,
} from './home-timeline.utils'

const EASING = [0.22, 1, 0.36, 1] as const
const AXIS_DURATION = 0.7
const DOT_START = 0.7

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12%' as const },
  transition: { duration: 0.6, ease: EASING, delay },
})

const fade = (delay = 0, duration = 0.5) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-12%' as const },
  transition: { duration, ease: EASING, delay },
})

const draw = (delay = 0, duration = AXIS_DURATION) => ({
  initial: { clipPath: 'inset(0 100% 0 0)' },
  whileInView: { clipPath: 'inset(0 0% 0 0)' },
  viewport: { once: true, amount: 0 as const },
  transition: { duration, ease: EASING, delay },
})

interface SeasonLabels {
  autumn: string
  spring: string
  summer: string
  winter: string
}

const clampLabel = (fraction: number) =>
  Math.min(Math.max(fraction, 0.04), 0.96)
const monthOf = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)

export const HomePageTimeLine = () => {
  const t = useTranslations('home')
  const locale = useLocale()

  const { data } = useQuery({
    queryKey: ['home-timeline', locale],
    queryFn: async () => apiClient.activity.getLastYearPublication(),
  })

  const model = useMemo(
    () => buildTimelineModel(data?.posts, data?.notes),
    [data?.posts, data?.notes],
  )

  if (!model) return null

  const seasonLabels: SeasonLabels = {
    spring: t('timeline_season_spring'),
    summer: t('timeline_season_summer'),
    autumn: t('timeline_season_autumn'),
    winter: t('timeline_season_winter'),
  }

  return (
    <section className="mx-auto mt-16 max-w-[1400px] px-6 lg:px-12">
      <m.h2
        className="text-center font-serif text-title-20 tracking-[2px] text-neutral-7 lg:text-title-24"
        {...rise(0)}
      >
        {t('timeline_title')}
      </m.h2>

      <div className="mt-16 hidden lg:block">
        <DesktopRail
          locale={locale}
          model={model}
          nowLabel={t('timeline_season_current')}
          recentLabel={t('timeline_latest')}
          seasonLabels={seasonLabels}
        />
      </div>

      <div className="mt-12 lg:hidden">
        <MobileSeasons
          model={model}
          recentLabel={t('timeline_latest')}
          seasonLabels={seasonLabels}
          unitLabel={t('hero_stat_posts')}
        />
      </div>

      <m.div
        className="mt-12 text-center font-serif text-copy-13 italic text-neutral-6"
        {...rise(0.75)}
      >
        {t('timeline_year_total', { count: model.total })}
        {' · '}
        <Link
          className="text-accent transition-opacity not-italic hover:opacity-70"
          href="/timeline"
        >
          {t('timeline_view_all')}
          <i className="i-mingcute-arrow-right-line ml-0.5 text-label-12" />
        </Link>
      </m.div>
    </section>
  )
}

const DesktopRail = ({
  model,
  seasonLabels,
  nowLabel,
  recentLabel,
  locale,
}: {
  model: TimelineModel
  seasonLabels: SeasonLabels
  nowLabel: string
  recentLabel: string
  locale: string
}) => {
  const dots = clusterRailItems(model.items)
  const dotStep = Math.min(0.05, 0.8 / Math.max(dots.length, 1))
  const staggerWindow = Math.max(dots.length - 1, 0) * dotStep

  return (
    <div>
      <div className="relative h-8">
        <div className="absolute inset-0 flex items-center">
          <m.div className="h-px w-full bg-border" {...draw(0)} />
        </div>

        {model.currentSeasonStart !== null && (
          <m.div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent/10"
            style={{ left: `${model.currentSeasonStart * 100}%`, right: 0 }}
            {...fade(DOT_START + model.currentSeasonStart * staggerWindow)}
          />
        )}

        <div className="absolute inset-0">
          {dots.map((cluster, index) => (
            <RailDot
              cluster={cluster}
              delay={DOT_START + index * dotStep}
              key={cluster.id}
              locale={locale}
            />
          ))}
        </div>

        <m.div {...fade(DOT_START + staggerWindow)}>
          <div className="absolute right-0 top-1/2 h-3 w-px -translate-y-1/2 bg-accent" />
          <span className="absolute -top-0.5 right-0 text-caption-10 text-accent">
            {nowLabel}
          </span>
        </m.div>
      </div>

      <div className="relative mt-3 h-4">
        {model.seasons.map((season) => (
          <m.span
            key={season.key}
            style={{ left: `${clampLabel(season.labelFraction) * 100}%` }}
            className={clsxm(
              'absolute -translate-x-1/2 whitespace-nowrap text-caption-10 tracking-[2px]',
              season.isCurrent ? 'text-accent' : 'text-neutral-6',
            )}
            {...fade(
              DOT_START + clampLabel(season.labelFraction) * staggerWindow,
            )}
          >
            {seasonLabels[season.season]}
          </m.span>
        ))}
      </div>

      <m.div
        className="mt-10 text-center text-copy-13 text-neutral-6"
        {...rise(0.6)}
      >
        {recentLabel}
        {' · '}
        <Link
          className="text-neutral-8 transition-colors hover:text-accent"
          href={model.latest.href}
        >
          {model.latest.title}
        </Link>
      </m.div>
    </div>
  )
}

const RailDot = ({
  cluster,
  delay,
  locale,
}: {
  cluster: RailCluster
  delay: number
  locale: string
}) => {
  const multiple = cluster.items.length > 1

  return (
    <FloatPopover
      asChild
      offset={0}
      placement="top"
      type="tooltip"
      triggerElement={
        <m.button
          aria-label={cluster.items.map((it) => it.title).join('、')}
          className="group/dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-2"
          style={{ left: `${cluster.fraction * 100}%` }}
          type="button"
          {...fade(delay, 0.35)}
        >
          <span
            className={clsxm(
              'block rounded-full transition-transform duration-200 group-hover/dot:scale-150',
              multiple ? 'size-2' : 'size-1.5',
              cluster.isCurrentSeason ? 'bg-accent/70' : 'bg-neutral-5',
            )}
          />
        </m.button>
      }
    >
      <div className="flex flex-col gap-1.5">
        {cluster.items.map((it) => (
          <Link
            className="text-label-12 text-neutral-8 transition-colors hover:text-accent"
            href={it.href}
            key={it.id}
          >
            {it.title}
            <span className="ml-1.5 text-neutral-5">
              {monthOf(it.date, locale)}
            </span>
          </Link>
        ))}
      </div>
    </FloatPopover>
  )
}

const MobileSeasons = ({
  model,
  seasonLabels,
  unitLabel,
  recentLabel,
}: {
  model: TimelineModel
  seasonLabels: SeasonLabels
  unitLabel: string
  recentLabel: string
}) => {
  return (
    <div className="flex flex-col gap-10">
      {model.seasons.map((season, index) => (
        <m.div key={season.key} {...rise(index * 0.07)}>
          <Link className="block" href="/timeline">
            <div className="flex items-baseline justify-between">
              <span
                className={clsxm(
                  'font-serif text-copy-14 tracking-[2px]',
                  season.isCurrent ? 'text-accent' : 'text-neutral-7',
                )}
              >
                {seasonLabels[season.season]}
              </span>
              <span className="text-label-12 text-neutral-5">
                {season.items.length} {unitLabel}
              </span>
            </div>

            <div className="relative mt-3 h-3">
              <div className="absolute inset-0 flex items-center">
                <m.div
                  className={clsxm(
                    'h-px w-full',
                    season.isCurrent ? 'bg-accent/40' : 'bg-border',
                  )}
                  {...draw(0)}
                />
              </div>
              {season.items.map((item) => (
                <span
                  aria-hidden
                  key={item.id}
                  className={clsxm(
                    'absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
                    season.isCurrent ? 'bg-accent/70' : 'bg-neutral-5',
                  )}
                  style={{
                    left: `${localSeasonFraction(item, season) * 100}%`,
                  }}
                />
              ))}
              {season.isCurrent && (
                <span className="absolute right-0 top-1/2 h-2.5 w-px -translate-y-1/2 bg-accent" />
              )}
            </div>

            <div className="mt-2 text-caption-10 text-neutral-5">
              {season.yearLabel}
            </div>

            {season.isCurrent && (
              <div className="mt-2 text-copy-13 text-neutral-7">
                {recentLabel}
                {' · '}
                <span className="text-neutral-9">{model.latest.title}</span>
              </div>
            )}
          </Link>
        </m.div>
      ))}
    </div>
  )
}
