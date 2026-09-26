# Motion

> Authoritative for animation in `apps/web`. Hierarchy: **mount entry → scroll-driven → idle breathing**, all subordinate to `prefers-reduced-motion`.

## Spring presets — never inline transition objects

Source: `apps/web/src/constants/spring.ts`.

```ts
microReboundPreset   // {type:'spring', stiffness:300, damping:20}     — quick UI snap
softSpringPreset     // {duration:0.35, stiffness:120, damping:20}     — content reveal
softBouncePreset     // {type:'spring', damping:10, stiffness:100}     — playful float
MODAL_EASING         // [0.22, 1, 0.36, 1]                            — cubic-bezier overshoot
```

```tsx
import { m } from 'motion/react'
import { softSpringPreset } from '~/constants/spring'

<m.div
  initial={{ opacity: 0.001, y: 8 }}   // 0.001, never exact 0 — keeps GPU layer
  animate={{ opacity: 1, y: 0 }}
  transition={softSpringPreset}
/>
```

**Inline objects are a code-review smell.** If a preset doesn't fit, propose adding one.

## Transition factory

Source: `apps/web/src/components/ui/transition/factor.tsx`.

`createTransitionView(options)` produces a memoized component with preset enter/exit:

| View | Use |
|---|---|
| `BottomToUpTransitionView` | Single section reveal |
| `BottomToUpSoftSpringTransitionView` | List items, stagger-friendly |
| `BottomToUpSoftScaleTransitionView` | Heavy content (comments, hero) |
| `FadeInOutView` | Toggleable opacity |
| `ScaleTransitionView` | Pop-in dialogs, FABs |

All accept `delay` (ms) and `lcpOptimization` (boolean — skip first frame to preserve LCP).

## Stagger pattern

Index-driven delay, 60 ms cadence:

```tsx
let animIndex = 0
posts.map((post) => (
  <BottomToUpSoftSpringTransitionView key={post.id} delay={animIndex++ * 60} lcpOptimization>
    <PostListItem post={post} />
  </BottomToUpSoftSpringTransitionView>
))
```

Heavier content uses `45 ms`; section transitions can fire at fixed checkpoints (`200 / 500 / 1000 ms`).

## Modal choreography

Reference: `apps/web/src/components/ui/modal/stacked/`. Don't roll your own modal entrance.

| Phase | Values |
|---|---|
| Enter | `scaleY: 0.8 → 1, opacity: 0 → 1`, 300 ms, MODAL_EASING |
| Stack modulation | non-top: `scale: 0.93, filter: brightness(0.5)` |
| Exit | `scale → 0.8`, 200 ms |
| Mobile | auto-switches to `<Sheet>` drawer |

Drag-to-dismiss: pass `dragControls` from Motion's `useDragControls`.

## Shared-element layout transitions

`layout / layoutId` for cross-view continuity. Existing IDs: `header`, `note-{id}`, `post-{id}`. Don't collide.

```tsx
// In list
<m.div layoutId={`note-${note.id}`}><NoteTimelineItem note={note} /></m.div>
// In detail
<m.h1 layoutId={`note-${note.id}`}>{note.title}</m.h1>
```

## CSS scroll-driven animations

Hero parallax, SecondScreen unfold, Timeline reveal, Windsock snap use **CSS** `animation-timeline: view()` — not JS. Source: `apps/web/src/styles/animation.css`.

```css
@supports (animation-timeline: view()) {
  .timeline-item {
    animation: ts-fade-up 0.6s both;
    animation-timeline: view();
    animation-range: entry 10% cover 25%;
  }
}
```

Safari fallback: outside `@supports` — show immediately, no animation.

| Class | Driven by | Effect |
|---|---|---|
| `.hero-exit-*` | view-timeline | Different rates fade out on scroll |
| `.ss-enter-*` | mount delay | SecondScreen sequential unfold |
| `.ts-fade-up` | view-timeline | Timeline staggered entry |
| `.ws-fade-up` | view-crossing | Windsock quick reveal |

Add new effects in `animation.css`, gate behind `@supports`, respect reduced-motion.

## Idle breathing

Desktop-only, CSS keyframes. Amplitude ±2-3 px, period 12-18 s. **Never on mobile.** No JS drivers.

```css
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
  .breathe { animation: breathe 14s ease-in-out infinite; }
}
```

## Mount-entry policy (first visit only)

Hero anchors the first-visit sequence. Return visitors skip via `sessionStorage('hero-entered')`. SecondScreen continues at ~0.95 s delay.

```ts
const seen = sessionStorage.getItem('hero-entered')
if (seen) skipAnimation()
else sessionStorage.setItem('hero-entered', '1')
```

## Reduced motion + mobile constraints

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Global — **don't override it.** Mobile: drop 3D perspective. No `rotateX`. Translate + opacity only.

## Yohaku state-machine animations

`apps/web/src/styles/yohaku.css` drives layout reflow off body data attributes — not JS class flags. See [theming.md](./theming.md) for the variable contract.

When you need to coordinate animation state across components, write a CSS variable on `body` rather than threading props through React.

## Flash highlights

Footnote anchors, search results, "scroll to comment" use `flashRange()` from `apps/web/src/components/modules/yohaku/flash.ts`:

```ts
import { flashRange } from '~/components/modules/yohaku/flash'
const range = document.createRange()
range.selectNode(targetEl)
flashRange(range, 1200)
```

Uses CSS Custom Highlight API — no DOM mutation. Color: `color-mix(srgb, var(--color-accent) 38%, transparent)`. Falls back silently when unsupported.

## Hydration safety

Server-rendered components mounting motion immediately can flash. Use `HydrationEndDetector` (set on `<html>`) and the `lcpOptimization` flag to defer the first frame.

## Anti-patterns

- ❌ Inline transition objects → ✅ Spring preset
- ❌ Animating exact `opacity: 0` → ✅ `0.001` (preserves GPU layer)
- ❌ JS-driven scroll listeners for parallax → ✅ CSS `animation-timeline: view()`
- ❌ 3D rotateX on mobile → ✅ translateY + opacity only
- ❌ Reinventing modal entrance → ✅ `<Modal>` from `ui/modal/stacked`
- ❌ Stagger > 100 ms cadence → ✅ 45-60 ms
- ❌ `layoutId` collisions → ✅ namespace by domain
- ❌ Forgetting `prefers-reduced-motion` guard

## Source files

- `apps/web/src/constants/spring.ts` — all presets
- `apps/web/src/components/ui/transition/factor.tsx` — factory
- `apps/web/src/components/ui/modal/stacked/` — modal reference
- `apps/web/src/styles/animation.css` — scroll-driven keyframes
- `apps/web/src/styles/yohaku.css` — state-machine animations
- `apps/web/src/components/modules/yohaku/flash.ts` — highlight API
