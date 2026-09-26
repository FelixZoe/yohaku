'use client'

import { useQuery } from '@tanstack/react-query'
import { m } from 'motion/react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useMemo, useState } from 'react'

import { isSupportIcon, SocialIcon } from '~/components/modules/home/SocialIcon'
import { fetchQuoteByLocale } from '~/components/modules/shared/Hitokoto'
import { MotionButtonBase } from '~/components/ui/button'
import {
  fadeInLcpSafe,
  fadeOnlyInLcpSafe,
  riseInLcpSafe,
} from '~/constants/motion-entrance'
import { clsxm } from '~/lib/helper'
import { noopObj } from '~/lib/noop'
import { apiClient } from '~/lib/request'
import {
  useAggregationSelector,
  useAppConfigSelector,
} from '~/providers/root/aggregation-data-provider'

const riseProps = (delay: number) => riseInLcpSafe(delay)
const fadeProps = (delay: number) => fadeInLcpSafe(delay)
// Hero h1 is the LCP candidate. Opacity-only avoids any transform-driven
// CLS regression observed when the y translate was active.
const heroH1Props = (delay: number) => fadeOnlyInLcpSafe(delay)

// --- Main Component ---

export const Hero = () => {
  const tCommon = useTranslations('common')

  const { title, description } = useAppConfigSelector((config) => ({
    ...config.hero,
  }))!
  const siteOwner = useAggregationSelector((agg) => agg.user)
  const { avatar } = siteOwner || {}

  const titleElements = useMemo(() => {
    const result: React.ReactNode[] = []
    for (const [i, t] of title.template.entries()) {
      if (t.type === 'br') {
        result.push(<br key={`br-${i}`} />)
        continue
      }

      const rawTag = t.type && t.type !== 'br' ? t.type : 'span'

      // Block-level tags (h1, div, p...) inside the outer <h1> must be rendered as inline elements.
      const blockTags = new Set([
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'div',
        'p',
        'section',
        'article',
      ])
      const needsInline = blockTags.has(rawTag)
      const Tag = (needsInline ? 'span' : rawTag) as React.ElementType
      const inlineStyle = needsInline
        ? ({ display: 'inline', ...t.style } as React.CSSProperties)
        : t.style

      // Decorative element with no text (e.g. cursor)
      if (!t.text && (t.class || inlineStyle)) {
        result.push(
          <Tag className={t.class} key={`dec-${i}`} style={inlineStyle} />,
        )
        continue
      }

      if (!t.text) continue

      // Explicit line-break control via `type: br`; no magic period splitting
      const key = `${i}`
      result.push(
        t.class || inlineStyle ? (
          <Tag className={t.class} key={key} style={inlineStyle}>
            {t.text}
          </Tag>
        ) : (
          <Fragment key={key}>{t.text}</Fragment>
        ),
      )
    }
    return result
  }, [title.template])

  return (
    <div className="relative mx-auto min-w-0 max-w-[1400px] px-6 lg:px-12 xl:px-16 2xl:px-24">
      {/* Paper glow — static center light */}
      <m.div
        className="pointer-events-none absolute -z-10 left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full size-[250px] lg:size-[450px] bg-[radial-gradient(ellipse,rgba(255,240,210,0.15)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse,rgba(180,200,255,0.08)_0%,transparent_55%)]"
        {...fadeProps(0)}
      />

      {/* Two-zone layout: focal center + whisper footer */}
      <div className="flex min-h-[80vh] flex-col items-center justify-center py-16">
        <div className="flex-1" />

        {avatar && (
          <m.div className="mb-8" {...riseProps(0.1)}>
            <Image
              alt={tCommon('aria_site_owner_avatar')}
              className="rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] size-20 lg:size-28"
              height={112}
              src={avatar}
              width={112}
            />
          </m.div>
        )}

        <m.h1
          className="text-center text-title-24 font-normal leading-relaxed text-neutral-9 lg:text-[2.5rem] lg:leading-snug"
          {...heroH1Props(0.2)}
        >
          {titleElements}
        </m.h1>

        <m.div
          className="mt-4 text-center text-caption-10 uppercase tracking-[1.2px] text-neutral-5 lg:text-label-12 lg:tracking-[1.5px]"
          {...riseProps(0.4)}
        >
          {description}
        </m.div>

        <div className="flex-[1.5]" />

        <m.div className="text-center" {...riseProps(0.6)}>
          <HeroHitokoto />
          <div className="mt-2.5">
            <HeroWritingStats />
          </div>
        </m.div>

        <m.div className="mb-8 mt-7" {...riseProps(0.8)}>
          <SocialIcons />
        </m.div>
      </div>
    </div>
  )
}

// --- Sub-components ---

const SocialIcons = () => {
  const siteOwner = useAggregationSelector((agg) => agg.user)
  const { socialIds } = siteOwner || {}

  return (
    <div className="flex justify-center gap-3">
      {Object.entries(socialIds || noopObj).map(([type, id]: any) => {
        if (!isSupportIcon(type)) return null
        return <SocialIcon id={id} key={type} type={type} />
      })}
    </div>
  )
}

const HeroWritingStats = () => {
  const t = useTranslations('home')
  const locale = useLocale()
  const { data } = useQuery({
    queryKey: ['site-info', locale],
    queryFn: () =>
      apiClient.aggregate.proxy.site_info.get<{
        postCount: number
        noteCount: number
        totalWordCount: number
        firstPublishDate: string | null
      }>(),
    staleTime: 5 * 60 * 1000,
  })

  const articleCount = (data?.postCount ?? 0) + (data?.noteCount ?? 0)
  const wordCountDisplay = data?.totalWordCount
    ? locale === 'en'
      ? Math.round(data.totalWordCount / 1000)
      : Math.round(data.totalWordCount / 10000)
    : 0
  const [now] = useState(() => Date.now())
  const days = data?.firstPublishDate
    ? Math.floor((now - new Date(data.firstPublishDate).getTime()) / 86400000)
    : 0

  const items = [
    { value: articleCount, label: t('hero_stat_posts') },
    { value: wordCountDisplay, label: t('hero_stat_words_unit') },
    { value: days, label: t('hero_stat_days') },
  ]

  return (
    <div className="flex gap-3 justify-center text-caption-10 tracking-wide text-neutral-4">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && <span>·</span>}
          <span>
            {item.value} {item.label}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

const HeroHitokoto = () => {
  const t = useTranslations('home')
  const { custom, random } = useAppConfigSelector(
    (config) => config.hero.hitokoto || {},
  )!

  return (
    <div className="min-h-[1.5em] max-w-[65ch] font-serif text-label-12 italic text-neutral-5">
      {random ? (
        <RemoteHitokotoQuote />
      ) : (
        <>「{custom ?? t('hero_default_hitokoto')}」</>
      )}
    </div>
  )
}

const RemoteHitokotoQuote = () => {
  const locale = useLocale()
  const t = useTranslations('home')
  const {
    data: hitokoto,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['hitokoto', locale],
    queryFn: () => fetchQuoteByLocale(locale),
    refetchInterval: 300000,
    staleTime: Infinity,
    refetchOnMount: 'always',
    meta: { persist: true },
  })

  // Always paint the placeholder so LCP fires on first frame instead of
  // waiting for an external quote API (hitokoto.cn / dummyjson / meigen).
  // The remote quote swaps in via the existing transition once loaded.
  const displayed = hitokoto ?? t('hero_default_hitokoto')

  return (
    <span className="group inline-flex items-center gap-1.5">
      <span
        className={clsxm(
          'transition-all duration-300',
          isRefetching && 'opacity-0 blur-sm',
        )}
      >
        「{displayed}」
      </span>
      <MotionButtonBase
        disabled={isRefetching}
        className={clsxm(
          'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          isRefetching && 'animate-spin opacity-100',
        )}
        onClick={() => refetch()}
      >
        <i className="i-mingcute-refresh-2-line text-icon-sm" />
      </MotionButtonBase>
    </span>
  )
}
