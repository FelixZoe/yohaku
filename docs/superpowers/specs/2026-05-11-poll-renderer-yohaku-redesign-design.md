# Poll Renderer · Yohaku Redesign

**Date**: 2026-05-11
**Scope**: `apps/web` only — replace haklex's default `PollRenderer` with a Yohaku-native renderer that honors the project's design tokens and visual language.

## Problem

The default `PollRenderer` from `@haklex/rich-ext-poll/renderer` ships a generic poll widget styled via `vanilla-extract` and `@haklex/rich-style-token`:

- Top + bottom hairline borders frame the widget like a box (heavy)
- Background tint fills behind option labels read as a progress chart (loud)
- Question is `font-weight: 600` (assertive against body prose)
- `SINGLE CHOICE · VOTED` uppercase Latin meta clashes with CJK body
- Dense vertical rhythm; little breathing room

These traits run counter to Yohaku's "余白" (whitespace, restraint) aesthetic and to the project's design contract (`@yohaku/design-system`): warm neutrals, accent reserved for emphasis (≤ 5% surface), `font-mono` only for numerals/timestamps, blockquote-style accent left bar for marked content.

## Goals

1. Render polls within rich content with a Yohaku-native visual: blockquote-style left bar, hairline tally meters, monochrome body, accent only as the "voted" marker.
2. Reuse Yohaku's `StyledButton variant="primary"` for the multi-choice submit (accent-tinted: `bg-accent/8` + `border-accent/30` + `text-accent` + `rounded-xl` + `font-medium`).
3. Tree-shake the default `PollRenderer` chunk and `vanilla-extract` poll CSS out of the production bundle.
4. Keep the existing `yohakuPollAdapter` + `PollDataProvider` data flow untouched.

## Non-goals

- Editor-side `PollEditDecorator` is not touched (this is reader-only).
- The haklex `@haklex/rich-ext-poll` package is not modified.
- No changes to the data adapter, polling REST contract, or `mx-core` server.
- No new design tokens — all styling uses existing `@yohaku/design-system` tokens.

## Visual contract

### Layout — "引言式" (blockquote-style)

The poll renders as a single block with a 2px accent left rule (echoing comment author replies and blockquote markers). No container, no background, no rounded box. The left bar is the only visual signature.

```
│  React 与 Vue，孰更得心？          ← question, n-10, font-medium
│
│  React                      62%   ← option · voted: n-10, weight 500
│ ━━━━━━━━━━━━━━━━━━━━━━━           ← 1px accent bar at tally width
│
│  Vue                        28%
│ ━━━━━━                            ← 1px neutral-4 bar at tally width
│
│  皆可                       10%
│ ━━
│
│  1,234 票                  5月15日截
```

### State matrix

| State                | Bar                                        | Text color    | Notes                                   |
| -------------------- | ------------------------------------------ | ------------- | --------------------------------------- |
| `idle` (not voted)   | `bg-neutral-4` at `share` (0 if no tally)  | `n-7`         | Hover → `n-9`. In single mode, the hovered row also shows a `font-mono` "点选即投" hint (right side) |
| `pending` (multi)    | `bg-accent/50` at **full width**           | `n-9`         | Marks "selected for submit"             |
| `voted`              | `bg-accent` at `share`                     | `n-10`, w-500 | Pct color → `n-10`                      |
| `closed`             | (whatever it was)                          | (unchanged)   | Whole `<div>` `opacity-70`, `cursor-default`. Footer adds `已闭` in `text-accent` |
| `loading`            | —                                          | —             | 4 skeleton rows, `bg-neutral-3`, `animate-pulse` |
| `error`              | (preserve last state)                      | —             | `font-mono text-[0.7rem] text-error` line below options |

### Typography & color tokens

| Element        | Class / token                                                  |
| -------------- | -------------------------------------------------------------- |
| Container      | `my-4 border-l-2 border-accent pl-4 py-1`                      |
| Question       | `mb-3 text-base font-medium text-neutral-10`                   |
| Option row     | `relative flex items-baseline justify-between gap-3 py-[9px] border-b border-border last:border-b-0 transition-colors` |
| Option (idle)  | `text-neutral-7 hover:text-neutral-9 cursor-pointer`           |
| Option (voted) | `text-neutral-10 font-medium`                                  |
| Option (pending) | `text-neutral-9`                                             |
| Option (closed) | `cursor-default`                                              |
| Bar            | `pointer-events-none absolute left-0 -bottom-px h-px transition-[width,background] duration-300` |
| Bar idle       | `bg-neutral-4`                                                 |
| Bar voted      | `bg-accent`                                                    |
| Bar pending    | `bg-accent/50 w-full`                                          |
| Percentage     | `font-mono text-xs tabular-nums text-neutral-6`                |
| Percentage voted | `text-neutral-10`                                            |
| Hover hint     | `font-mono text-[0.7rem] text-neutral-5`                       |
| Footer         | `mt-3 flex justify-between font-mono text-[0.7rem] text-neutral-6` |
| Closed footer marker | `text-accent`                                            |
| Submit button  | `<StyledButton variant="primary" />`                           |
| Skeleton row   | `h-5 bg-neutral-3 rounded-sm my-[9px] animate-pulse`           |
| Error line     | `mt-2 font-mono text-[0.7rem] text-error`                      |

The `text-error` utility maps to `--color-error` (`#a64953` 蘇芳 suoh) per the design system.

Dark mode is automatic — the neutral scale inverts via `[data-theme="dark"]`. Accent stays.

## Architecture

### File layout

```
apps/web/src/components/ui/rich-content/
├── poll-adapter.tsx          (existing, untouched)
├── poll-renderer.tsx         (NEW)
└── poll-module.ts            (NEW)
```

### Module wiring

`poll-module.ts` exports a `RichRendererModule` that registers the lightweight `pollNodes` (no default renderer in scope) and maps `POLL_NODE_KEY` to `YohakuPollRenderer`:

```ts
import type { RichRendererModule } from '@haklex/rich-compose'
import { POLL_NODE_KEY, pollNodes } from '@haklex/rich-ext-poll/node'

import { YohakuPollRenderer } from './poll-renderer'

export const yohakuPollModule: RichRendererModule = {
  name: 'poll',
  nodes: pollNodes,
  renderers: { [POLL_NODE_KEY]: YohakuPollRenderer },
}
```

### LexicalContent integration

In `apps/web/src/components/ui/rich-content/LexicalContent.tsx`:

- Remove `import { pollModule } from '@haklex/rich-compose/modules/poll'`
- Remove `import '@haklex/rich-ext-poll/style.css'`
- Add `import { yohakuPollModule } from './poll-module'`
- Replace `pollModule` with `yohakuPollModule` in the `composeRenderer({ modules: [...] })` array

`<PollDataProvider adapter={yohakuPollAdapter}>` and the `yohakuPollAdapter` itself stay untouched.

### Renderer structure

```tsx
// poll-renderer.tsx
import type { PollDataAdapter, PollOption, PollRendererProps, PollShowResults, PollState } from '@haklex/rich-ext-poll'
import { useInitialPollState, usePollDataAdapter } from '@haklex/rich-ext-poll'
import { useCallback, useMemo, useState } from 'react'

import { StyledButton } from '~/components/ui/button'

export function YohakuPollRenderer(props: PollRendererProps) {
  const adapter = usePollDataAdapter()
  if (!adapter) return <YohakuPollStatic {...props} />
  return <YohakuPollInteractive adapter={adapter} {...props} />
}

function YohakuPollStatic({ question, options }: PollRendererProps) { /* ... */ }

function YohakuPollInteractive({ adapter, options, pollId, question, mode, closeAt, showResults }: {
  adapter: PollDataAdapter
} & PollRendererProps) {
  const initialState = useInitialPollState(pollId)
  const liveState    = adapter.usePollState(pollId)
  const submit       = adapter.useSubmit(pollId)
  const state: PollState = liveState ?? initialState ?? FALLBACK_STATE

  const [pending, setPending] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showTallies = shouldShowTallies(state, showResults)
  const userVoted   = state.userVote !== undefined
  const isClosed    = state.closed
  const canInteract = !isClosed && state.canVote && state.status !== 'loading'

  // tallyShare(optionId): if !showTallies or totalVotes <= 0 → 0
  //                       else clamp(0, 1, tallies[id] / totalVotes)
  const tallyShare = useCallback(/* ported verbatim from haklex default */, [showTallies, state])

  // single click → submit single
  // multi click  → toggle pending
  // multi submit → submit pending, clear pending

  if (state.status === 'loading') return <PollFrame><PollSkeleton /></PollFrame>

  return (
    <PollFrame closed={isClosed}>
      <PollQuestion>{question}</PollQuestion>
      <PollOptionList>
        {options.map((opt) => (
          <PollOption key={opt.id} ... />
        ))}
      </PollOptionList>
      {canInteract && mode === 'multiple' && (
        <StyledButton variant="primary" disabled={pending.length === 0} isLoading={isSubmitting} onClick={handleMultiSubmit}>
          {pending.length === 0 ? '提交' : `提交 · ${pending.length} 项`}
        </StyledButton>
      )}
      <PollFooter ... />
      {state.status === 'error' && state.errorMessage && <PollError>{state.errorMessage}</PollError>}
    </PollFrame>
  )
}
```

`PollFrame`, `PollQuestion`, `PollOptionList`, `PollOption`, `PollFooter`, `PollSkeleton`, `PollError` are local presentation components scoped to this file (no exports).

The interaction handlers (`handleSingleClick`, `handleMultiToggle`, `handleMultiSubmit`) port the haklex default's logic verbatim — same `try/finally` discipline around `isSubmitting`, same `Enter`/`Space` keyboard handling on each option row.

## Data contract

Unchanged. Reads `PollState` and submits via `PollDataAdapter` exactly as the default `PollRenderer` does. Server contract (`mx-core /polls/:id`, `/polls/:id/vote`) untouched.

## Bundle impact

**Removed from bundle:**
- `@haklex/rich-ext-poll/renderer` (default `PollRenderer.tsx`)
- `@haklex/rich-ext-poll/poll.css.ts` vanilla-extract output
- `@haklex/rich-ext-poll/style.css`
- `@haklex/rich-compose/modules/poll` (unused — we ship our own module)

**Added to bundle:**
- `poll-renderer.tsx` (~ same size as the default, written as Tailwind utilities — no new CSS-in-JS runtime cost since Tailwind v4 already ships)
- `poll-module.ts` (~ tiny)

**Verification:**
- After build, grep `apps/web/.next/` for `pollClasses` / `pollContainer` / `vanilla-extract.*poll` — should not appear.
- `@haklex/rich-ext-poll/node` *does* remain (we use `pollNodes`), but it has no renderer or styles.

## Testing

No new automated tests — this matches the existing convention for `apps/web/src/components/ui/rich-content/*`, which has no co-located unit tests.

Manual verification (covers all seven states from the visual matrix):

1. **Single, idle** → click a row → enters voted, accent bar appears at tally share
2. **Multi, idle** → click two rows → full-width accent/50 bars on selected rows; submit button reads `提交 · 2 项` and is enabled
3. **Multi, submit** → click submit → `isSubmitting` shows spinner via `StyledButton.isLoading`; on success, pending clears and rows show settled accent bars at tally share
4. **Reload after voting** → SSR initial state hydrates immediately into `voted` (no flash)
5. **Closed poll** → `opacity-70`, options not clickable, footer shows `已闭` in `text-accent`
6. **Network failure** → `state.status === 'error'` shows `errorMessage` line below options
7. **Dark mode** → toggle theme, verify neutrals invert and accent reads correctly on dark surface

Build verification:

```bash
pnpm --filter @yohaku/web lint   # only on changed files (per CLAUDE.md)
pnpm --filter @yohaku/web build
# then grep .next/ for poll vanilla-extract artifacts
```

## Risks & open questions

- **Hover hint placement**: every idle option shows `点选即投` on its own hover, only when `mode === 'single'` and `canInteract` is true. Mirrors the haklex default's CSS-driven behavior (`opacity-0` → `opacity-100` on row hover), so first-touch and keyboard focus both reveal it.
- **Closed + has voted**: opacity-70 stacks visually with the accent bar — bar may look slightly less saturated. Acceptable; the "past tense" feel is intentional.
- **Hairline border on last option**: removed via `last:border-b-0` so the bar of the last row has nothing competing visually.
- **Tailwind opacity color-mix**: `bg-accent/50`, `bg-accent/8`, `border-accent/30` rely on Tailwind v4's `color-mix` runtime. Project already uses these elsewhere (StyledButton primary), so no new constraint.

## Out of scope (followups)

- Editor-side poll decoration restyling (`PollEditDecorator` in `@haklex/rich-ext-poll/edit`).
- Result-visibility policy variants (`after-vote` / `after-close`) UI affordance — current design respects the policy via `shouldShowTallies` but does not surface a "results hidden until you vote" hint to the user. Could add a small `font-mono text-neutral-6` cue before voting if needed.
- Animation polish (e.g., a subtle stagger when bars first appear after vote). Current design is static + 320ms width transition only.
