# Mobile Floating Capsule Header — Design

Date: 2026-07-19
Status: Approved (brainstorm mockups: `.superpowers/brainstorm/86094-1784473171/content/capsule-transitions-v2.html`)

## Problem

The current mobile header (`MobileHeader.tsx`) is a fixed top pill holding only the site name and a drawer toggle. It has no room for the Live Desk activity ticket (owner's current app / playing media), which today renders only in the desktop header (`LiveDeskActivity`). Mobile users never see the live presence signal.

## Decision

Replace the top pill with a **floating capsule docked above the bottom edge**. The capsule is the mobile header: it hosts the site name, the Live Desk ticket, the nav drawer, and a scroll-collapsed dot form. Chosen over "bottom full-width dock" and "top two-tier pill" alternatives in mockup review.

## States

| # | State | Trigger | Capsule form | Contents |
|---|-------|---------|--------------|----------|
| 1 | Idle | no live desk data | centered capsule, ~72% width, 40px tall | site name + ☰ |
| 2 | Live ticket | live desk presentation visible | widens to ~82% | live dot + app/media icon + ticket text (SlotText flip) + ☰; site name yields |
| 3 | Scroll dot | scrolling down | 38px circle, docked **bottom-left** | live dot only (pulse); if no live activity, a neutral dot |
| 4 | Ticket expanded | tap ticket area | blooms upward, ~88% width, ~118px | artwork (36px), title, byline, progress bar, secondary activity row, ✕ |
| 5 | Menu open | tap ☰ | grows upward, ~88% width, height to fit nav | nav items (reuse `MobileDrawerContent`), site name anchored bottom row, ✕ |

State flow:

- 1 ⇄ 2 as live desk data appears/disappears.
- Any of 1/2 → 3 on scroll down; 3 → previous state on scroll up or scroll stop (reuse the direction/threshold behavior currently driven by `useIsScrollUpAndPageIsOver` / `useMenuOpacity`, inverted for a bottom element).
- 2 → 4 on ticket tap; 4 → 2 on ✕ / outside tap / scroll.
- 1/2 → 5 on ☰ tap; 5 closes on ✕, outside tap, Escape, or route change (existing behavior).
- 4 and 5 are mutually exclusive; opening one closes the other.

## Shared element transitions

Persistent nodes travel between states instead of crossfading. Non-shared content fades in ~120–160ms **after** the shape morph settles.

- **Site name** (states 1 ⇄ 5): travels from capsule center-left to the menu's bottom anchor row and back.
- **☰ / ✕ glyph**: one node, stays right-anchored, rotates/crossfades between glyphs; travels vertically as capsule height changes.
- **Ticket icon** (2 ⇄ 4): the 16px ticket icon grows in place into the 36px expanded-card artwork.
- **Live dot** (2 ⇄ 3): on collapse everything else fades out; the dot alone travels to the bottom-left dock and keeps pulsing. On restore it travels back into the ticket row.
- Hidden shared elements keep tracking their per-state coordinates so they re-enter from the correct position.

Timing: shape morph ~500ms, ease `[0.22, 1, 0.36, 1]` (matches existing `MobileHeader` motion). Respect `useReducedMotion` — reduce to opacity-only transitions.

## Architecture

All inside `apps/web/src/components/layout/header/internal/`:

- **`MobileHeader.tsx` (rewritten)** — owns the capsule state machine (`idle | ticket | dot | expanded | menu`) and renders the capsule shell. Keeps existing responsibilities: client/mobile gating, route-change close, body scroll lock while menu open, Escape handling.
- **Capsule shell** — single fixed-position container, `bottom` anchored with `env(safe-area-inset-bottom)` padding, `z-[9]`, `data-hide-print`. Width/height/left/border-radius animate via Motion (`m.div` layout or explicit animate values, matching the mockup's CSS-transition feel).
- **Shared elements** — site name, menu glyph, ticket icon, live dot rendered once as absolutely positioned children with per-state coordinates.
- **Ticket content** — reuse the live desk data path used by `LiveDeskActivity`: `liveDeskAtom` → `createLiveDeskPresentation` → presentation. Extract the presentation-consuming logic needed by mobile into a shared hook if duplication grows; do **not** render the desktop `LiveDeskActivity` component on mobile. Ticket text uses `SlotText` (Yohaku signature flip).
- **Expanded card** — artwork via existing `resolveActivityAppIconURL` / media artwork logic, progress via `projectMediaPositionMs`, secondary activity line from the application presentation.
- **Menu content** — reuse `MobileDrawerContent` inside the capsule, unfolding upward. `MobileMenuContext` close contract unchanged.
- **Removal** — the top pill markup (`SiteName`, `AuthSignature` top-bar placement) is removed. `AuthSignature` moves into the menu-open state's bottom row area (next to site name) so login identity remains visible.

## Edge cases & rules

- **No live desk data ever (state 1 only)**: capsule behaves like the old header, just at the bottom; scroll still collapses it to a neutral dot.
- **Live data arrives while in dot state**: dot gains the accent pulse; no auto-expand.
- **Live data disappears while in state 4**: expanded card closes back to state 1.
- **Page not active / document hidden**: presentation already gates on `usePageIsActive`; ticket falls back to idle.
- **Keyboard/viewport**: when the on-screen keyboard opens (visualViewport shrink), keep the capsule anchored to the visual viewport bottom or hide it; do not let it float mid-screen. Simplest acceptable: hide while `visualViewport.height` shrinks > 150px.
- **Overlap with page bottom actions**: capsule is `z-[9]` like today; article end-of-page controls should get bottom padding (`pb-24` class on main scroll container for mobile) so content is not permanently obscured.
- **Desktop unchanged**: `HeaderContent`, desktop grid, and desktop `LiveDeskActivity` untouched. `MobileHeader` still returns `null` when `!isClient || !isMobile`.

## Testing

- Unit (Vitest): state-machine reducer tests — transitions per trigger, mutual exclusion of 4/5, dot restore target (returns to `ticket` if live data present, else `idle`).
- Existing tests must stay green; run `messages/message-usage.test.ts` if any i18n keys are added (ticket strings reuse existing `common` keys where possible; any new key lands in all five locales).
- Manual: verify with the `verify` skill flow — scroll down/up, tap ticket, open menu, route change closes menu, reduced-motion mode, safe-area on iOS simulator.

## Out of scope

- Desktop header changes.
- New live desk data sources or backend changes.
- Reader/auth flows beyond relocating `AuthSignature`.
