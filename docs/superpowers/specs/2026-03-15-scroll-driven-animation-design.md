# Home Page Scroll-Driven Animation Design

## Overview

Replace the current `useInView` trigger-once animations with CSS Scroll-Driven Animations API, making all below-fold section animations directly tied to scroll progress (scrub timeline). Hero retains mount-based entry but gains a scroll-driven parallax exit.

## Technical Foundation

- **API**: CSS Scroll-Driven Animations (`animation-timeline: view()`, `animation-range`)
- **Safari Fallback**: No animation — elements display immediately. Use `@supports (animation-timeline: view())` to gate all scroll-driven styles.
- **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` disables all animations, elements display immediately.

## Section-by-Section Specification

### 1. Hero (Mount Entry + Scroll Exit)

**Entry (unchanged)**: Mount-triggered, first-visit only. Gradient-sweep title, staggered fade-in of description/stats/social/hitokoto. Uses existing Motion library + CSS keyframes.

**Exit (new, scroll-driven)**: As user scrolls past Hero, elements dissolve via parallax at different rates:

| Element | Speed | Scroll Range | Effect |
|---------|-------|-------------|--------|
| Background lights | Slowest | `exit 0% exit 100%` | `opacity 1→0`, `translateY(0 → -10%)` |
| Title / Description | Medium | `exit 0% exit 80%` | `opacity 1→0`, `translateY(0 → -30%)` |
| Stats / Social | Medium-fast | `exit 0% exit 70%` | `opacity 1→0`, `translateY(0 → -40%)` |
| Avatar | Fastest | `exit 0% exit 60%` | `opacity 1→0`, `translateY(0 → -50%)` |

Implementation: Each element group gets its own `@keyframes` and `animation-timeline: view()` on the Hero container. The different `animation-range: exit` percentages create the parallax layering effect.

**Return visit**: Hero mount entry skipped (existing `sessionStorage` check). Scroll-driven exit always active.

### 2. SecondScreen (Pure Unfold, Long Range)

**Scroll range**: `entry 0% cover 20%` (~60-70% of viewport travel)

**Animation sequence** (mapped to scroll progress within range):

| Progress | Element | Animation |
|----------|---------|-----------|
| 0~30% | Upper half (RecentWriting) | `opacity 0→1`, `translateY(16px→0)` |
| 0~100% | Lower half (BottomSection) | `rotateX(-90deg→0)`, `opacity 0→1` (with `perspective: 800px` on parent) |
| 20~50% | Fold crease shadow | `opacity 0→1→0` |

Upper and lower animate as one synchronized "letter unfolding" — upper appears slightly faster while lower rotates open.

**Transform origin**: `top center` on lower half for hinge-like rotation.

### 3. Timeline (Right-to-Left Stagger, Medium Range)

**Scroll range**: `entry 0% entry 50%` (~40-50% of viewport travel)

**Animation sequence**:

| Progress | Element | Animation |
|----------|---------|-----------|
| 0~15% | Section title | `opacity 0→1` |
| 5~30% | Column N (newest/rightmost) | `translateX(40px→0)`, `opacity 0→1` |
| 15~40% | Column N-1 | Same |
| 25~50% | Column N-2 | Same |
| 35~60% | Column N-3 (oldest/leftmost) | Same |
| Sync | Dividers | `opacity 0→1`, synced with adjacent columns |
| 55~70% | Footer stat | `opacity 0→1` |

Columns are dynamically generated (1-4 based on data), so stagger delay must be calculated from `seasons.length`.

**Mobile**: Vertical stack, each season block uses `translateY(12px→0)` + `opacity 0→1` with stagger.

### 4. Windsock (Quick Entry, Short Range)

**Scroll range**: `entry 0% entry 30%` (~25-30% of viewport travel)

**Animation sequence**:

| Progress | Element | Animation |
|----------|---------|-----------|
| 0~40% | Greeting text | `opacity 0→1`, `translateY(12px→0)` |
| 15~55% | Invitation text | Same |
| 30~70% | Like/Subscribe buttons | Same |
| 60~100% | Subtle nav links | Same |

Short, snappy entrance. Content becomes interactive quickly.

## Overall Rhythm

```
Hero exit:     ████████████████████░░░░░░░░░░  (slow parallax dissolve)
SecondScreen:  ░░░░░░░████████████████████░░░  (long unfold)
Timeline:      ░░░░░░░░░░░░░░████████████░░░  (medium stagger)
Windsock:      ░░░░░░░░░░░░░░░░░░░░░░███████  (quick snap)
                                               → 慢 → 中 → 快 收束
```

## Return Visit Behavior

- **Hero mount entry**: First-visit only (existing `sessionStorage('hero-entered')` check)
- **All scroll-driven animations**: Always active on every visit. Scroll-driven animations are user-initiated and non-intrusive.
- Remove `isReturnVisit` checks from SecondScreen, Timeline, and Windsock scroll animations.

## CSS Architecture

All scroll-driven animations defined in `apps/web/src/styles/animation.css` using:

```css
@supports (animation-timeline: view()) {
  .hero-scroll-exit { animation-timeline: view(); }
  .ss-scroll-unfold { animation-timeline: view(); }
  .tl-scroll-slide  { animation-timeline: view(); }
  .ws-scroll-enter  { animation-timeline: view(); }
}
```

Fallback (Safari, no support): Elements display at their final state — no `initial` hidden state applied.

## Files to Modify

1. `apps/web/src/styles/animation.css` — Add all `@keyframes` and scroll-driven animation rules
2. `apps/web/src/app/[locale]/(home)/components/Hero.tsx` — Add scroll exit CSS classes, keep mount entry
3. `apps/web/src/app/[locale]/(home)/components/SecondScreen.tsx` — Replace Motion `useInView` with CSS classes
4. `apps/web/src/app/[locale]/(home)/components/HomePageTimeLine.tsx` — Replace Motion animations with CSS classes
5. `apps/web/src/app/[locale]/(home)/components/Windsock.tsx` — Replace Motion animations with CSS classes

## Dependencies to Remove (per component)

- `react-intersection-observer` (`useInView`) — no longer needed for animation triggering
- `motion/react` (`m`, `useReducedMotion`) — remove from scroll-animated elements; keep for Hero mount entry only
- Motion's `softBouncePreset` — only needed in Hero mount entry

## Constraints

- Max file size: 500 lines per file, 300 lines for React components
- CSS Scroll-Driven Animations only — no JS scroll listeners for animation
- `prefers-reduced-motion` must disable all animations
- Mobile animations: simpler transforms (no 3D perspective), same scroll-driven approach
