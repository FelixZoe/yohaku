# Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the homepage Hero component from a two-column layout to a scattered free-form "journal" layout with handwriting-inspired animations, writing statistics, and recent articles.

**Architecture:** Backend adds a new public `/aggregate/site_info` endpoint to mx-core. Frontend rewrites `Hero.tsx` with absolute-positioned elements on desktop and flex-col on mobile, CSS gradient-sweep title animation, breathing idle floats, and sessionStorage-based return-visit skip. SocialIcon gets a new `variant="mono"` prop.

**Tech Stack:** NestJS (mx-core backend), Next.js 16 + React 19, Tailwind CSS v4, Motion (Framer Motion), TanStack Query, @number-flow/react

**Spec:** `docs/superpowers/specs/2026-03-15-hero-redesign-design.md`

---

## Chunk 1: Backend — `/aggregate/site_info` endpoint

### Task 1: Add `getSiteInfo()` to aggregate service

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/core/src/modules/aggregate/aggregate.service.ts`

- [ ] **Step 1: Add `getSiteInfo()` method**

Add this method to `AggregateService` class (after the existing `getAllSiteWordsCount()` method around line 600):

```typescript
async getSiteInfo() {
  const [postCount, noteCount, totalWordCount, firstPost, firstNote] =
    await Promise.all([
      this.postService.model.countDocuments(),
      this.noteService.model.countDocuments(),
      this.getAllSiteWordsCount(),
      this.postService.model
        .findOne({}, 'created', { sort: { created: 1 } })
        .lean(),
      this.noteService.model
        .findOne({}, 'created', { sort: { created: 1 } })
        .lean(),
    ])

  const firstPostDate = firstPost?.created
  const firstNoteDate = firstNote?.created
  let firstPublishDate: Date | null = null
  if (firstPostDate && firstNoteDate) {
    firstPublishDate =
      firstPostDate < firstNoteDate ? firstPostDate : firstNoteDate
  } else {
    firstPublishDate = firstPostDate || firstNoteDate || null
  }

  return {
    postCount,
    noteCount,
    totalWordCount,
    firstPublishDate: firstPublishDate?.toISOString() ?? null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/aggregate/aggregate.service.ts
git commit -m "feat(aggregate): add getSiteInfo method for public site statistics"
```

### Task 2: Add `/aggregate/site_info` route

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/core/src/modules/aggregate/aggregate.controller.ts`

- [ ] **Step 1: Add the route handler**

Add this method to `AggregateController` class (after the `getSiteWords()` method, around line 371):

```typescript
@Get('/site_info')
async getSiteInfo() {
  return await this.aggregateService.getSiteInfo()
}
```

No `@Auth()` decorator — this is a public endpoint.

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/aggregate/aggregate.controller.ts
git commit -m "feat(aggregate): add public /aggregate/site_info endpoint"
```

---

## Chunk 2: Frontend — SocialIcon `variant="mono"` prop

### Task 3: Add `variant` prop to SocialIcon

**Files:**
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/components/modules/home/SocialIcon.tsx`

- [ ] **Step 1: Update the SocialIcon interface and rendering**

Change the interface and component to support the new variant:

```typescript
interface SocialIconProps {
  id: string
  type: string
  variant?: 'default' | 'mono'
}
```

Update the `SocialIcon` component — replace the existing `return (` block (lines 117-141) with logic that branches on `variant`:

```typescript
export const SocialIcon = memo((props: SocialIconProps) => {
  const { id, type, variant = 'default' } = props

  const [name, Icon, iconBg, hrefFn] = useMemo(() => {
    const [name, Icon, iconBg, hrefFn] = (iconSet as any)[type as any] || []
    return [name, Icon, iconBg, hrefFn]
  }, [type])

  if (!name) return null
  const href = hrefFn(id)

  if (variant === 'mono') {
    return (
      <FloatPopover
        type="tooltip"
        triggerElement={
          <a
            className="center flex size-7 rounded-full border border-neutral-200 text-neutral-400 transition-colors duration-300 hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-accent dark:hover:text-accent"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            <span className="text-sm [&_svg]:size-[13px] [&_i]:text-[13px]">
              {Icon}
            </span>
          </a>
        }
      >
        {name}
      </FloatPopover>
    )
  }

  return (
    <FloatPopover
      type="tooltip"
      triggerElement={
        <MotionButtonBase
          className="center flex aspect-square size-10 rounded-full text-2xl text-neutral-50"
          style={{
            background: iconBg,
          }}
        >
          <a
            className="center flex"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {Icon}
          </a>
        </MotionButtonBase>
      }
    >
      {name}
    </FloatPopover>
  )
})
```

Keep `SocialIcon.displayName = 'SocialIcon'` after the component definition (same as current code).

- [ ] **Step 2: Verify no other SocialIcon usages break**

Run: `cd /Users/innei/git/innei-repo/Shiroi && grep -rn "SocialIcon" apps/web/src --include="*.tsx" --include="*.ts"`

All existing usages pass no `variant` prop, so they default to `'default'` — no changes needed.

- [ ] **Step 3: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/components/modules/home/SocialIcon.tsx
git commit -m "feat(SocialIcon): add variant='mono' for monochrome style"
```

---

## Chunk 3: Frontend — Hero.tsx complete rewrite

### Task 4: Add i18n strings for Hero

**Files:**
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/zh/home.json`
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/en/home.json`
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/ja/home.json` (if exists)

- [ ] **Step 1: Check existing i18n keys and add new ones**

First read the existing home message files to understand the structure:

```bash
cat apps/web/src/messages/zh/home.json
cat apps/web/src/messages/en/home.json
```

Add these keys to the Chinese file:
```json
"hero_recently_writing": "最近在写",
"hero_season_spring": "春",
"hero_season_summer": "夏",
"hero_season_autumn": "秋",
"hero_season_winter": "冬",
"hero_stat_posts": "篇",
"hero_stat_words_unit": "万字",
"hero_stat_days": "天"
```

Add these keys to the English file:
```json
"hero_recently_writing": "Recently Writing",
"hero_season_spring": "Spring",
"hero_season_summer": "Summer",
"hero_season_autumn": "Autumn",
"hero_season_winter": "Winter",
"hero_stat_posts": "posts",
"hero_stat_words_unit": "k words",
"hero_stat_days": "days"
```

Add these keys to the Japanese file (if `ja/home.json` exists):
```json
"hero_recently_writing": "最近の執筆",
"hero_season_spring": "春",
"hero_season_summer": "夏",
"hero_season_autumn": "秋",
"hero_season_winter": "冬",
"hero_stat_posts": "記事",
"hero_stat_words_unit": "万字",
"hero_stat_days": "日"
```

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/messages/*/home.json
git commit -m "feat(i18n): add Hero redesign translation keys"
```

### Task 5: Rewrite Hero.tsx

**Files:**
- Rewrite: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/app/[locale]/(home)/components/Hero.tsx`

This is the core task. The new Hero.tsx replaces the entire file. Key architectural decisions:

1. **Desktop**: `position: relative` container with `absolute` positioned children
2. **Mobile**: `flex flex-col` vertical layout, no absolute positioning
3. **Entry animation**: Motion library for fade/translate, CSS for title gradient sweep
4. **Return visit**: `sessionStorage` check to skip entry sequence
5. **Breathing**: CSS `@keyframes` on desktop only, respects `prefers-reduced-motion`

- [ ] **Step 1: Write the new Hero.tsx**

Complete rewrite of `apps/web/src/app/[locale]/(home)/components/Hero.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { m, useReducedMotion } from 'motion/react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useRef } from 'react'

import { isSupportIcon, SocialIcon } from '~/components/modules/home/SocialIcon'
import { fetchQuoteByLocale } from '~/components/modules/shared/Hitokoto'
import { MotionButtonBase } from '~/components/ui/button'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { softBouncePreset } from '~/constants/spring'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { buildNotePath } from '~/lib/note-route'
import { noopObj } from '~/lib/noop'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'
import {
  useAggregationSelector,
  useAppConfigSelector,
} from '~/providers/root/aggregation-data-provider'

import { useHomeQueryData } from '../query'

// --- Helpers ---

const getSeasonKey = (month: number) => {
  if (month >= 3 && month <= 5) return 'hero_season_spring'
  if (month >= 6 && month <= 8) return 'hero_season_summer'
  if (month >= 9 && month <= 11) return 'hero_season_autumn'
  return 'hero_season_winter'
}

const toChineseYear = (year: number) =>
  String(year).replace(/\d/g, (d) => '〇一二三四五六七八九'[+d])

const isFirstVisit = () => {
  if (typeof window === 'undefined') return true
  return !sessionStorage.getItem('hero-entered')
}

const markVisited = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('hero-entered', '1')
  }
}

// --- Main Component ---

export const Hero = () => {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const prefersReducedMotion = useReducedMotion()

  const { title, description } = useAppConfigSelector((config) => ({
    ...config.hero,
  }))!
  const siteOwner = useAggregationSelector((agg) => agg.user)
  const { avatar, socialIds } = siteOwner || {}

  const firstVisitRef = useRef(isFirstVisit())
  const shouldAnimate = firstVisitRef.current && !prefersReducedMotion

  // Mark visited after entry animation completes
  const animationDoneRef = useRef(false)
  if (!animationDoneRef.current && shouldAnimate) {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        markVisited()
        animationDoneRef.current = true
      }, 3000)
    }
  } else if (!shouldAnimate) {
    markVisited()
  }

  // Season date
  const seasonDate = useMemo(() => {
    const now = new Date()
    const seasonKey = getSeasonKey(now.getMonth() + 1)
    if (locale === 'zh') {
      return `${toChineseYear(now.getFullYear())}年 · ${t(seasonKey)}`
    }
    return `${now.getFullYear()} · ${t(seasonKey)}`
  }, [locale, t])

  // Title text for gradient sweep
  const titleText = useMemo(
    () => title.template.map((t) => t.text || '').join(''),
    [title.template],
  )

  return (
    <div className="relative mx-auto min-w-0 max-w-7xl overflow-hidden px-6 lg:h-[65vh] lg:min-h-[560px] lg:px-8">
      {/* Background lights */}
      <HeroBackground shouldAnimate={shouldAnimate} />

      {/* Mobile: flex-col layout */}
      <div className="flex flex-col pt-20 lg:hidden" style={{ minHeight: 480 }}>
        {/* Top row: avatar + date */}
        <m.div
          className="mb-7 flex items-center gap-2.5"
          initial={shouldAnimate ? { opacity: 0, x: 20 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...softBouncePreset, delay: shouldAnimate ? 0.5 : 0 }}
        >
          {avatar && (
            <Image
              alt={tCommon('aria_site_owner_avatar')}
              height={36}
              width={36}
              src={avatar}
              className="rounded-full border border-neutral-200 dark:border-neutral-700"
            />
          )}
          <span className="font-serif text-[10px] tracking-wider text-neutral-4">
            {seasonDate}
          </span>
        </m.div>

        {/* Title */}
        <HeroTitle
          text={titleText}
          shouldAnimate={shouldAnimate}
          className="mb-2"
        />

        {/* Description */}
        <m.div
          className="mb-6 text-xs leading-relaxed text-neutral-5"
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softBouncePreset, delay: shouldAnimate ? 2.0 : 0 }}
        >
          {description}
        </m.div>

        {/* Stats: horizontal compact */}
        <HeroWritingStats
          shouldAnimate={shouldAnimate}
          layout="horizontal"
          delay={2.1}
        />

        {/* Recent writing */}
        <div className="my-4 flex-1">
          <HeroRecentWriting shouldAnimate={shouldAnimate} delay={2.2} />
        </div>

        {/* Bottom: social + hitokoto */}
        <div className="flex items-end justify-between pb-6 pt-4">
          <HeroSocialIcons
            socialIds={socialIds}
            shouldAnimate={shouldAnimate}
            delay={2.4}
          />
          <HeroHitokoto shouldAnimate={shouldAnimate} delay={2.6} />
        </div>
      </div>

      {/* Desktop: absolute scattered layout */}
      <div className="relative hidden size-full lg:block">
        {/* Avatar: top-right */}
        <div className="absolute right-[5%] top-[12%] hero-breathe-1">
          <m.div
            initial={shouldAnimate ? { opacity: 0, x: 20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...softBouncePreset, delay: shouldAnimate ? 0.5 : 0 }}
          >
          {avatar && (
            <Image
              alt={tCommon('aria_site_owner_avatar')}
              height={48}
              width={48}
              src={avatar}
              className="rounded-full border border-neutral-200 shadow-sm dark:border-neutral-700"
            />
          )}
          </m.div>
        </div>

        {/* Title: top-left */}
        <div className="absolute left-[5%] top-[15%] hero-breathe-2">
          <HeroTitle text={titleText} shouldAnimate={shouldAnimate} />
        </div>

        {/* Description: below title */}
        <div className="absolute left-[5%] top-[28%] hero-breathe-3">
          <m.div
            className="max-w-xs text-xs leading-relaxed text-neutral-5"
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...softBouncePreset, delay: shouldAnimate ? 2.0 : 0 }}
          >
            {description}
          </m.div>
        </div>

        {/* Writing stats: right side, vertical */}
        <div className="absolute right-[5%] top-[45%] hero-breathe-4">
          <HeroWritingStats
            shouldAnimate={shouldAnimate}
            layout="vertical"
            delay={2.1}
          />
        </div>

        {/* Recent writing: left side */}
        <div className="absolute left-[5%] top-[48%] hero-breathe-5">
          <HeroRecentWriting shouldAnimate={shouldAnimate} delay={2.2} />
        </div>

        {/* Social icons: bottom-left */}
        <div className="absolute bottom-[12%] left-[5%] hero-breathe-6">
          <HeroSocialIcons
            socialIds={socialIds}
            shouldAnimate={shouldAnimate}
            delay={2.4}
          />
        </div>

        {/* Hitokoto: bottom-right */}
        <div className="absolute bottom-[10%] right-[5%] hero-breathe-1">
          <HeroHitokoto shouldAnimate={shouldAnimate} delay={2.6} />
        </div>
      </div>
    </div>
  )
}

// --- Sub-components ---

const HeroBackground = ({ shouldAnimate }: { shouldAnimate: boolean }) => (
  <>
    <m.div
      className="pointer-events-none absolute -right-10 -top-20 size-[350px] rounded-full bg-[radial-gradient(ellipse,rgba(255,228,180,0.35)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse,rgba(180,200,255,0.15)_0%,transparent_65%)] motion-reduce:animate-none"
      style={{ animation: 'hero-light-drift 8s ease-in-out infinite alternate' }}
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    />
    <m.div
      className="pointer-events-none absolute bottom-10 left-5 size-[200px] rounded-full bg-accent/[0.06] blur-3xl motion-reduce:animate-none"
      style={{
        animation: 'hero-light-drift 12s ease-in-out infinite alternate-reverse',
      }}
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
    />
  </>
)

const HeroTitle = ({
  text,
  shouldAnimate,
  className,
}: {
  text: string
  shouldAnimate: boolean
  className?: string
}) => (
  <h1
    className={clsxm(
      'font-serif text-3xl tracking-[5px] text-neutral-9 lg:text-4xl lg:tracking-[6px]',
      shouldAnimate && 'hero-title-reveal',
      !shouldAnimate && 'hero-title-static',
      className,
    )}
  >
    {text}
  </h1>
)

const HeroWritingStats = ({
  shouldAnimate,
  layout,
  delay,
}: {
  shouldAnimate: boolean
  layout: 'horizontal' | 'vertical'
  delay: number
}) => {
  const t = useTranslations('home')
  const { data } = useQuery({
    queryKey: ['site-info'],
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
  const wordCountWan = data?.totalWordCount
    ? Math.round(data.totalWordCount / 10000)
    : 0
  const days = data?.firstPublishDate
    ? Math.floor(
        (Date.now() - new Date(data.firstPublishDate).getTime()) / 86400000,
      )
    : 0

  const items = [
    { value: articleCount, label: t('hero_stat_posts') },
    { value: wordCountWan, label: t('hero_stat_words_unit') },
    { value: days, label: t('hero_stat_days') },
  ]

  return (
    <m.div
      className={clsx(
        layout === 'vertical'
          ? 'flex flex-col gap-1 text-right font-serif italic'
          : 'flex gap-5 font-serif italic',
        'text-[10px] text-neutral-4',
      )}
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softBouncePreset, delay: shouldAnimate ? delay : 0 }}
    >
      {items.map((item) => (
        <div key={item.label}>
          <span className="not-italic text-neutral-5" style={{ fontSize: 18, fontWeight: 500 }}>
            <NumberSmoothTransition>{item.value}</NumberSmoothTransition>
          </span>{' '}
          {item.label}
        </div>
      ))}
    </m.div>
  )
}

const HeroRecentWriting = ({
  shouldAnimate,
  delay,
}: {
  shouldAnimate: boolean
  delay: number
}) => {
  const t = useTranslations('home')
  const homeData = useHomeQueryData()
  const { posts = [], notes = [] } = homeData || {}

  const recentItems = useMemo(() => {
    const all = [
      ...posts.map((p: any) => ({
        title: p.title,
        href: routeBuilder(Routes.Post, {
          category: p.category.slug,
          slug: p.slug,
        }),
        created: p.created,
      })),
      ...notes.map((n: any) => ({
        title: n.title,
        href: buildNotePath(n),
        created: n.created,
      })),
    ]
    return all
      .sort(
        (a, b) =>
          new Date(b.created).getTime() - new Date(a.created).getTime(),
      )
      .slice(0, 3)
  }, [posts, notes])

  if (recentItems.length === 0) return null

  return (
    <m.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softBouncePreset, delay: shouldAnimate ? delay : 0 }}
    >
      <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-4">
        {t('hero_recently_writing')}
      </div>
      <div className="flex flex-col gap-1.5">
        {recentItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block border-b border-neutral-200/40 pb-1 text-xs text-neutral-6 transition-colors duration-300 hover:text-accent dark:border-neutral-700/40"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </m.div>
  )
}

const HeroSocialIcons = ({
  socialIds,
  shouldAnimate,
  delay,
}: {
  socialIds: Record<string, string> | undefined
  shouldAnimate: boolean
  delay: number
}) => (
  <m.div
    className="flex gap-3"
    initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ ...softBouncePreset, delay: shouldAnimate ? delay : 0 }}
  >
    {Object.entries(socialIds || noopObj).map(([type, id]: any) => {
      if (!isSupportIcon(type)) return null
      return <SocialIcon key={type} id={id} type={type} variant="mono" />
    })}
  </m.div>
)

const HeroHitokoto = ({
  shouldAnimate,
  delay,
}: {
  shouldAnimate: boolean
  delay: number
}) => {
  const t = useTranslations('home')
  const { custom, random } = useAppConfigSelector(
    (config) => config.hero.hitokoto || {},
  )!

  return (
    <m.div
      className="max-w-[30ch] text-right font-serif text-[11px] italic text-neutral-4 lg:max-w-[40ch]"
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softBouncePreset, delay: shouldAnimate ? delay : 0 }}
    >
      {random ? (
        <RemoteHitokotoPS />
      ) : (
        <>
          <span className="text-neutral-3">P.S.</span>{' '}
          {custom ?? t('hero_default_hitokoto')}
        </>
      )}
    </m.div>
  )
}

const RemoteHitokotoPS = () => {
  const locale = useLocale()
  const {
    data: hitokoto,
    isLoading,
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

  if (isLoading || !hitokoto) return null

  return (
    <span className="group inline-flex items-center gap-1.5">
      <span className="text-neutral-3">P.S.</span> {hitokoto}
      <MotionButtonBase
        disabled={isRefetching}
        className={clsxm(
          'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          isRefetching && 'animate-spin opacity-100',
        )}
        onClick={() => refetch()}
      >
        <i className="i-mingcute-refresh-2-line text-[10px]" />
      </MotionButtonBase>
    </span>
  )
}
```

- [ ] **Step 2: Lint the modified file**

Run: `cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web lint -- --fix apps/web/src/app/\\[locale\\]/\\(home\\)/components/Hero.tsx`

Fix any lint issues reported.

- [ ] **Step 3: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/app/\\[locale\\]/\\(home\\)/components/Hero.tsx
git commit -m "feat(hero): rewrite Hero with scattered journal layout and animations"
```

### Task 6: Add Hero CSS animations

**Files:**
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/styles/animation.css` (or whichever CSS file contains `@keyframes`)

- [ ] **Step 1: Check existing animation file**

Read `apps/web/src/styles/animation.css` to find the right place to add new keyframes.

- [ ] **Step 2: Add Hero-specific keyframes and utility classes**

Append these to the animation CSS file:

```css
/* Hero: light drift */
@keyframes hero-light-drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(15px, 8px) scale(1.05); }
}

/* Hero: title gradient sweep reveal */
.hero-title-reveal {
  background: linear-gradient(90deg, currentColor 50%, transparent 50%);
  background-size: 200% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: hero-title-sweep 2s ease forwards 0.3s;
}

.hero-title-static {
  animation: hero-title-fade 0.3s ease forwards;
}

@keyframes hero-title-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes hero-title-sweep {
  to { background-position: 0 0; }
}

/* Hero: breathing floats (desktop only, respects reduced motion) */
@media (prefers-reduced-motion: no-preference) {
  @media (min-width: 1024px) {
    .hero-breathe-1 { animation: hero-breathe-a 14s ease-in-out infinite alternate; }
    .hero-breathe-2 { animation: hero-breathe-b 16s ease-in-out infinite alternate; }
    .hero-breathe-3 { animation: hero-breathe-a 18s ease-in-out infinite alternate-reverse; }
    .hero-breathe-4 { animation: hero-breathe-b 15s ease-in-out infinite alternate; }
    .hero-breathe-5 { animation: hero-breathe-a 13s ease-in-out infinite alternate-reverse; }
    .hero-breathe-6 { animation: hero-breathe-b 17s ease-in-out infinite alternate; }
  }
}

@keyframes hero-breathe-a {
  from { transform: translate(0, 0); }
  to   { transform: translate(2px, -3px); }
}

@keyframes hero-breathe-b {
  from { transform: translate(0, 0); }
  to   { transform: translate(-2px, 2px); }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/styles/animation.css
git commit -m "feat(styles): add Hero light-drift, title-sweep, and breathing animations"
```

---

## Chunk 4: Integration and verification

### Task 7: Add i18n keys for other locales (if any)

**Files:**
- Check: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/` for other locale directories

- [ ] **Step 1: Check if there are other locale files beyond zh and en**

```bash
ls apps/web/src/messages/
```

If additional locales exist, add the same keys with appropriate translations (can use English as fallback).

- [ ] **Step 2: Commit if changes made**

### Task 8: Visual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/innei/git/innei-repo/Shiroi && pnpm dev
```

- [ ] **Step 2: Verify in browser**

Check these items at `http://localhost:2323`:
1. Desktop (≥1024px): elements scattered with correct positioning
2. Mobile (<1024px): vertical flex layout, no overlap
3. Entry animation plays on first visit (clear sessionStorage first)
4. Return visit skips animation (reload page)
5. Dark mode: light spots change to cold color, text follows neutral tokens
6. Social icons show monochrome, hover shows accent color
7. Writing stats load and display with counting animation
8. "Recently writing" shows 3 recent articles with working links
9. P.S. hitokoto displays in italic serif style
10. `prefers-reduced-motion`: disable animations in system settings, verify no motion

- [ ] **Step 3: Lint check on modified files only**

```bash
cd /Users/innei/git/innei-repo/Shiroi && pnpm --filter @shiro/web lint -- --fix apps/web/src/app/\\[locale\\]/\\(home\\)/components/Hero.tsx apps/web/src/components/modules/home/SocialIcon.tsx
```

Fix any issues found.

- [ ] **Step 4: Final commit if fixes needed**
