# Locale Suggestion Notice — Design

Date: 2026-08-04
Status: approved in brainstorming (form option A: desktop drop pill + mobile capsule panel)

## Overview

A client-side notice that detects a mismatch between the visitor's browser language
(`navigator.languages`) and the current page locale, and offers a one-tap switch.
The notice is anchored to the site chrome: on desktop it drops down from under the
top header as a rounded pill; on mobile it appears as a panel inside the bottom
capsule header, reusing the capsule's existing expand mechanics.

## Background & constraints

- next-intl `localeDetection` is on for normal routes (first visit to an unprefixed
  route redirects by `NEXT_LOCALE` cookie / `Accept-Language`), but post/note detail
  canonicals deliberately disable detection (`src/i18n/content-route.ts`), and
  locale-prefixed shared links (e.g. `/ja/posts/...`) bypass preference entirely.
  These are the two real mismatch scenarios; the notice covers both by checking
  globally on the client.
- Supported locales: `zh` (default), `zh-TW`, `en`, `ja`, `ko` (`src/i18n/config.ts`).
- No server/middleware changes. Detection and UI are purely client-side.

## Module layout

New module `apps/web/src/components/modules/locale-suggestion/`:

```
locale-suggestion/
  match-locale.ts           # pure matcher + match-locale.test.ts
  use-locale-suggestion.ts  # eligibility hook
  copy.ts                   # static per-locale copy table
  LocaleSuggestionPill.tsx  # desktop pill
```

## Detection

`matchPreferredLocale(languages: readonly string[]): Locale | null` — pure, vitest-covered:

1. Iterate `languages` in order; first hit wins.
2. Per entry (case-insensitive): exact supported-locale match first (`zh-TW`).
3. Chinese special cases: `zh-HK`, `zh-MO`, `zh-Hant*` → `zh-TW`; `zh-CN`, `zh-SG`, `zh-Hans*`, bare `zh` → `zh`.
4. Otherwise base-language fallback: `en-US` → `en`, `ja-JP` → `ja`, etc.
5. No entry matches → `null`.

`useLocaleSuggestion()` returns `{ suggestedLocale, accept, dismiss } | null`. It
suggests when ALL hold:

- `matchPreferredLocale(navigator.languages)` is non-null and ≠ `useLocale()`
- the suggested locale is not in the persisted dismissed record
- no session snooze flag is set
- ~1.5 s have passed since hydration (avoid competing with first paint)

## Actions & persistence

| User action | Effect |
| --- | --- |
| Switch | `router.push(pathname, { locale: suggested })` via `~/i18n/navigation`; path preserved, next-intl persists `NEXT_LOCALE` cookie; condition self-clears |
| Dismiss (✕ / Not now) | write `dismissed[suggested] = true` in `atomWithStorage(buildNSKey('locale-suggestion-dismissed'))` — keyed by the suggested locale, so declining `en` never re-suggests `en`, but a later browser preference of `ja` may still suggest `ja` (per-language-pair memory) |
| Ignore | auto-hide after ~10 s; a `sessionStorage` snooze key suppresses it for the rest of the session; it may appear again on a future visit |

Manual locale change via the footer `LocaleSwitcher` counts as an explicit
preference: on switch, if `matchPreferredLocale(navigator.languages)` yields a
locale different from the newly chosen one, record it as dismissed.

## UI — desktop (`lg+`)

- `LocaleSuggestionPill` mounted from `Header.tsx` inside the desktop-only block
  (`hidden lg:block`, `data-hide-print`).
- Fixed, horizontally centered, just below the 4.5 rem header; slides down from
  behind the header with motion (LazyMotion is already mounted); slides back up on
  hide.
- Visual language mirrors the mobile capsule: `bg-[#fefefb] dark:bg-neutral-2`,
  `border-black/5 dark:border-white/[0.04]`, the capsule shadow pair, `rounded-full`.
  Message text in `neutral-9`; accent-filled Switch button; ghost ✕.
- `role="status"`, `aria-live="polite"`.

## UI — mobile

- Extend the capsule in `MobileHeader.tsx`: `PanelKind` gains `'lang'`, and the
  overlay/state machine in `mobile-capsule.ts` gains a matching overlay kind
  (`mobile-capsule.test.ts` extended accordingly).
- Panel content: message line + Switch (accent pill) + Not now (ghost).
- Auto-opens once when eligible, and only from the `idle` capsule state — never
  over the live-desk ticket/expanded states or the menu.
- Closes on: scroll, route change, ~10 s timeout (session snooze), or either action.

## Copy

- The notice is written in the SUGGESTED language (suggesting `en` speaks English).
- Message catalogs only load the current locale, so `copy.ts` holds a static table:
  `Record<Locale, { message, switchLabel, dismissLabel }>` — five locales, three
  strings each. `message-usage.test` only checks `t()` keys, so this table does not
  interfere.
- Button labels carry no trailing punctuation.

## Testing

- `match-locale.test.ts`: exact match, base-language fallback, `zh-Hant`/`zh-HK` →
  `zh-TW`, `zh-CN` → `zh`, priority order across multiple entries, no-match → null.
- `mobile-capsule.test.ts`: new overlay kind transitions (auto-open only from idle,
  close conditions).
- Eligibility gating extracted pure where practical and unit-tested.

## Out of scope

- No middleware/server changes; content-canonical detection behavior untouched.
- No modal, toast, or full-width banner variants (explicitly rejected).
- No analytics events.
