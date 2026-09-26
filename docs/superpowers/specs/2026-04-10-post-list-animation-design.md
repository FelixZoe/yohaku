# Post List Page Entrance Animation

## Overview

Add staggered entrance animation to the Post List page (`/posts`). Currently the only page-level list without motion animations.

## Animation Parameters

| Parameter | Value |
|-----------|-------|
| Y offset | 8px |
| Duration | 400ms (0.4s) |
| Stagger | 60ms per element |
| Scale | None |
| Easing | `softSpringPreset` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) |
| Initial state | `{ opacity: 0, y: 8 }` |
| Final state | `{ opacity: 1, y: 0 }` |

## Element Entrance Order

Each element enters sequentially with 60ms stagger:

| Index | Element | Delay |
|-------|---------|-------|
| 0 | Page header (Blog label + title) | 0ms |
| 1 | Featured Card (if pinned post exists) | 60ms |
| 2 | Sort Bar + Mobile Actions | 120ms |
| 3+ | Post items (each) | 180ms, 240ms, 300ms... |
| last | Pagination | after last post item |

When no featured post exists, indices shift down accordingly.

## Behavior Rules

- **First load only**: Animation plays on initial page load. No replay on pagination or sort changes.
- **LCP optimization**: Enable `lcpOptimization` flag. Before hydration completes, elements render at final state (no animation), preventing LCP regression.

## Technical Approach

### New Transition View

Create a minimal transition view using `createTransitionView` from `~/components/ui/transition/factor.tsx`:

```typescript
// BottomToUpTransitionView — no scale, pure y + opacity
export const BottomToUpTransitionView = createTransitionView({
  from: { opacity: 0.001, y: 8 },
  to: { opacity: 1, y: 0 },
  preset: softSpringPreset,
})
```

This differs from existing `BottomToUpSoftScaleTransitionView` by omitting the `scale` transform.

### Page Integration

In `apps/web/src/app/[locale]/posts/page.tsx`, wrap each section with the transition view:

```tsx
let animIndex = 0

<BottomToUpTransitionView lcpOptimization delay={animIndex++ * 60}>
  {/* Page header */}
</BottomToUpTransitionView>

{featuredPost && (
  <BottomToUpTransitionView lcpOptimization delay={animIndex++ * 60}>
    <PostFeaturedCard data={featuredPost} />
  </BottomToUpTransitionView>
)}

<BottomToUpTransitionView lcpOptimization delay={animIndex++ * 60}>
  <PostSortBar ... />
  <PostListMobileActions />
</BottomToUpTransitionView>

{listItems.map((item) => (
  <BottomToUpTransitionView lcpOptimization delay={animIndex++ * 60} key={item.id}>
    <PostListItem data={item} />
  </BottomToUpTransitionView>
))}

<BottomToUpTransitionView lcpOptimization delay={animIndex++ * 60}>
  <PostPagination ... />
</BottomToUpTransitionView>
```

### Files to Modify

1. **`apps/web/src/components/ui/transition/BottomToUpTransitionView.tsx`** (new) — Create the transition view component
2. **`apps/web/src/components/ui/transition/index.ts`** — Export the new component
3. **`apps/web/src/app/[locale]/posts/page.tsx`** — Wrap elements with transition view

## Consistency

This approach is consistent with:
- `NoteListTimeline.tsx` — uses `BottomToUpSoftScaleTransitionView` with per-item stagger
- `ActivityPostList.tsx` — uses motion entrance animations
- Global `MotionConfig` default transition: `Spring.presets.smooth`
