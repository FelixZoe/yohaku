# Post Detail Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update post/note detail page visual style to match 「書写·信纸·光影」 design language — unified NoticeCard, icon-free MetaBar, minimal copyright, card-style related posts.

**Architecture:** Rewrite 4 existing components (PostMetaBar, PostCopyright, PostRelated, AISummary), create 1 new component (NoticeCard), then integrate into post page.tsx and note detail-page.tsx. All changes are visual — no data flow or API changes.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, next-intl, Jotai, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-17-post-detail-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/modules/shared/NoticeCard.tsx` | Generic card container + NoticeCardItem (default/summary variants) |
| Rewrite | `components/modules/post/PostMetaBar.tsx` | Remove icons, pure text · separators |
| Rewrite | `components/modules/post/PostCopyright.tsx` | Grid → flex-col minimal colophon |
| Rewrite | `components/modules/post/PostRelated.tsx` | Prose list → light card + arrows |
| Modify | `components/modules/ai/Summary.tsx` | Add `variant="inline"` mode |
| Modify | `components/modules/shared/SummarySwitcher.tsx` | Pass variant, wrap in NoticeCardItem |
| Modify | `app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx` | Replace TranslationBanner+Summary+PostOutdate with NoticeCard |
| Modify | `app/[locale]/notes/(note-detail)/detail-page.tsx` | Replace TranslationBanner+Summary with NoticeCard |
| Modify | `messages/{zh,en,ja}/common.json` | Add `meta_reads`, `meta_likes` keys |

All paths relative to `apps/web/src/`.

---

### Task 1: Add i18n Keys

**Files:**
- Modify: `apps/web/src/messages/zh/common.json`
- Modify: `apps/web/src/messages/en/common.json`
- Modify: `apps/web/src/messages/ja/common.json`

- [ ] **Step 1: Add i18n keys to all three locales**

zh:
```json
"meta_reads": "{count} 阅读",
"meta_likes": "{count} 喜欢"
```

en:
```json
"meta_reads": "{count} reads",
"meta_likes": "{count} likes"
```

ja:
```json
"meta_reads": "{count} 閲覧",
"meta_likes": "{count} いいね"
```

Add near existing `sort_*` / `pagination_*` keys.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/messages/
git commit -m "feat(i18n): add meta_reads and meta_likes keys"
```

---

### Task 2: Create NoticeCard Component

**Files:**
- Create: `apps/web/src/components/modules/shared/NoticeCard.tsx`

- [ ] **Step 1: Create NoticeCard and NoticeCardItem**

```tsx
import { Children, type FC, type ReactNode } from 'react'

import { clsxm } from '~/lib/helper'

interface NoticeCardProps {
  children: ReactNode
  className?: string
}

export const NoticeCard: FC<NoticeCardProps> = ({ children, className }) => {
  const validChildren = Children.toArray(children).filter(Boolean)
  if (validChildren.length === 0) return null

  return (
    <div
      className={clsxm(
        'overflow-hidden rounded bg-white/40 border border-black/[0.03]',
        'dark:bg-white/5 dark:border-white/5',
        className,
      )}
    >
      {validChildren.map((child, index) => (
        <div key={index}>
          {index > 0 && (
            <div className="h-px bg-black/[0.03] dark:bg-white/[0.03]" />
          )}
          {child}
        </div>
      ))}
    </div>
  )
}

interface NoticeCardItemProps {
  children: ReactNode
  variant?: 'default' | 'summary'
}

export const NoticeCardItem: FC<NoticeCardItemProps> = ({
  children,
  variant = 'default',
}) => {
  if (variant === 'summary') {
    return (
      <div className="notice-card-summary relative px-[18px] py-3.5">
        {/* Light spot */}
        <div
          className="pointer-events-none absolute -right-5 -top-5 size-[120px] opacity-100 dark:opacity-50"
          style={{
            background:
              'radial-gradient(circle, rgba(255,228,180,0.12), transparent 70%)',
          }}
        />
        <div className="relative">{children}</div>
      </div>
    )
  }

  return <div className="px-[18px] py-3">{children}</div>
}
```

Add CSS for the summary gradient background. Since it uses `var(--color-accent)` with relative color syntax, use inline style:

The `notice-card-summary` class needs the gradient background. Add a `style` prop to the summary variant div:

```tsx
// In the summary variant div, add:
style={{
  background: 'linear-gradient(135deg, rgb(from var(--color-accent) r g b / 0.04) 0%, rgba(255,228,180,0.06) 50%, rgb(from var(--color-accent) r g b / 0.02) 100%)',
}}
```

For dark mode, use a CSS class approach or `@media (prefers-color-scheme: dark)`. Since the project uses class-based dark mode, the simplest approach is to use two inline style divs and toggle with `dark:hidden` / `hidden dark:block`, or use a single CSS custom property approach.

**Simpler approach:** Use `oklch` from the existing `--a` CSS variable (the accent color is already available as `--a` in oklch space per the project's AccentColorStyleInjector). Use Tailwind's `bg-accent/4` which maps to the accent with 4% opacity.

Final implementation for summary variant:

```tsx
if (variant === 'summary') {
  return (
    <div
      className="relative px-[18px] py-3.5 bg-gradient-to-br from-accent/[0.04] via-[rgba(255,228,180,0.06)] to-accent/[0.02] dark:from-accent/[0.06] dark:via-[rgba(255,228,180,0.04)] dark:to-accent/[0.03]"
    >
      <div
        className="pointer-events-none absolute -right-5 -top-5 size-[120px] dark:opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(255,228,180,0.12), transparent 70%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/shared/NoticeCard.tsx
git commit -m "feat: create NoticeCard and NoticeCardItem components"
```

---

### Task 3: Rewrite PostMetaBar (Remove Icons)

**Files:**
- Modify: `apps/web/src/components/modules/post/PostMetaBar.tsx`

- [ ] **Step 1: Rewrite PostMetaBar**

Key changes:
- Remove imports: `MdiClockOutline`, `FeHash`, `ThumbsupIcon`
- Remove `i-mingcute-eye-2-line` icon usage
- Outer className: `text-sm text-neutral-6` → `text-xs text-neutral-4`
- Add `<span className="text-neutral-3">·</span>` separators between sections
- Time: just `<RelativeTime />`, no clock icon
- Category: remove `FeHash`, keep `MotionButtonBase` + `shiro-link--underline`
- Tags: behavior unchanged (click → TagDetailModal)
- Read count: `<NumberSmoothTransition>{count}</NumberSmoothTransition>` + `{t('meta_reads', { count: '' })}` → simpler: just show `{count} 阅读` via i18n
- Like count: same pattern with `meta_likes`
- Edited: keep FloatPopover tooltip unchanged

Replace file content fully. Preserve: Component signature, props interface, FloatPopover for edited, MotionButtonBase for category, TagDetailModal for tags, NumberSmoothTransition for counts, `children` pass-through.

- [ ] **Step 2: Verify no type errors**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostMetaBar.tsx
git commit -m "refactor(post): rewrite PostMetaBar as pure text with · separators"
```

---

### Task 4: Rewrite PostCopyright (Minimal Colophon)

**Files:**
- Modify: `apps/web/src/components/modules/post/PostCopyright.tsx`

- [ ] **Step 1: Rewrite PostCopyright**

Replace grid layout with flex-col:

```
{title} · {name} · {formattedDate}
{link}  [copy button]
CC BY-NC-SA 4.0 · {license text}
                                Signature
```

Key changes:
- Remove `grid grid-cols-[auto_1fr]` → use `flex flex-col gap-1.5`
- Remove label spans (copyright_title, copyright_link, copyright_modified, copyright_author)
- Line 1: `{title} · {name} · {lastModified}` in single `<div>`, `text-[11px] text-neutral-4`
- Line 2: `{link}` + copy button (keep IconScaleTransition), `text-[11px] text-neutral-4 break-all`
- Line 3: CC link (keep FloatPopover tooltip) + license suffix, `text-[11px] text-neutral-4`
- Remove second `border-t` divider between info and license (now single flow)
- Top separator: `h-px bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.04]`
- Signature: keep `<Signature />` right-aligned

Preserve: all imports, `CC_DEED_URL`, `handleCopy`, `IconScaleTransition`, `FloatPopover`, `Signature`, `useCurrentPostDataSelector`, `useAggregationSelector`.

- [ ] **Step 2: Verify no type errors**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostCopyright.tsx
git commit -m "refactor(post): rewrite PostCopyright as minimal colophon"
```

---

### Task 5: Rewrite PostRelated (Light Card + Arrows)

**Files:**
- Modify: `apps/web/src/components/modules/post/PostRelated.tsx`

- [ ] **Step 1: Rewrite PostRelated**

Replace prose list with light card:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

import { PeekLink } from '../peek/PeekLink'

export const PostRelated: FC<{
  type?: 'before' | 'after'
}> = ({ type = 'after' }) => {
  const t = useTranslations('post')
  const infoText = type === 'before' ? t('related_before') : t('related_after')
  const related = useCurrentPostDataSelector((s) => s?.related)

  if (!related || related.length === 0) return null

  return (
    <div
      data-hide-print
      className="mb-5 mt-8 overflow-hidden rounded bg-white/40 border border-black/[0.03] p-4 dark:bg-white/5 dark:border-white/5"
    >
      <div className="mb-3 text-[10px] uppercase tracking-[3px] text-neutral-3">
        {infoText}
      </div>
      <div className="space-y-2">
        {related.map((post) => {
          const href = `/posts/${post.category.slug}/${post.slug}`
          return (
            <div key={href} className="flex items-center gap-2">
              <span className="text-neutral-3">→</span>
              <PeekLink
                className="text-sm text-neutral-7 transition-colors hover:text-accent"
                href={href}
              >
                {post.title}
              </PeekLink>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostRelated.tsx
git commit -m "refactor(post): rewrite PostRelated as light card with arrows"
```

---

### Task 6: Add inline variant to AISummary

**Files:**
- Modify: `apps/web/src/components/modules/ai/Summary.tsx`

- [ ] **Step 1: Add variant prop and inline rendering**

Add `variant?: 'standalone' | 'inline'` to `AiSummaryProps`.

Add a new `InlineSummaryContainer` component (rendered when `variant="inline"`):

```tsx
const InlineSummaryContainer: Component<{
  isLoading: boolean
  summary?: string
}> = (props) => {
  const { className, isLoading, summary } = props
  const t = useTranslations('common')

  return (
    <div data-hide-print className={clsxm(className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-5">
          <span className="text-accent/70">✦</span>
          <span>{t('ai_key_insights')}</span>
        </div>
        {!isLoading && (
          <span className="text-[8px] font-mono tracking-[2px] text-neutral-3">
            GEN
          </span>
        )}
      </div>
      <AutoResizeHeight spring>
        <div
          className="text-xs leading-[1.9] text-neutral-6"
          style={{ textAutospace: 'normal' }}
        >
          {isLoading ? (
            InlineSummaryLoadingSkeleton
          ) : (
            <Markdown disableParsingRawHTML removeWrapper>
              {summary || ''}
            </Markdown>
          )}
        </div>
      </AutoResizeHeight>
    </div>
  )
}
```

Add a simple inline loading skeleton:

```tsx
const InlineSummaryLoadingSkeleton = (
  <div className="space-y-2">
    <span className="block h-3.5 w-full animate-pulse rounded bg-neutral-9/5" />
    <span className="block h-3.5 w-11/12 animate-pulse rounded bg-neutral-9/5" />
    <span className="block h-3.5 w-9/12 animate-pulse rounded bg-neutral-9/5" />
  </div>
)
```

In `AISummary`, route to `InlineSummaryContainer` when `variant="inline"`:

```tsx
export const AISummary: FC<AiSummaryProps> = memo((props) => {
  const { articleId, hydrateText, variant = 'standalone' } = props
  // ... existing query logic ...

  const Container = variant === 'inline' ? InlineSummaryContainer : SummaryContainer

  if (hydrateText) {
    return <Container isLoading={false} summary={hydrateText} />
  }
  return <Container isLoading={isLoading} summary={response?.summary} />
})
```

- [ ] **Step 2: Verify no type errors**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/ai/Summary.tsx
git commit -m "feat(ai): add inline variant to AISummary for NoticeCard"
```

---

### Task 7: Update SummarySwitcher for NoticeCard

**Files:**
- Modify: `apps/web/src/components/modules/shared/SummarySwitcher.tsx`

- [ ] **Step 1: Add variant prop pass-through**

Add `variant?: 'standalone' | 'inline'` to SummarySwitcher props (extend from AiSummaryProps which now has it).

Pass `variant` to `<AISummary variant={variant} />`.

For `ManualSummary` when `variant="inline"`: strip the border card, render plain text with matching style.

```tsx
export const SummarySwitcher: FC<
  AiSummaryProps & {
    summary?: string
    variant?: 'standalone' | 'inline'
  }
> = memo((props) => {
  const enableSummary = useAggregationSelector((data) => data.ai?.enableSummary)
  const { summary, articleId, variant = 'standalone' } = props

  if (summary && summary.trim().length > 0)
    return <ManualSummary className="my-4" summary={summary} variant={variant} />

  if (!enableSummary) return null

  return (
    <ErrorBoundary variant="inline">
      <div className={variant === 'standalone' ? 'my-4' : ''}>
        <AISummary articleId={articleId} variant={variant} />
      </div>
    </ErrorBoundary>
  )
})
```

Update `ManualSummary` to support inline variant:

```tsx
const ManualSummary: Component<{
  summary: string
  variant?: 'standalone' | 'inline'
}> = ({ className, summary, variant = 'standalone' }) => {
  const t = useTranslations('common')

  if (variant === 'inline') {
    return (
      <div className={clsxm(className)}>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-5">
          <span className="text-accent/70">✦</span>
          <span>{t('summary_label')}</span>
        </div>
        <div className="text-xs leading-[1.9] text-neutral-6">{summary}</div>
      </div>
    )
  }

  return (
    <div
      className={clsxm(
        'space-y-2 rounded-xl border border-neutral-3 p-4',
        className,
      )}
    >
      <div className="flex items-center">
        <i className="i-mingcute-sparkles-line mr-2 text-lg" />
        {t('summary_label')}
      </div>
      <div className="m-0! text-sm leading-loose text-neutral-9/85">
        {summary}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/shared/SummarySwitcher.tsx
git commit -m "feat: add inline variant to SummarySwitcher for NoticeCard"
```

---

### Task 8: Integrate NoticeCard into Post Detail Page

**Files:**
- Modify: `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx`
- Modify: `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra.tsx`

- [ ] **Step 1: Create PostNoticeCard in pageExtra.tsx**

Add a new exported component `PostNoticeCard` at the bottom of pageExtra.tsx:

```tsx
import { differenceInDays } from 'date-fns'

import {
  NoticeCard,
  NoticeCardItem,
} from '~/components/modules/shared/NoticeCard'
import { SummarySwitcher } from '~/components/modules/shared/SummarySwitcher'
import { TranslatedBadge } from '~/components/modules/translation/TranslatedBadge'
import { RelativeTime } from '~/components/ui/relative-time'

export const PostNoticeCard = () => {
  const t = useTranslations('post')
  const tCommon = useTranslations('common')
  const data = useCurrentPostDataSelector((s) => {
    if (!s) return null
    return {
      id: s.id,
      modified: s.modified,
      isTranslated: s.isTranslated,
      translationMeta: s.translationMeta,
      summary: s.summary || '',
    }
  })

  if (!data) return null

  const { id, modified, isTranslated, translationMeta, summary } = data
  const isOutdated = modified
    ? differenceInDays(new Date(), new Date(modified)) > 60
    : false

  return (
    <NoticeCard className="my-8">
      {isOutdated && modified && (
        <NoticeCardItem>
          <div className="flex items-center gap-2 text-[11px] text-neutral-4">
            <span className="opacity-60">⚠</span>
            <span>
              {t('outdated_prefix')}
              <RelativeTime date={modified} />
              {t('outdated_suffix')}
            </span>
          </div>
        </NoticeCardItem>
      )}
      {isTranslated && translationMeta && (
        <NoticeCardItem>
          <TranslationNoticeContent translationMeta={translationMeta} />
        </NoticeCardItem>
      )}
      <NoticeCardItem variant="summary">
        <SummarySwitcher articleId={id!} summary={summary} variant="inline" />
      </NoticeCardItem>
    </NoticeCard>
  )
}
```

`TranslationNoticeContent` is a small helper (add in same file or inline):

```tsx
const TranslationNoticeContent = ({ translationMeta }: { translationMeta: TranslationMeta }) => {
  const t = useTranslations('translation')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isViewingOriginal = useViewingOriginal()

  const handleToggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (isViewingOriginal) {
      params.delete('lang')
    } else {
      params.set('lang', 'original')
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [router, pathname, searchParams, isViewingOriginal])

  return (
    <div className="flex items-center justify-between text-[11px] text-neutral-4">
      <div className="flex items-center gap-2">
        <span className="opacity-60">🌐</span>
        <span>{isViewingOriginal ? t('original_mode') : t('banner_title')}</span>
        {!isViewingOriginal && (
          <TranslatedBadge translationMeta={translationMeta} />
        )}
      </div>
      <button
        className="text-accent underline underline-offset-2"
        onClick={handleToggle}
      >
        {isViewingOriginal ? tCommon('view_translation') : t('banner_viewOriginal')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update page.tsx to use PostNoticeCard**

In PostPage component, replace:
```tsx
{isTranslated && translationMeta && (
  <TranslationBanner translationMeta={translationMeta} />
)}
<Summary data={data} />
<PostOutdate />
```

With:
```tsx
<PostNoticeCard />
```

Remove unused imports: `TranslationBanner`, `SummarySwitcher`, `PostOutdate`. Remove the standalone `Summary` component.

- [ ] **Step 3: Verify no type errors**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra.tsx
git commit -m "feat(post): integrate NoticeCard into post detail page"
```

---

### Task 9: Integrate NoticeCard into Note Detail Page

**Files:**
- Modify: `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx`

- [ ] **Step 1: Create NoteNoticeCard and replace existing components**

In detail-page.tsx, replace:
```tsx
{isTranslated && translationMeta && (
  <div className="mt-4">
    <TranslationBanner translationMeta={translationMeta} variant="borderless" />
  </div>
)}
<Summary data={data} />
```

With a `NoteNoticeCard` (can be inline in same file or a small component):

```tsx
<NoteNoticeCard data={data} />
```

Where `NoteNoticeCard`:
```tsx
const NoteNoticeCard = ({ data }: { data: NoteWithTranslation }) => {
  const { isTranslated, translationMeta, id } = data
  return (
    <NoticeCard className="my-4">
      {isTranslated && translationMeta && (
        <NoticeCardItem>
          <TranslationNoticeContent translationMeta={translationMeta} />
        </NoticeCardItem>
      )}
      <NoticeCardItem variant="summary">
        <SummarySwitcher articleId={id!} variant="inline" />
      </NoticeCardItem>
    </NoticeCard>
  )
}
```

Extract `TranslationNoticeContent` from Task 8 into `NoticeCard.tsx` or a shared location so both post and note can import it.

**Better approach:** Put `TranslationNoticeContent` in `apps/web/src/components/modules/shared/NoticeCard.tsx` alongside NoticeCard/NoticeCardItem exports, since it's the standard translation row for the notice card.

- [ ] **Step 2: Remove unused imports**

Remove `TranslationBanner` import. The `Summary` component wrapper can be removed if no longer needed standalone.

- [ ] **Step 3: Verify no type errors**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx apps/web/src/components/modules/shared/NoticeCard.tsx
git commit -m "feat(note): integrate NoticeCard into note detail page"
```

---

### Task 10: Lint and Verify

**Files:** All modified files

- [ ] **Step 1: Run lint**

```bash
pnpm --filter @shiro/web lint
```

Fix any lint errors in modified files only.

- [ ] **Step 2: Verify dev server**

```bash
pnpm --filter @shiro/web dev
```

Check:
- Post detail page: MetaBar shows pure text · separated, NoticeCard renders (outdate if applicable + translation if applicable + AI summary), PostRelated in light cards, PostCopyright as minimal colophon
- Note detail page: NoticeCard renders (translation + summary), no visual regressions
- Dark mode: all components switch correctly

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: lint and integration fixes for post detail redesign"
```
