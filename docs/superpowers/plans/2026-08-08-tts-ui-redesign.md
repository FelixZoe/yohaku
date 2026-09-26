# TTS Narration UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TTS top-of-article bar with a desktop floating pill (reveal-on-scroll-in, minimal transport, yield-on-scroll auto-follow) and a mobile capsule "narrating" state (ticket + `tts` panel + dot), sharing one playback engine and one narration atom.

**Architecture:** A new `ttsNarrationAtom` (Jotai) is the single source of truth for narration status/progress, written by `TtsArticleProvider`/`useTtsPlayback` and read by both surfaces. Desktop renders a new `TtsFloatingPlayer` (portal, fixed bottom-right, `!isMobile`). Mobile extends the existing `CapsuleHeader` state machine with a narrating branch that reuses the Live Desk ticket/panel/dot machinery. The gapless playback engine is extended (not rewritten) with `currentTime`/`duration`/`reset`.

**Tech Stack:** Next.js App Router · React 19 · TypeScript · Jotai (`atom`, `jotaiStore`) · motion/react · tailwind-variants · next-intl · Vitest (pure-logic tests) · `@yohaku/design-system` tokens.

**Spec:** `docs/superpowers/specs/2026-08-08-tts-ui-redesign-design.md`

## Global Constraints

- Accent (`--color-accent`) appears ONLY on the active play/pause node; everything else neutral. ≤ 5% surface coverage.
- Neutral classes use the design-system scale (`text-neutral-7` etc.), never Tailwind's `neutral-50…950`. No `dark:` on neutral text.
- Depth: `ring-1 ring-border` + whisper shadow `shadow-[0_4px_24px_rgba(0,0,0,0.05)]`; glass via `.uk-material-default`. No `shadow-lg/xl/2xl`, no `rounded-3xl`, no ad-hoc `backdrop-blur` on the pill (use `.uk-material-default`).
- Motion presets from `~/constants/spring`: `microReboundPreset`, `softSpringPreset`. Respect `prefers-reduced-motion`.
- Class composition via `clsxm` (`~/lib/helper`); variants via `tailwind-variants` where a variant system is warranted.
- Zero comments / zero JSDoc in business code (per `CLAUDE.md`).
- New i18n keys land in ALL FIVE locales: `en`, `zh`, `zh-TW`, `ja`, `ko` (`apps/web/src/messages/<locale>/tts.json`). Run `messages/message-usage.test.ts` after adding keys.
- Scoped lint/typecheck only: `pnpm --filter @yohaku/web lint` (changed files). Do NOT run project-wide or build.
- Commit per task; no AI co-authorship; never commit automatically beyond these per-task commits.

---

## File Structure

**Created:**
- `apps/web/src/atoms/tts.ts` — `ttsNarrationAtom` + derived selectors + setter. Single cross-surface source of truth.
- `apps/web/src/lib/tts-format.ts` — `formatDuration(sec)` mm:ss helper (+ test).
- `apps/web/src/components/modules/tts/auto-follow.ts` — pure auto-follow state machine (+ test).
- `apps/web/src/components/modules/tts/TtsFloatingPlayer.tsx` — desktop circle↔pill surface.
- `apps/web/src/components/layout/header/internal/CapsuleNarratingTicketRow.tsx` — mobile narrating ticket row.
- `apps/web/src/components/layout/header/internal/CapsuleTtsPanel.tsx` — mobile `tts` panel body.
- `apps/web/src/components/modules/tts/auto-follow.test.ts`, `apps/web/src/lib/tts-format.test.ts`.

**Modified:**
- `apps/web/src/components/modules/tts/use-tts-playback.ts` — add `currentTime`/`duration`/`reset`.
- `apps/web/src/components/modules/tts/tts-playback-context.tsx` — surface new fields.
- `apps/web/src/components/modules/tts/TtsArticleProvider.tsx` — remove top bar; sync atom; mount `TtsFloatingPlayer` (desktop).
- `apps/web/src/components/modules/tts/TtsHighlightBar.tsx` — yield-on-scroll auto-follow + recenter.
- `apps/web/src/components/layout/header/internal/mobile-capsule.ts` — `isNarrating` input + `'tts'` overlay/panel + precedence.
- `apps/web/src/components/layout/header/internal/MobileHeader.tsx` — render narrating ticket/panel, primary-tap branch, dot pulse.
- `apps/web/src/components/layout/header/internal/MobileDrawerContent.tsx` — "朗读" menu entry.
- `apps/web/src/messages/{en,zh,zh-TW,ja,ko}/tts.json` — new keys.

---

## Task 1: `ttsNarrationAtom` + shared types

**Files:**
- Create: `apps/web/src/atoms/tts.ts`

**Interfaces:**
- Produces: `TtsNarrationState` type; `ttsNarrationAtom` (writable); `narratingElapsedLabelAtom` (derived `string`); `narratingStatusAtom` (derived); `setTtsNarration(partial)` helper using `jotaiStore`.

- [ ] **Step 1: Create the atom file**

```ts
// apps/web/src/atoms/tts.ts
import { atom } from 'jotai'

import { jotaiStore } from '~/lib/store'

export type TtsNarrationStatus = 'idle' | 'loading' | 'playing' | 'paused'

export interface TtsNarrationState {
  available: boolean
  stale: boolean
  status: TtsNarrationStatus
  current: number
  total: number
  elapsed: number
  duration: number
  playbackRate: number
  autoFollow: boolean
}

export const disabledTtsNarrationState: TtsNarrationState = {
  available: false,
  stale: false,
  status: 'idle',
  current: 0,
  total: 0,
  elapsed: 0,
  duration: 0,
  playbackRate: 1,
  autoFollow: true,
}

export const ttsNarrationAtom = atom<TtsNarrationState>(disabledTtsNarrationState)

export const narratingStatusAtom = atom((get) => get(ttsNarrationAtom).status)
export const isNarratingAtom = atom(
  (get) => get(ttsNarrationAtom).status === 'playing' || get(ttsNarrationAtom).status === 'paused',
)
export const narratingElapsedLabelAtom = atom((get) => {
  const s = get(ttsNarrationAtom)
  if (s.status === 'idle' || s.status === 'loading') return ''
  return formatDuration(s.elapsed)
})

export const setTtsNarration = (partial: Partial<TtsNarrationState>) =>
  jotaiStore.set(ttsNarrationAtom, (prev) => ({ ...prev, ...partial }))

// imported below to avoid cycle; see Task 2 for the real export site
import { formatDuration } from '~/lib/tts-format'
```

> Place the `formatDuration` import at the top in the real file; it is shown last here only because Task 2 creates it. After Task 2 lands, the import resolves.

- [ ] **Step 2: Verify `jotaiStore` export path**

Run: `grep -rn "export.*jotaiStore" apps/web/src/lib/store.ts` (use the `grep` tool)
Expected: a `jotaiStore` export exists (it is already used by `atoms/activity.ts`, `atoms/socket.ts`). If the path differs, adjust the import to match (`~/lib/store`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/atoms/tts.ts
git commit -m "feat(tts): add ttsNarrationAtom source of truth"
```

---

## Task 2: `formatDuration` helper + tests

**Files:**
- Create: `apps/web/src/lib/tts-format.ts`, `apps/web/src/lib/tts-format.test.ts`

**Interfaces:**
- Produces: `formatDuration(seconds: number): string` → `m:ss` (e.g. `0:00`, `2:14`, `65:03`); clamps negatives to `0:00`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/tts-format.test.ts
import { describe, expect, it } from 'vitest'

import { formatDuration } from './tts-format'

describe('formatDuration', () => {
  it('formats zero', () => expect(formatDuration(0)).toBe('0:00'))
  it('formats seconds under a minute', () => expect(formatDuration(14)).toBe('0:14'))
  it('formats minutes:seconds', () => expect(formatDuration(134)).toBe('2:14'))
  it('pads single-digit seconds', () => expect(formatDuration(65)).toBe('1:05'))
  it('handles minutes >= 10', () => expect(formatDuration(3903)).toBe('65:03'))
  it('clamps negatives to zero', () => expect(formatDuration(-5)).toBe('0:00'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @yohaku/web exec vitest run src/lib/tts-format.test.ts`
Expected: FAIL — module `./tts-format` not found.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/tts-format.ts
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @yohaku/web exec vitest run src/lib/tts-format.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/tts-format.ts apps/web/src/lib/tts-format.test.ts
git commit -m "feat(tts): add formatDuration helper"
```

---

## Task 3: Extend `use-tts-playback` (time tracking + reset)

**Files:**
- Modify: `apps/web/src/components/modules/tts/use-tts-playback.ts`

**Interfaces:**
- Consumes: existing `playFrom`, `stop`, `audioRef`.
- Produces: `TtsPlayback` gains `currentTime: number`, `duration: number`, `reset: () => void`.

- [ ] **Step 1: Extend the interface**

In `use-tts-playback.ts`, update the `TtsPlayback` interface (currently lines 3–11) to add the three fields:

```ts
export interface TtsPlayback {
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
  playingIndex: null | number
  reset: () => void
  setPlaybackRate: (rate: number) => void
  stop: () => void
  toggleSegment: (index: number) => void
  playAll: () => void
}
```

- [ ] **Step 2: Add state + listeners**

Add the two state hooks alongside the existing `useState` block (near line 20–22):

```ts
const [currentTime, setCurrentTime] = useState(0)
const [duration, setDuration] = useState(0)
```

Inside the `playFrom` `Audio()` creation block (where `addEventListener('play'…)`, `'pause'`, `'ended'`, `'error'` are registered, currently lines 54–68), append two listeners before `audioRef.current = audio`:

```ts
audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
audio.addEventListener('loadedmetadata', () => {
  setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
  setCurrentTime(0)
})
```

Also reset elapsed on each segment swap: in `playFrom`, right after `setCurrentIndex(index)` (line 72) and `audio.src = url`, add:

```ts
setCurrentTime(0)
setDuration(0)
```

- [ ] **Step 3: Add `reset`**

Add next to `stop` (after line 41):

```ts
const reset = useCallback(() => {
  const audio = audioRef.current
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
  setCurrentIndex(null)
  setCurrentTime(0)
  setDuration(0)
}, [setCurrentIndex])
```

- [ ] **Step 4: Return the new fields**

Update the return object (lines 141–149) to include `currentTime`, `duration`, `reset`.

- [ ] **Step 5: Typecheck changed files**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS (no type errors in `use-tts-playback.ts`). If `TtsPlayback` consumers complain about missing fields, that is expected and resolved by Task 4 — but the interface change is non-breaking (added fields only).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/modules/tts/use-tts-playback.ts
git commit -m "feat(tts): expose currentTime/duration/reset from playback hook"
```

---

## Task 4: Sync playback → `ttsNarrationAtom` in the provider

**Files:**
- Modify: `apps/web/src/components/modules/tts/TtsArticleProvider.tsx`

**Interfaces:**
- Consumes: `ttsNarrationAtom`, `setTtsNarration` (Task 1); `playback.currentTime/duration/reset` (Task 3).
- Produces: the atom is kept in sync with playback + meta while the article is mounted; reset to disabled on unmount.

- [ ] **Step 1: Derive status + totals**

Inside `TtsArticleProvider`, after `playback` is constructed (after line 48) and `segments`/`available`/`isStale` exist, compute:

```ts
const status: TtsNarrationStatus = !available
  ? 'idle'
  : activated && ttsQuery.isLoading
    ? 'loading'
    : playback.playingIndex === null
      ? 'idle'
      : playback.isPlaying
        ? 'playing'
        : 'paused'
```

Import `TtsNarrationStatus`, `setTtsNarration`, `disabledTtsNarrationState` from `~/atoms/tts`.

- [ ] **Step 2: Sync effect**

Add:

```ts
useEffect(() => {
  setTtsNarration({
    available,
    stale: isStale ?? false,
    status,
    current: playback.playingIndex === null ? 0 : playback.playingIndex + 1,
    total: segments.length,
    elapsed: playback.currentTime,
    duration: playback.duration,
    playbackRate: playbackRateEcho,
    autoFollow: autoFollowEcho,
  })
}, [available, isStale, status, playback.playingIndex, playback.currentTime, playback.duration, segments.length, playbackRateEcho, autoFollowEcho])
```

Where `playbackRateEcho = playback.playbackRate` and `autoFollowEcho` is read from the atom via `useAtomValue(ttsNarrationAtom).autoFollow` (the provider must not clobber `autoFollow`, which the highlight bar / player own). Read it before writing:

```ts
const autoFollowEcho = useAtomValue(ttsNarrationAtom).autoFollow
```

- [ ] **Step 3: Reset on unmount**

```ts
useEffect(() => {
  return () => setTtsNarration(disabledTtsNarrationState)
}, [])
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/modules/tts/TtsArticleProvider.tsx
git commit -m "feat(tts): sync playback state to ttsNarrationAtom"
```

---

## Task 5: Remove the top-of-article bar

**Files:**
- Modify: `apps/web/src/components/modules/tts/TtsArticleProvider.tsx`

**Interfaces:** none new. The legacy bar markup (`<div className="mt-4 flex items-center gap-2 …">…</div>`, currently lines 151–217) is deleted. `TtsFloatingPlayer` is mounted here in Task 8.

- [ ] **Step 1: Delete the bar block**

Remove the entire `<div className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-6/[0.04] px-[18px] py-3"> … </div>` JSX (the play button, label, stale span, speed button, segment span, stop button). Keep `<TtsHighlightBar …/>` above it and `{children}` below.

- [ ] **Step 2: Remove now-unused imports/handlers**

Remove `handlePlay`, `handleToggle`, `isLoading`, `hasSegments` locals if they become unused after deletion (they are re-implemented by `TtsFloatingPlayer`). Keep `playback`, `segments`, `isCurrentBlock`, `playBlock`, `ctxValue`, `gutterCtxValue`. Run lint to confirm dead-code removal.

- [ ] **Step 3: Typecheck + smoke**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS. At this point there is no play affordance yet (Task 8 adds the desktop one, Task 12 the mobile one) — that is acceptable mid-plan.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/modules/tts/TtsArticleProvider.tsx
git commit -m "refactor(tts): remove legacy top-of-article narration bar"
```

---

## Task 6: Auto-follow state machine (pure) + tests

**Files:**
- Create: `apps/web/src/components/modules/tts/auto-follow.ts`, `auto-follow.test.ts`

**Interfaces:**
- Produces: `type AutoFollowAction = { type: 'manual-scroll' } | { type: 'recenter' } | { type: 'segment-change' } | { type: 'reset' }`; `autoFollowReducer(state: boolean, action: AutoFollowAction): boolean`. Pure. `manual-scroll` → `false`; `recenter` → `true`; `segment-change`/`reset` → unchanged (the *effect* of auto-follow on scrolling lives in the bar, not the reducer).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/components/modules/tts/auto-follow.test.ts
import { describe, expect, it } from 'vitest'

import { autoFollowReducer } from './auto-follow'

describe('autoFollowReducer', () => {
  it('defaults to following', () => {
    expect(autoFollowReducer(true, { type: 'segment-change' })).toBe(true)
  })
  it('yields on manual scroll', () => {
    expect(autoFollowReducer(true, { type: 'manual-scroll' })).toBe(false)
  })
  it('re-enables on recenter', () => {
    expect(autoFollowReducer(false, { type: 'recenter' })).toBe(true)
  })
  it('stays yielded across segment changes after a manual scroll', () => {
    const a = autoFollowReducer(true, { type: 'manual-scroll' })
    const b = autoFollowReducer(a, { type: 'segment-change' })
    expect(b).toBe(false)
  })
  it('reset returns to following', () => {
    expect(autoFollowReducer(false, { type: 'reset' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @yohaku/web exec vitest run src/components/modules/tts/auto-follow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/components/modules/tts/auto-follow.ts
export type AutoFollowAction =
  | { type: 'manual-scroll' }
  | { type: 'recenter' }
  | { type: 'segment-change' }
  | { type: 'reset' }

export function autoFollowReducer(state: boolean, action: AutoFollowAction): boolean {
  switch (action.type) {
    case 'manual-scroll':
      return false
    case 'recenter':
      return true
    case 'reset':
      return true
    case 'segment-change':
      return state
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @yohaku/web exec vitest run src/components/modules/tts/auto-follow.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/modules/tts/auto-follow.ts apps/web/src/components/modules/tts/auto-follow.test.ts
git commit -m "feat(tts): add auto-follow reducer"
```

---

## Task 7: `TtsHighlightBar` yield-on-scroll + recenter

**Files:**
- Modify: `apps/web/src/components/modules/tts/TtsHighlightBar.tsx`

**Interfaces:**
- Consumes: `ttsNarrationAtom` (`autoFollow`), `setTtsNarration`, `autoFollowReducer`.
- Produces: highlight always draws; programmatic `scrollIntoView` runs only when `autoFollow === true`; a manual-scroll guard ref prevents the bar's own smooth-scroll from being misread as manual. Recenter (set by the player in Task 8) flips `autoFollow` true and re-syncs.

- [ ] **Step 1: Read autoFollow from the atom**

Add `import { useAtomValue } from 'jotao'` (use `jotai`). In the component:

```ts
const autoFollow = useAtomValue(ttsNarrationAtom).autoFollow
```

Import `ttsNarrationAtom`, `setTtsNarration` from `~/atoms/tts`.

- [ ] **Step 2: Add a programmatic-scroll guard ref**

```ts
const programmaticRef = useRef(false)
```

- [ ] **Step 3: Gate the scroll, keep the highlight**

In the `playingIndex` effect (currently lines 33–68), the highlight positioning (`animate(barEl, { top, height, opacity: 1 }, …)`) stays unconditional. The `child.scrollIntoView({ block: 'center', behavior: 'smooth' })` call (line 67) becomes:

```ts
if (autoFollow) {
  programmaticRef.current = true
  child.scrollIntoView({
    block: 'center',
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
  window.setTimeout(() => {
    programmaticRef.current = false
  }, 450)
}
```

Add a `reduceMotion` read: `const reduceMotion = usePrefersReducedMotion()` — confirm the hook exists by `grep` for `usePrefersReducedMotion` (it is used in `MobileHeader.tsx`). Import from the same path.

Add `autoFollow` to the effect dependency array.

- [ ] **Step 4: Detect manual scroll**

Add an effect that sets `autoFollow=false` on real user scroll:

```ts
useEffect(() => {
  const onScroll = () => {
    if (programmaticRef.current) return
    setTtsNarration({ autoFollow: false })
  }
  window.addEventListener('wheel', onScroll, { passive: true })
  window.addEventListener('touchmove', onScroll, { passive: true })
  window.addEventListener('keydown', onScroll)
  return () => {
    window.removeEventListener('wheel', onScroll)
    window.removeEventListener('touchmove', onScroll)
    window.removeEventListener('keydown', onScroll)
  }
}, [])
```

- [ ] **Step 5: Re-sync on recenter**

Add an effect that, when `autoFollow` flips back to `true` while a segment is active, re-runs the scroll for the current block:

```ts
useEffect(() => {
  if (!autoFollow || playingIndex === null) return
  const richEl = contentEl?.querySelector('.rich-content') as HTMLElement | null
  if (!richEl) return
  const segment = segments[playingIndex]
  if (!segment) return
  const blockIdx = blockInfosRef.current.findIndex((b) => b.blockId === segment.blockId)
  if (blockIdx === -1) return
  const child = richEl.children[blockIdx] as HTMLElement | undefined
  if (!child) return
  programmaticRef.current = true
  child.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
  window.setTimeout(() => {
    programmaticRef.current = false
  }, 450)
}, [autoFollow])
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/modules/tts/TtsHighlightBar.tsx
git commit -m "feat(tts): yield auto-follow on manual scroll + recenter"
```

---

## Task 8: `TtsFloatingPlayer` (desktop)

**Files:**
- Create: `apps/web/src/components/modules/tts/TtsFloatingPlayer.tsx`
- Modify: `apps/web/src/components/modules/tts/TtsArticleProvider.tsx` (mount it)

**Interfaces:**
- Consumes: `useTtsPlaybackContext()` (segments, playback, activated, isCurrentBlock, playBlock) — re-uses the context the provider already builds; plus `ttsNarrationAtom` (autoFollow for Recenter); `useIsMobile()`; `RootPortal`; `formatDuration`.
- Produces: the desktop surface. Renders nothing when `isMobile`.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/modules/tts/TtsFloatingPlayer.tsx
'use client'

import { useAtomValue } from 'jotai'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { ttsNarrationAtom, setTtsNarration } from '~/atoms/tts'
import { RootPortal } from '~/components/ui/portal'
import { useMainMarkdownElement } from '~/atoms/hooks/reading'
import { clsxm } from '~/lib/helper'
import { formatDuration } from '~/lib/tts-format'
import { microReboundPreset, softSpringPreset } from '~/constants/spring'

import { useTtsPlaybackContext } from './tts-playback-context'

export function TtsFloatingPlayer() {
  const isMobile = useIsMobile()
  const contentEl = useMainMarkdownElement()
  const ctx = useTtsPlaybackContext()
  const { autoFollow } = useAtomValue(ttsNarrationAtom)
  const [inView, setInView] = useState(false)

  const available = useAtomValue(ttsNarrationAtom).available
  const stale = useAtomValue(ttsNarrationAtom).stale

  useEffect(() => {
    if (isMobile || !contentEl) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    )
    io.observe(contentEl)
    return () => io.disconnect()
  }, [isMobile, contentEl])

  if (isMobile || !available) return null

  const status = useAtomValue(ttsNarrationAtom).status
  const expanded = status === 'playing' || status === 'paused' || status === 'loading'
  const show = expanded || inView

  return (
    <RootPortal>
      <AnimatePresence>
        {show && (
          <FloatingPlayer
            expanded={expanded}
            loading={status === 'loading'}
            playing={status === 'playing'}
            stale={stale}
            autoFollow={autoFollow}
            onToggle={ctx!.playback.toggleSegment}
            onPlayAll={ctx!.playback.playAll}
            onRate={() => {
              const rates = [1, 1.25, 1.5, 1.75, 2]
              const cur = useAtomValue.length // placeholder removed below
              void cur
            }}
            onClose={() => {
              ctx!.playback.reset()
              setTtsNarration({ autoFollow: true })
            }}
            onRecenter={() => setTtsNarration({ autoFollow: true })}
          />
        )}
      </AnimatePresence>
    </RootPortal>
  )
}
```

> The `onRate` body above is a deliberate stub to be replaced in Step 2 — do NOT leave it. The real component reads rate + segment from the atom, not from `useAtomValue.length`.

- [ ] **Step 2: Fill the component body correctly**

Replace the entire `TtsFloatingPlayer` return + the `onRate` stub with this corrected version that pulls live values from the atom:

```tsx
export function TtsFloatingPlayer() {
  const isMobile = useIsMobile()
  const contentEl = useMainMarkdownElement()
  const ctx = useTtsPlaybackContext()
  const s = useAtomValue(ttsNarrationAtom)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (isMobile || !contentEl) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    )
    io.observe(contentEl)
    return () => io.disconnect()
  }, [isMobile, contentEl])

  if (isMobile || !s.available) return null

  const expanded = s.status === 'playing' || s.status === 'paused' || s.status === 'loading'
  const show = expanded || inView
  if (!ctx) return null

  const rates = [1, 1.25, 1.5, 1.75, 2]
  const cycleRate = () => {
    const next = rates[(rates.indexOf(s.playbackRate) + 1) % rates.length]
    ctx.playback.setPlaybackRate(next)
  }
  const onToggle = () => {
    if (s.status === 'idle' || s.status === 'loading') ctx.playback.playAll()
    else if (s.playingIndex === null) ctx.playback.playAll()
    else ctx.playback.toggleSegment(s.playingIndex)
  }

  return (
    <RootPortal>
      <AnimatePresence>
        {show && (
          <motion.div
            key="tts-fab"
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={softSpringPreset}
            className={clsxm(
              'fixed bottom-[2rem] right-[max(0px,env(safe-area-inset-right))] z-[10]',
              'flex items-center gap-1 rounded-full',
              'bg-paper/85 uk-material-default ring-1 ring-border',
              'shadow-[0_4px_24px_rgba(0,0,0,0.05)]',
              'h-11 px-2',
            )}
          >
            {s.stale && !expanded && (
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-warning" />
            )}
            <motion.button
              layoutId="tts-fab-play"
              transition={microReboundPreset}
              aria-label={s.status === 'playing' ? 'pause' : 'play'}
              type="button"
              onClick={onToggle}
              className={clsxm(
                'flex size-11 items-center justify-center rounded-full transition-colors',
                expanded
                  ? 'size-8 bg-accent text-white hover:bg-accent/90'
                  : 'text-neutral-7 hover:text-neutral-9',
              )}
            >
              {s.status === 'loading' ? (
                <i className="i-mingcute-loading-3-line animate-spin text-copy-16" />
              ) : s.status === 'playing' ? (
                <i className="i-mingcute-pause-fill text-copy-16" />
              ) : (
                <i className="i-mingcute-volume-line text-copy-16" />
              )}
            </motion.button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="pill"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ ...microReboundPreset, delay: 0.05 }}
                  className="flex items-center gap-2 pr-1"
                >
                  <span className="text-xs tabular-nums text-neutral-7">
                    {formatDuration(s.elapsed)}
                  </span>
                  <span className="text-neutral-5">·</span>
                  <span className="text-xs tabular-nums text-neutral-7">
                    {s.current}/{s.total}
                  </span>
                  <button
                    type="button"
                    onClick={cycleRate}
                    className="rounded px-1.5 py-0.5 text-xs tabular-nums text-neutral-7 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
                  >
                    {s.playbackRate}x
                  </button>
                  {!autoFollow && (
                    <button
                      type="button"
                      aria-label="recenter"
                      onClick={() => setTtsNarration({ autoFollow: true })}
                      className="flex size-6 items-center justify-center rounded text-neutral-7 transition-colors hover:bg-neutral-2"
                    >
                      <i className="i-mingcute-aiming-line text-copy-15 text-accent" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="stop"
                    onClick={() => {
                      ctx.playback.reset()
                      setTtsNarration({ autoFollow: true })
                    }}
                    className="flex size-6 items-center justify-center rounded text-neutral-7 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
                  >
                    <i className="i-mingcute-close-line text-copy-15" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </RootPortal>
  )
}
```

Verify the mingcute icon `i-mingcute-aiming-line` exists by grepping the icon set; if not, fall back to `i-mingcute-aim-line` or `i-mingcute-locate-line`.

- [ ] **Step 3: Mount in the provider**

In `TtsArticleProvider.tsx`, inside the `<Fragment>` (where the old bar lived, between `<TtsHighlightBar/>` and `{children}`), add:

```tsx
<TtsFloatingPlayer />
```

Import it at the top.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS.

- [ ] **Step 5: Manual verify (desktop)**

Start the dev server (`pnpm --filter @yohaku/web dev`), open a post/note with TTS available in a desktop-width viewport:
- At the hero/top: no element.
- Scroll into the body: a neutral play circle fades in bottom-right.
- Tap: spinner → expands to pill (accent play node), playback starts, elapsed ticks.
- Scroll manually while playing: Recenter (accent) appears; page stops following.
- Tap Recenter: page re-centers on the narrated block, Recenter hides.
- Tap ✕: stops, collapses back to idle circle.
Confirm accent only appears on the active play node.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/modules/tts/TtsFloatingPlayer.tsx apps/web/src/components/modules/tts/TtsArticleProvider.tsx
git commit -m "feat(tts): desktop floating pill player"
```

---

## Task 9: Extend capsule types + `resolveCapsuleState` (narrating) + tests

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/mobile-capsule.ts`
- Modify: `apps/web/src/components/layout/header/internal/mobile-capsule.test.ts`

**Interfaces:**
- Produces: `CapsuleOverlay` gains `'tts'`; `CapsuleVisualState` gains `'narrating'`; `resolveCapsuleState` gains an `isNarrating` input; narration wins the ticket slot over Live Desk when both active and no overlay open; `overlayOnPrimaryTap` opens `'tts'` when narrating.

- [ ] **Step 1: Extend types + resolve**

In `mobile-capsule.ts`:

```ts
export type CapsuleOverlay = 'expanded' | 'lang' | 'menu' | 'tts' | 'none'
export type CapsuleVisualState =
  'dot' | 'expanded' | 'idle' | 'lang' | 'menu' | 'narrating' | 'ticket'
```

Update `resolveCapsuleState` to accept `isNarrating`:

```ts
export const resolveCapsuleState = ({
  collapsed,
  hasLive,
  isNarrating,
  overlay,
}: {
  collapsed: boolean
  hasLive: boolean
  isNarrating: boolean
  overlay: CapsuleOverlay
}): CapsuleVisualState => {
  const effectiveOverlay = overlay === 'expanded' && !hasLive ? 'none' : overlay
  if (effectiveOverlay === 'menu') return 'menu'
  if (effectiveOverlay === 'lang') return 'lang'
  if (effectiveOverlay === 'expanded') return 'expanded'
  if (effectiveOverlay === 'tts') return 'narrating'
  if (collapsed) return 'dot'
  if (isNarrating) return 'narrating'
  return hasLive ? 'ticket' : 'idle'
}
```

Update `overlayOnPrimaryTap`:

```ts
export const overlayOnPrimaryTap = (
  overlay: CapsuleOverlay,
  hasLive: boolean,
  isNarrating: boolean,
): CapsuleOverlay => {
  if (overlay !== 'none') return 'none'
  if (isNarrating) return 'tts'
  return hasLive ? 'expanded' : 'menu'
}
```

- [ ] **Step 2: Add tests**

Append to `mobile-capsule.test.ts`:

```ts
describe('narration', () => {
  const base = { collapsed: false, hasLive: false, isNarrating: false, overlay: 'none' as const }

  it('shows narrating row when narrating and not collapsed', () => {
    expect(resolveCapsuleState({ ...base, isNarrating: true })).toBe('narrating')
  })
  it('narration wins over live ticket', () => {
    expect(resolveCapsuleState({ ...base, isNarrating: true, hasLive: true })).toBe('narrating')
  })
  it('collapses to dot while narrating', () => {
    expect(resolveCapsuleState({ ...base, isNarrating: true, collapsed: true })).toBe('dot')
  })
  it('tts overlay shows narrating shape', () => {
    expect(resolveCapsuleState({ ...base, overlay: 'tts' })).toBe('narrating')
  })
  it('primary tap opens tts when narrating', () => {
    expect(overlayOnPrimaryTap('none', false, true)).toBe('tts')
  })
  it('primary tap prefers tts over live when narrating', () => {
    expect(overlayOnPrimaryTap('none', true, true)).toBe('tts')
  })
})
```

Also update the existing `overlayOnPrimaryTap` calls in the test file to pass the new third arg (all `false` unless testing narration).

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @yohaku/web exec vitest run src/components/layout/header/internal/mobile-capsule.test.ts`
Expected: PASS (existing + 6 new). If existing tests fail on `overlayOnPrimaryTap` arity, fix the call sites in the test to add `false`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/header/internal/mobile-capsule.ts apps/web/src/components/layout/header/internal/mobile-capsule.test.ts
git commit -m "feat(tts): extend capsule state machine for narration"
```

---

## Task 10: `CapsuleNarratingTicketRow` + `CapsuleTtsPanel`

**Files:**
- Create: `apps/web/src/components/layout/header/internal/CapsuleNarratingTicketRow.tsx`
- Create: `apps/web/src/components/layout/header/internal/CapsuleTtsPanel.tsx`

**Interfaces:**
- Consumes: `ttsNarrationAtom` (+ derived labels), `formatDuration`, `useTtsPlaybackContext` is NOT available in the header tree — these components dispatch via the atom + a start callback passed down (Task 11 wires `onStart` from a menu action). For playback control from the panel, expose a small imperative API on the atom: add `ttsControlsAtom` holding `{ toggle, stop, cycleRate }` callbacks that `TtsArticleProvider` populates (see Task 11 Step 1).

- [ ] **Step 1: Add controls atom (in `atoms/tts.ts`)**

Append to `apps/web/src/atoms/tts.ts`:

```ts
export interface TtsControls {
  toggle: () => void
  stop: () => void
  cycleRate: () => void
  start: () => void
}
export const ttsControlsAtom = atom<TtsControls | null>(null)
export const setTtsControls = (controls: TtsControls | null) =>
  jotaiStore.set(ttsControlsAtom, controls)
```

Commit this small addition with the atom task's next commit or a dedicated one:

- [ ] **Step 2: `CapsuleNarratingTicketRow`**

```tsx
// apps/web/src/components/layout/header/internal/CapsuleNarratingTicketRow.tsx
'use client'

import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'

import { narratingElapsedLabelAtom, ttsNarrationAtom } from '~/atoms/tts'

export function CapsuleNarratingTicketRow() {
  const t = useTranslations('tts')
  const { current, total } = useAtomValue(ttsNarrationAtom)
  const elapsed = useAtomValue(narratingElapsedLabelAtom)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <i className="i-mingcute-volume-line shrink-0 text-copy-15 text-accent" />
      <span className="truncate font-sans text-copy-13 text-neutral-8">
        {t('narrating')}
        <span className="mx-1.5 text-neutral-5">·</span>
        <span className="tabular-nums">
          {current}/{total}
        </span>
        {elapsed && (
          <>
            <span className="mx-1.5 text-neutral-5">·</span>
            <span className="tabular-nums">{elapsed}</span>
          </>
        )}
      </span>
    </span>
  )
}
```

- [ ] **Step 3: `CapsuleTtsPanel`**

```tsx
// apps/web/src/components/layout/header/internal/CapsuleTtsPanel.tsx
'use client'

import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'

import { formatDuration } from '~/lib/tts-format'
import { ttsControlsAtom, ttsNarrationAtom } from '~/atoms/tts'

export function CapsuleTtsPanel() {
  const t = useTranslations('tts')
  const s = useAtomValue(ttsNarrationAtom)
  const controls = useAtomValue(ttsControlsAtom)
  const pct = s.duration > 0 ? Math.min(100, (s.elapsed / s.duration) * 100) : 0
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        aria-label={s.status === 'playing' ? t('pause') : t('play')}
        onClick={() => controls?.toggle()}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"
      >
        <i
          className={
            s.status === 'playing'
              ? 'i-mingcute-pause-fill text-copy-15'
              : 'i-mingcute-volume-line text-copy-15'
          }
        />
      </button>
      <span className="text-xs tabular-nums text-neutral-7">{formatDuration(s.elapsed)}</span>
      <span className="text-xs tabular-nums text-neutral-5">
        {t('segment_progress', { current: s.current, total: s.total })}
      </span>
      <div className="relative h-[3px] flex-1 rounded-full bg-neutral-3">
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <button
        type="button"
        onClick={() => controls?.cycleRate()}
        className="rounded border border-border px-1.5 py-0.5 text-xs tabular-nums text-neutral-7"
      >
        {s.playbackRate}x
      </button>
      <button
        type="button"
        aria-label={t('stop')}
        onClick={() => controls?.stop()}
        className="text-neutral-7"
      >
        <i className="i-mingcute-close-line text-copy-15" />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/atoms/tts.ts apps/web/src/components/layout/header/internal/CapsuleNarratingTicketRow.tsx apps/web/src/components/layout/header/internal/CapsuleTtsPanel.tsx
git commit -m "feat(tts): mobile capsule narrating ticket + tts panel"
```

---

## Task 11: Wire narrating into `CapsuleHeader` + populate controls atom

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/MobileHeader.tsx`
- Modify: `apps/web/src/components/modules/tts/TtsArticleProvider.tsx` (populate `ttsControlsAtom`)

**Interfaces:**
- Consumes: `isNarratingAtom`, `ttsNarrationAtom`, `resolveCapsuleState` (Task 9), `CapsuleNarratingTicketRow`, `CapsuleTtsPanel` (Task 10).
- Produces: capsule renders the narrating ticket row in the primary area and the `tts` panel when `state === 'narrating'`; dot shows an accent pulse; primary tap opens `tts`. `TtsArticleProvider` writes `ttsControlsAtom` so the panel can drive playback without article context in the header tree.

- [ ] **Step 1: Populate `ttsControlsAtom` in the provider**

In `TtsArticleProvider.tsx`, after `playback` and the activation handlers exist, add:

```ts
useEffect(() => {
  setTtsControls({
    start: () => {
      if (!activated) {
        setActivated(true)
        setPlayOnLoad(true)
        return
      }
      playback.playAll()
    },
    toggle: () => {
      if (!activated) {
        setActivated(true)
        setPlayOnLoad(true)
        return
      }
      if (playback.playingIndex === null) playback.playAll()
      else playback.toggleSegment(playback.playingIndex)
    },
    stop: () => {
      playback.reset()
      setTtsNarration({ autoFollow: true })
    },
    cycleRate: () => {
      const rates = [1, 1.25, 1.5, 1.75, 2]
      playback.setPlaybackRate(
        rates[(rates.indexOf(playback.playbackRate) + 1) % rates.length],
      )
    },
  })
  return () => setTtsControls(null)
}, [activated, playback])
```

Import `setTtsControls` from `~/atoms/tts`.

- [ ] **Step 2: Read narration into the capsule resolve**

In `CapsuleHeader` (`MobileHeader.tsx`), add:

```ts
const isNarrating = useAtomValue(isNarratingAtom)
```

Pass it into `resolveCapsuleState`:

```ts
const state = resolveCapsuleState({ collapsed, hasLive, isNarrating, overlay })
```

Update the `activePanel` mapping so `state === 'narrating' && overlay === 'tts'` yields `panelContent === 'tts'`:

```ts
const activePanel: PanelKind | null =
  state === 'menu' ? 'menu'
  : state === 'expanded' ? 'expanded'
  : overlay === 'tts' ? 'tts'
  : state === 'lang' ? 'lang'
  : null
```

Extend the local `PanelKind` type to include `'tts'`.

- [ ] **Step 3: Render the narrating ticket row**

In the primary button (currently the `flex-1` `<button>`, lines 317–351), add a narrating layer analogous to the live `ticketVisible` layer:

```tsx
{isNarrating && !isDot && (
  <span
    className={clsxm(
      'absolute inset-y-0 left-4 right-0 flex items-center transition-opacity duration-200',
      overlay === 'tts' ? 'opacity-100' : 'pointer-events-none opacity-0',
    )}
  >
    <CapsuleNarratingTicketRow />
  </span>
)}
```

And gate the existing site-title + live-ticket layers with `!isNarrating` so narration replaces them while playing (mirroring how `ticketVisible` suppresses the title). Adjust the opacity conditions: the title layer shows when `!ticketVisible && !isNarrating`; the live ticket layer shows when `ticketVisible && !isNarrating`.

- [ ] **Step 4: Render the `tts` panel**

In the panel-content switch (lines 289–305), add a branch:

```tsx
) : panelContent === 'tts' ? (
  <CapsuleTtsPanel />
) : panelContent === 'expanded' && presentation.visible ? (
```

- [ ] **Step 5: Primary-tap narration branch**

The primary button `onClick` currently calls `overlayOnPrimaryTap(prev, hasLive)`. Update to pass `isNarrating`:

```ts
onClick={() => setOverlay((prev) => overlayOnPrimaryTap(prev, hasLive, isNarrating))}
```

- [ ] **Step 6: Dot pulse while narrating**

In the `isDot` branch (lines 363–372), when narrating show an accent pulse instead of the neutral/live dot:

```tsx
{isDot && (
  <button
    aria-label={t('aria_header_drawer')}
    className="absolute inset-0 flex items-center justify-center"
    type="button"
    onClick={() => setCollapsed(false)}
  >
    {isNarrating ? (
      <span className="size-2.5 rounded-full bg-accent [animation:tts-pulse_1.6s_ease-out_infinite]" />
    ) : (
      <CapsuleLiveDot active={hasLive} />
    )}
  </button>
)}
```

Add the keyframe to `apps/web/src/styles/animation.css`:

```css
@keyframes tts-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 45%, transparent); }
  70% { box-shadow: 0 0 0 9px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
```

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS.

- [ ] **Step 8: Manual verify (mobile)**

Dev server, mobile viewport, a narratable article:
- Idle capsule shows site title only.
- Open menu → "朗读" entry is absent until Task 12; for now trigger via devtools by setting `activated` — or proceed to Task 12 first and verify together.
- When playing: capsule primary row shows `▶ 正在朗读 · 1/12 · 2:14`; tap → `tts` panel expands with play/pause, elapsed, segment, progress, speed, stop.
- Scroll down: capsule collapses to dot with accent pulse; tap restores.
- Stop: capsule returns to site title (or live ticket if Live Desk active).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/modules/tts/TtsArticleProvider.tsx apps/web/src/components/layout/header/internal/MobileHeader.tsx apps/web/src/styles/animation.css
git commit -m "feat(tts): wire narrating state into mobile capsule"
```

---

## Task 12: "朗读" menu entry + i18n keys (all locales)

**Files:**
- Modify: `apps/web/src/components/layout/header/internal/MobileDrawerContent.tsx`
- Modify: `apps/web/src/messages/{en,zh,zh-TW,ja,ko}/tts.json`

**Interfaces:**
- Consumes: `ttsNarrationAtom.available`, `ttsControlsAtom.start`.
- Produces: a "朗读" menu item visible only when narration is available; selecting it starts playback and closes the drawer.

- [ ] **Step 1: Inspect `MobileDrawerContent` structure**

Read `MobileDrawerContent.tsx` to find the nav item list pattern (reuse its existing item component/className). Note the close-via-context mechanism (`MobileMenuContext.close`).

- [ ] **Step 2: Add the menu item**

Following the existing item pattern, add (conditionally rendered):

```tsx
const ttsAvailable = useAtomValue(ttsNarrationAtom).available
const startTts = useAtomValue(ttsControlsAtom)?.start
const { close } = use(MobileMenuContext) // existing context
// …in the nav list:
{ttsAvailable && (
  <NavItem
    icon={<i className="i-mingcute-volume-line" />}
    label={t('narrate', { ns: 'tts' })}
    onClick={() => {
      startTts?.()
      close()
    }}
  />
)}
```

Match the exact `NavItem`/className used by neighboring items; if the file uses plain `<button>`/links, mirror that. Import `MobileMenuContext` from `./HeaderDrawerButton` (where it is exported alongside `MenuIcon`).

- [ ] **Step 3: Add i18n keys (all 5 locales)**

Add these keys to each `tts.json` (values per locale):

| key | en | zh | zh-TW | ja | ko |
|---|---|---|---|---|---|
| `narrating` | Narrating | 正在朗读 | 正在朗讀 | 読み上げ中 | 낭독 중 |
| `narrate` | Listen to this article | 朗读本文 | 朗讀本文 | この記事を読み上げ | 이 글 듣기 |
| `stop` | Stop | 停止 | 停止 | 停止 | 정지 |
| `recenter` | Recenter | 回到当前 | 回到當前 | 現在位置へ | 현재 위치로 |

(`play`/`pause`/`segment_progress`/`narration` already exist; reuse them.)

- [ ] **Step 4: Run message-usage test**

Run: `pnpm --filter @yohaku/web exec vitest run messages/message-usage.test.ts` (adjust path to match the repo; `grep` for `message-usage` to confirm)
Expected: PASS — all locales have matching keys.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS.

- [ ] **Step 6: Manual verify (mobile, end-to-end)**

Mobile viewport, narratable article:
- Open menu → "朗读本文" visible; tap → menu closes, capsule shows narrating ticket, playback begins.
- On an article without TTS (`available=false`) → entry hidden.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/header/internal/MobileDrawerContent.tsx apps/web/src/messages
git commit -m "feat(tts): mobile menu entry to start narration + i18n"
```

---

## Task 13: Finalize — full verify + cleanup

**Files:** none (verification + companion teardown).

- [ ] **Step 1: Scoped lint/typecheck on all changed files**

Run: `pnpm --filter @yohaku/web lint`
Expected: PASS (no type errors, no banned classes, no dead code).

- [ ] **Step 2: Run affected unit tests**

Run: `pnpm --filter @yohaku/web exec vitest run src/components/modules/tts src/components/layout/header/internal/mobile-capsule.test.ts src/lib/tts-format.test.ts messages/message-usage.test.ts`
Expected: all PASS.

- [ ] **Step 3: Desktop end-to-end (browser)**

Repeat Task 8 Step 5 across light AND dark mode; confirm accent-only-on-active, reveal-on-scroll-in, yield-on-scroll + recenter, close-resets, reduced-motion (devtools emulate) degrades to instant.

- [ ] **Step 4: Mobile end-to-end (browser)**

Repeat Task 11 Step 8 + Task 12 Step 6; confirm capsule ticket/panel/dot states, Live-Desk precedence (if a live activity is present, narration suppresses it while playing, restores on stop), route-change stops narration, keyboard-open hides capsule.

- [ ] **Step 5: Stop the brainstorm companion server**

Run: `bash skills/brainstorming/scripts/stop-server.sh .superpowers/brainstorm/58755-1786165636` (path relative to the superpowers skill root).
Expected: server stopped; mockups persist under `.superpowers/brainstorm/` (gitignored).

- [ ] **Step 6: Final commit (if any cleanup)**

If Steps 1–4 surfaced fixes, commit them. Otherwise nothing to commit.

---

## Self-Review (completed during authoring)

- **Spec coverage:** every spec section maps to a task — atom (T1), engine (T3), provider sync (T4), bar removal (T5), auto-follow (T6/T7), desktop pill (T8), capsule types (T9), capsule surfaces (T10/T11), discovery (T12), edge-case/error/stale/reduced-motion (woven into T8/T11/T13).
- **Type consistency:** `TtsPlayback` fields, `ttsNarrationAtom` shape, `resolveCapsuleState`/`overlayOnPrimaryTap` arity, `PanelKind`, `ttsControlsAtom` are consistent across tasks.
- **Placeholders:** none — the Task 8 Step 1 stub is explicitly replaced in Step 2 before any commit.
