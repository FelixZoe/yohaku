# TTS Top Player (Hairline) + Idle FAB Removal — Design

Date: 2026-08-08  
Status: Approved  
Affects: `apps/web/src/components/modules/tts/`  
Parent: `docs/superpowers/specs/2026-08-08-tts-ui-redesign-design.md`  
Mockups: `.superpowers/brainstorm/83062-1786194166/content/`

## Problem

The desktop floating player still shows a **compact idle FAB** at bottom-right whenever the article body is in the viewport (`show = expanded || inView`). That leaves a permanent chrome corner even when the reader is not listening.

Removing the idle FAB without a replacement would leave **desktop discovery** thinner: only per-block gutter buttons (and mobile menu/capsule). Readers need a calm, in-article way to start whole-article narration without a floating rest-state control.

## Decision

1. **Desktop floating pill is session-only.** Render only when `status` is `loading` | `playing` | `paused`. Never when `idle`. Delete IntersectionObserver / idle-circle path.
2. **Restore an in-article top surface** as the primary idle entry, using **direction C · Hairline 余白**: no fill surface, bottom hairline only.
3. **Mobile surfaces unchanged** (capsule ticket/panel, drawer “朗读”, no floating player). Top hairline bar also renders on mobile for in-content discovery parity; capsule remains the sticky transport while scrolling.

This **revises** parent decisions #1–#2 (no top bar; idle reveal via scroll-in FAB). Mobile decisions #5–#6 stay.

## Visibility matrix

| State | `TtsTopPlayer` (hairline) | Desktop `TtsFloatingPlayer` | Mobile capsule / drawer |
|---|---|---|---|
| TTS unavailable | not mounted (provider short-circuit) | not mounted | no menu entry / no narrating UI |
| `idle` | yes — compact start row | **hidden** | drawer entry only |
| `loading` | yes — loading row | yes — expanded pill | existing capsule loading/narrating |
| `playing` / `paused` | yes — transport row | yes — expanded pill | existing capsule transport |
| stop / natural end → `idle` | compact row again | hide | capsule returns idle/ticket |

## Visual: top player (C · Hairline)

Placement: inside `TtsArticleProvider`, **before** `{children}` — top of article body (below post/note title + meta), same content width as Lexical prose.

### Idle

```
[ ○ ▶ ]  AI 朗读                    [内容有更新?]
──────── hairline ────────────────────────────
```

- Play control: `size-7` circle, `border border-border`, transparent fill, accent icon (`i-mingcute-volume-line` or play glyph). Not filled accent at rest (accent ≤ 5%; rest state stays quiet).
- Label: `text-copy-13` / secondary — strong “AI 朗读” (`tts.narration`), optional muted hint only if copy already exists; do not invent long marketing strings.
- Stale: when `ttsMeta.stale` / `s.stale`, trailing `text-label-12 text-warning` with new i18n key `tts.stale_warning` in **all five** locales (`en`, `ja`, `ko`, `zh`, `zh-TW`).
- Tap play (or whole control area if single button): `controls.toggle()` / `controls.start()` — same lazy-activate path as floating.

### Loading

- Play node becomes **filled accent** + spinner (`i-mingcute-loading-3-line animate-spin`).
- Label may show brief loading affordance (spinner alone is enough; avoid noisy copy).

### Playing / Paused

```
[ ● ❚❚ ]  0:42  ───●────  3/12  1.25x  [✕]
──────── hairline ──────────────────────────
```

Left → right:

1. Play/pause — filled accent when `playing`; ring style when `paused` (mirrors mockup).
2. Elapsed — `formatDuration(s.elapsed)`, `tabular-nums`, `text-neutral-7`, type token `text-label-12` (not banned `text-xs` if project enforces role+px; match floating player’s existing class if already shipped).
3. Thin progress — current **segment** `elapsed / duration` (existing atom fields). Track `bg-neutral-3`, fill `bg-accent`, height 3px, `rounded-full`, `flex-1`. **Not a scrubber** — display only (parent decision #3 retained).
4. Segment — `{current}/{total}` tabular.
5. Rate — cycle via `controls.cycleRate`, same rate list `[1, 1.25, 1.5, 1.75, 2]`.
6. Stop — `controls.stop()` → idle; FAB disappears.

**Not on top bar:** Recenter / auto-follow. That stays on the desktop floating pill only.

### Tokens / style (Yohaku)

- No card fill, no whisper shadow on the bar.
- Bottom border only: `border-b border-border` (or equivalent hairline).
- Vertical padding ~`py-2` / `pb-3` so it does not reflow the title block aggressively.
- Accent only on active play/pause (and progress fill while playing).
- Neutrals: tier rules — secondary text n-7, never n-5 for text.
- No hard drop shadows; no `neutral-50…950`.

## Desktop floating player cleanup

File: `TtsFloatingPlayer.tsx`

| Remove | Keep |
|---|---|
| `IntersectionObserver` + `inView` | Expanded pill UI |
| `show = expanded \|\| inView` → use `show = expanded` | `RootPortal`, position, glass pill styles |
| Compact idle FAB branch + styles | Play/pause, elapsed, segment, rate, recenter, stop |
| Stale warning dot on idle circle | — |

`expanded` definition stays: `playing | paused | loading`.

When `idle` or `!available` or `isMobile` or no `controls`: render `null` (with AnimatePresence exit when leaving session).

## Architecture

```
TtsArticleProvider (available only)
├── TtsHighlightBar
├── TtsTopPlayer          ← NEW (all viewports)
├── TtsFloatingPlayer     ← session-only desktop
└── {children}
```

State source: existing Jotai `ttsNarrationAtom` + `ttsControlsAtom` (already written by provider / playback hook). Top player does **not** need new context fields.

### New file

- `apps/web/src/components/modules/tts/TtsTopPlayer.tsx` — client component; reads atoms; renders hairline row.

### Modified

- `TtsArticleProvider.tsx` — mount `<TtsTopPlayer />`.
- `TtsFloatingPlayer.tsx` — session-only show + dead-code removal.
- `apps/web/src/messages/{en,ja,ko,zh,zh-TW}/tts.json` — add `stale_warning` (and any short loading string only if used).

### Unchanged

- `use-tts-playback.ts` engine, gapless preload, highlight auto-follow, block gutter, mobile capsule/drawer (except they continue to work with the same atoms).

## Edge cases

- **Unavailable TTS**: provider already returns children only — no top bar, no FAB.
- **Fetch error**: existing toast; status returns idle; top bar idle; FAB hidden.
- **Double-start**: existing activate + query guards.
- **Route change / article swap**: existing cleanup atoms + stop on urls change.
- **Playing while scrolled past top bar**: desktop FAB remains (session-only) — still the sticky transport. Mobile capsule remains sticky transport.
- **Reduced motion**: no required animation on top bar; floating exit/enter may keep soft spring or respect reduced motion if already wired.

## Testing

- Manual: idle article with TTS — top bar only, no bottom-right FAB; start from top bar → FAB appears; stop → FAB gone, top bar idle.
- Manual: gutter play still works; FAB appears when session active.
- Manual mobile: top bar + capsule/drawer still start/control playback.
- i18n: `messages/message-usage.test.ts` after new keys.
- Scope lint/typecheck to touched files only.

## Out of scope

- Whole-article duration estimate (“约 8 分钟”) unless already in API.
- Scrubbing / seek.
- Resume-from-last-position.
- Markdown (non-lexical) TTS path.
- New desktop header chrome.
- Changes to gapless engine or highlight physics beyond existing session behavior.
