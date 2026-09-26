# Scroll-Driven Animation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace useInView trigger-once animations with CSS Scroll-Driven Animations API across all home page sections.

**Architecture:** CSS `animation-timeline: view()` with named view timelines on section containers, referenced by child elements via `animation-timeline: --name`. Safari fallback via `@supports` — elements display immediately without animation. Hero keeps Motion for mount entry, adds CSS scroll exit.

**Tech Stack:** CSS Scroll-Driven Animations API, `@keyframes`, CSS custom properties for dynamic stagger.

**Spec:** `docs/superpowers/specs/2026-03-15-scroll-driven-animation-design.md`

---

## Chunk 1: CSS Foundation + Hero

### Task 1: Add scroll-driven keyframes and rules to animation.css

**Files:**
- Modify: `apps/web/src/styles/animation.css`

- [ ] **Step 1: Add Hero scroll-exit keyframes**

Append after the existing `@layer components` content (inside the layer):

```css
/* ===== Scroll-Driven Animations ===== */

@supports (animation-timeline: view()) {
  /* --- Hero parallax exit --- */
  @keyframes hero-exit-bg {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-10%); }
  }
  @keyframes hero-exit-text {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-30%); }
  }
  @keyframes hero-exit-meta {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-40%); }
  }
  @keyframes hero-exit-avatar {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-50%); }
  }

  .hero-scroll-container {
    view-timeline-name: --hero-tl;
    view-timeline-axis: block;
  }
  .hero-exit-bg {
    animation: hero-exit-bg 1s linear both;
    animation-timeline: --hero-tl;
    animation-range: exit 0% exit 100%;
  }
  .hero-exit-text {
    animation: hero-exit-text 1s linear both;
    animation-timeline: --hero-tl;
    animation-range: exit 0% exit 80%;
  }
  .hero-exit-meta {
    animation: hero-exit-meta 1s linear both;
    animation-timeline: --hero-tl;
    animation-range: exit 0% exit 70%;
  }
  .hero-exit-avatar {
    animation: hero-exit-avatar 1s linear both;
    animation-timeline: --hero-tl;
    animation-range: exit 0% exit 60%;
  }
}
```

- [ ] **Step 2: Add SecondScreen scroll-unfold keyframes**

```css
@supports (animation-timeline: view()) {
  /* --- SecondScreen unfold --- */
  @keyframes ss-upper-enter {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ss-lower-unfold {
    from { opacity: 0; transform: rotateX(-90deg); }
    to   { opacity: 1; transform: rotateX(0deg); }
  }
  @keyframes ss-crease-glow {
    0%   { opacity: 0; }
    40%  { opacity: 1; }
    100% { opacity: 0; }
  }

  .ss-scroll-container {
    view-timeline-name: --ss-tl;
    view-timeline-axis: block;
  }
  .ss-scroll-upper {
    animation: ss-upper-enter 1s linear both;
    animation-timeline: --ss-tl;
    animation-range: entry 0% entry 30%;
  }
  .ss-scroll-lower {
    transform-origin: top center;
    animation: ss-lower-unfold 1s linear both;
    animation-timeline: --ss-tl;
    animation-range: entry 0% cover 20%;
  }
  .ss-scroll-crease {
    animation: ss-crease-glow 1s linear both;
    animation-timeline: --ss-tl;
    animation-range: entry 20% entry 50%;
  }

  /* Mobile: no 3D, simple fade-up */
  @media (max-width: 1023px) {
    .ss-scroll-lower {
      animation-name: ss-upper-enter;
      animation-range: entry 10% entry 40%;
    }
  }
}
```

- [ ] **Step 3: Add Timeline scroll-slide keyframes**

```css
@supports (animation-timeline: view()) {
  /* --- Timeline right-to-left stagger --- */
  @keyframes tl-title-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes tl-col-slide {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes tl-divider-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes tl-footer-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  /* Mobile: vertical fade-up */
  @keyframes tl-col-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .tl-scroll-container {
    view-timeline-name: --tl-tl;
    view-timeline-axis: block;
  }
  .tl-scroll-title {
    animation: tl-title-fade 1s linear both;
    animation-timeline: --tl-tl;
    animation-range: entry 0% entry 15%;
  }
  .tl-scroll-col {
    animation: tl-col-slide 1s linear both;
    animation-timeline: --tl-tl;
    animation-range:
      entry calc(5% + var(--col-i, 0) * 10%)
      entry calc(30% + var(--col-i, 0) * 10%);
  }
  .tl-scroll-divider {
    animation: tl-divider-fade 1s linear both;
    animation-timeline: --tl-tl;
    animation-range:
      entry calc(8% + var(--col-i, 0) * 10%)
      entry calc(25% + var(--col-i, 0) * 10%);
  }
  .tl-scroll-footer {
    animation: tl-footer-fade 1s linear both;
    animation-timeline: --tl-tl;
    animation-range: entry 55% entry 70%;
  }

  /* Mobile: override to fade-up */
  @media (max-width: 1023px) {
    .tl-scroll-col {
      animation-name: tl-col-fade-up;
      animation-range:
        entry calc(5% + var(--col-i, 0) * 8%)
        entry calc(30% + var(--col-i, 0) * 8%);
    }
  }
}
```

- [ ] **Step 4: Add Windsock scroll-enter keyframes**

```css
@supports (animation-timeline: view()) {
  /* --- Windsock quick entry --- */
  @keyframes ws-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ws-scroll-container {
    view-timeline-name: --ws-tl;
    view-timeline-axis: block;
  }
  .ws-scroll-enter {
    animation: ws-fade-up 1s linear both;
    animation-timeline: --ws-tl;
    animation-range:
      entry calc(var(--ws-i, 0) * 15%)
      entry calc(40% + var(--ws-i, 0) * 15%);
  }
}
```

- [ ] **Step 5: Add reduced-motion override**

```css
@media (prefers-reduced-motion: reduce) {
  .hero-exit-bg, .hero-exit-text, .hero-exit-meta, .hero-exit-avatar,
  .ss-scroll-upper, .ss-scroll-lower, .ss-scroll-crease,
  .tl-scroll-title, .tl-scroll-col, .tl-scroll-divider, .tl-scroll-footer,
  .ws-scroll-enter {
    animation: none !important;
  }
}
```

- [ ] **Step 6: Lint animation.css**

Run: `pnpm --filter @shiro/web lint`

---

### Task 2: Hero.tsx — Add scroll exit classes

**Files:**
- Modify: `apps/web/src/app/[locale]/(home)/components/Hero.tsx`

The Hero keeps its existing Motion-based mount entry animation. We add CSS classes for scroll-driven parallax exit.

- [ ] **Step 1: Add `hero-scroll-container` to root div**

Change the root div:
```tsx
// Before
<div className="relative mx-auto min-w-0 max-w-[1400px] px-6 lg:px-12 xl:px-16 2xl:px-24">

// After
<div className="hero-scroll-container relative mx-auto min-w-0 max-w-[1400px] px-6 lg:px-12 xl:px-16 2xl:px-24">
```

- [ ] **Step 2: Add exit classes to HeroBackground**

Wrap both light divs in a container with `hero-exit-bg`:
```tsx
const HeroBackground = ({ shouldAnimate }: { shouldAnimate: boolean }) => (
  <div className="hero-exit-bg">
    <m.div ... /> {/* existing light 1 */}
    <m.div ... /> {/* existing light 2 */}
  </div>
)
```

Note: The `hero-exit-bg` class only activates in browsers supporting scroll-driven animations (gated by `@supports`).

- [ ] **Step 3: Add exit classes to desktop layout elements**

In the desktop layout (`hidden flex-col py-16 lg:flex`):
- Title + description container (`m.div` with flex-1): add `hero-exit-text`
- Stats + Social row (`m.div` with mt-6): add `hero-exit-meta`
- Avatar (`m.div` with ml-12): add `hero-exit-avatar`
- Bottom band (recently writing + hitokoto): add `hero-exit-meta`

In the mobile layout:
- Avatar + title row: add `hero-exit-text`
- Description: add `hero-exit-text`
- Stats: add `hero-exit-meta`
- Social: add `hero-exit-meta`
- Recent writing: add `hero-exit-meta`
- Hitokoto: add `hero-exit-meta`

- [ ] **Step 4: Lint Hero.tsx**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles/animation.css apps/web/src/app/\[locale\]/\(home\)/components/Hero.tsx
git commit -m "feat(animation): add CSS scroll-driven animations foundation and Hero parallax exit"
```

---

## Chunk 2: SecondScreen + Timeline + Windsock

### Task 3: SecondScreen.tsx — Replace Motion/useInView with CSS

**Files:**
- Modify: `apps/web/src/app/[locale]/(home)/components/SecondScreen.tsx`

- [ ] **Step 1: Remove unused imports**

Remove:
- `m, useReducedMotion` from `motion/react`
- `useState, useEffect` from `react` (the `useIsDesktop` hook)
- `useInView` from `react-intersection-observer`

Keep:
- `ErrorBoundary` import

- [ ] **Step 2: Remove `useIsDesktop` hook entirely**

The desktop/mobile distinction is now handled purely via CSS media queries in animation.css.

- [ ] **Step 3: Rewrite component body**

```tsx
export const SecondScreen = () => {
  return (
    <section className="ss-scroll-container mx-auto mt-24 max-w-[1400px] px-4 lg:px-12">
      <div className="ss-scroll-upper">
        <RecentWriting />
      </div>

      <FoldCrease />

      <div className="lg:[perspective:800px]">
        <div className="ss-scroll-lower">
          <ErrorBoundary variant="inline">
            <BottomSection />
          </ErrorBoundary>
        </div>
      </div>
    </section>
  )
}
```

The `ss-scroll-crease` class goes on the FoldCrease:
```tsx
const FoldCrease = () => (
  <div className="ss-scroll-crease relative mx-[3%] my-7 hidden h-2 lg:block">
    <div className="absolute inset-x-0 top-0.5 h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent dark:via-white/[0.06]" />
    <div className="absolute inset-x-0 top-1 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/[0.03]" />
  </div>
)
```

- [ ] **Step 4: Remove `'use client'` directive if no client hooks remain**

The component no longer uses hooks. However, child components (RecentWriting, BottomSection) are client components, so SecondScreen can become a server component if it has no client-side logic. Check if this is feasible — if yes, remove `'use client'`.

Actually, `ErrorBoundary` might require client-side. Keep `'use client'` to be safe.

- [ ] **Step 5: Lint SecondScreen.tsx**

Run: `pnpm --filter @shiro/web lint`

---

### Task 4: HomePageTimeLine.tsx — Replace Motion/useInView with CSS

**Files:**
- Modify: `apps/web/src/app/[locale]/(home)/components/HomePageTimeLine.tsx`

- [ ] **Step 1: Remove unused imports**

Remove:
- `m, useReducedMotion` from `motion/react`
- `Fragment` from `react` (keep if still used for list keys)
- `useInView` from `react-intersection-observer`

- [ ] **Step 2: Remove animation state logic**

Remove these lines:
```tsx
const prefersReducedMotion = useReducedMotion()
const { ref: inViewRef, inView } = useInView({ threshold: 0.1, triggerOnce: true })
const isReturnVisit = typeof window !== 'undefined' && sessionStorage.getItem('hero-entered') === '1'
const shouldAnimate = inView && !prefersReducedMotion && !isReturnVisit
```

Also remove:
- `getDesktopDelay` function
- `ref={inViewRef}` from the section element

- [ ] **Step 3: Update section element**

```tsx
<section className="tl-scroll-container mx-auto mt-24 max-w-[1400px] px-6 lg:px-12">
```

- [ ] **Step 4: Replace desktop column animation markup**

Replace `m.div` columns with plain `div` + CSS classes + custom property:

```tsx
{/* Title */}
<div className="tl-scroll-title mb-8 text-center font-serif text-base uppercase tracking-[4px] text-neutral-5 dark:text-neutral-400">
  {t('timeline_title')}
</div>

{/* Desktop columns */}
<div className="hidden lg:flex lg:gap-0">
  {seasons.map((season, index) => {
    const reverseIndex = seasons.length - 1 - index
    return (
      <Fragment key={season.key}>
        {index > 0 && (
          <div
            className="tl-scroll-divider w-px shrink-0"
            style={{
              '--col-i': reverseIndex,
              background: 'linear-gradient(180deg, transparent, var(--color-accent-a15, rgba(51,166,184,0.15)) 30%, var(--color-accent-a15, rgba(51,166,184,0.15)) 70%, transparent)',
            } as React.CSSProperties}
          />
        )}
        <div
          className={`tl-scroll-col min-w-0 flex-1 px-4 first:pl-0 last:pr-0 ${getTextClass(index)}`}
          style={{ '--col-i': reverseIndex } as React.CSSProperties}
        >
          <SeasonColumn season={season} />
        </div>
      </Fragment>
    )
  })}
</div>
```

- [ ] **Step 5: Replace mobile column animation markup**

```tsx
{/* Mobile: vertical stack */}
<div className="flex flex-col gap-6 lg:hidden">
  {[...seasons].reverse().map((season, index) => {
    const originalIndex = seasons.length - 1 - index
    return (
      <div
        className={`tl-scroll-col border-l pl-3 ${getTextClass(originalIndex)}`}
        key={season.key}
        style={{
          '--col-i': index,
          borderColor: `color-mix(in oklch, var(--color-accent, #33a6b8) ${15 + originalIndex * 5}%, transparent)`,
        } as React.CSSProperties}
      >
        <SeasonColumn season={season} />
      </div>
    )
  })}
</div>
```

- [ ] **Step 6: Replace footer animation**

```tsx
<div className="tl-scroll-footer mt-4 border-t border-[rgba(0,0,0,0.04)] pt-3 text-right font-serif text-base italic text-neutral-5 dark:border-neutral-800 dark:text-neutral-400">
  {t('timeline_year_total', { count: totalCount })}
</div>
```

- [ ] **Step 7: Remove `'use client'` if possible**

Component still uses `useQuery`, `useTranslations`, `useLocale`, `useMemo` — must remain client component.

- [ ] **Step 8: Lint HomePageTimeLine.tsx**

Run: `pnpm --filter @shiro/web lint`

---

### Task 5: Windsock.tsx — Replace Motion/useInView with CSS

**Files:**
- Modify: `apps/web/src/app/[locale]/(home)/components/Windsock.tsx`

- [ ] **Step 1: Remove unused imports**

Remove:
- `m, useReducedMotion` from `motion/react`
- `useInView` from `react-intersection-observer`

- [ ] **Step 2: Remove animation state logic**

Remove:
```tsx
const prefersReducedMotion = useReducedMotion()
const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
const isReturnVisit = typeof window !== 'undefined' && sessionStorage.getItem('hero-entered') === '1'
const skipAnimation = prefersReducedMotion || isReturnVisit
const shouldAnimate = inView && !skipAnimation
const makeAnim = (delay: number) => ({ ... })
```

- [ ] **Step 3: Update section and child elements**

```tsx
<section className="ws-scroll-container mx-auto mt-24 max-w-[1400px] px-6 pb-16 lg:px-12">
  {/* Greeting */}
  <div
    className="ws-scroll-enter text-center font-serif text-lg tracking-[2px] text-neutral-7 lg:text-xl"
    style={{ '--ws-i': 0 } as React.CSSProperties}
  >
    {t(greetingKey)}
  </div>
  <div
    className="ws-scroll-enter mb-10 text-center font-serif text-lg tracking-[2px] text-neutral-7 lg:mb-12 lg:text-xl"
    style={{ '--ws-i': 1 } as React.CSSProperties}
  >
    {t('ending_invitation')}
  </div>

  {/* Interaction */}
  <div
    className="ws-scroll-enter mb-12 flex items-center justify-center gap-8 lg:mb-14"
    style={{ '--ws-i': 2 } as React.CSSProperties}
  >
    {/* ... buttons unchanged ... */}
  </div>

  {/* Subtle nav */}
  <div
    className="ws-scroll-enter flex items-center justify-center gap-0 font-serif text-[11px] text-neutral-7/80 hover:text-neutral-7"
    style={{ '--ws-i': 3 } as React.CSSProperties}
  >
    {/* ... nav links unchanged ... */}
  </div>
</section>
```

Remove `ref={ref}` from section, remove all `{...makeAnim(N)}` spread props, replace `m.div` with `div`.

- [ ] **Step 4: Lint Windsock.tsx**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\[locale\]/\(home\)/components/SecondScreen.tsx \
       apps/web/src/app/\[locale\]/\(home\)/components/HomePageTimeLine.tsx \
       apps/web/src/app/\[locale\]/\(home\)/components/Windsock.tsx
git commit -m "feat(animation): replace Motion/useInView with CSS scroll-driven animations in SecondScreen, Timeline, Windsock"
```

---

### Task 6: Visual Verification

- [ ] **Step 1: Run dev server**

Run: `pnpm --filter @shiro/web dev`

- [ ] **Step 2: Verify in Chrome (supports scroll-driven animations)**

Open `http://localhost:2323` and check:
1. Hero mount entry animation plays on first visit
2. Scrolling past Hero: elements dissolve at different rates (parallax)
3. SecondScreen: unfolds as section scrolls into view
4. Timeline: columns slide in right-to-left with stagger
5. Windsock: quick staggered fade-up
6. Scroll back up: animations reverse (scrub behavior)
7. Return visit (refresh): Hero mount entry skips, all scroll animations still work

- [ ] **Step 3: Verify Safari fallback**

Open in Safari: all sections display immediately, no hidden elements, no broken layout.

- [ ] **Step 4: Verify reduced motion**

In Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. All animations should be disabled.
