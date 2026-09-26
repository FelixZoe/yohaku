# Yohaku Mobile — Splash Animation Design

Date: 2026-08-09
Status: approved in brainstorming
Scope: `apps/mobile` (iOS). Extends `2026-08-09-yohaku-mobile-app-design.md`.

## Overview

Replace the hard cut between the native splash screen and the app with a
designed three-beat entry: the ink of the `白` mark settling into the paper, the
plum seal landing, and the splash sheet tearing open to reveal the app.

Today `app/_layout.tsx` returns `null` until fonts and Drizzle migrations
resolve, then calls `SplashScreen.hideAsync()`. The static native splash cuts
straight to `NativeTabs`.

The animation is **adaptive**: the mark beats play unconditionally (they need no
data), and only the tear is gated on readiness. Nominal duration 940 ms.

### Constraint that shaped the design

`expo-splash-screen` can only display a **static image**. The `白` mark is
therefore already on screen before JS takes over. There is no "mark appears from
nothing" beat available — the design is *existing mark → one living beat →
handoff*. The JS overlay must reproduce the native splash frame exactly, or the
handoff visibly jumps.

## Timeline

| Beat | Window (ms) | Motion | Easing |
| --- | --- | --- | --- |
| Still | 0–100 | Pixel-exact replica of the native splash: `白` only, no seal | — |
| 洇 (bleed) | 100–460 | Ink shadow `opacity .30→0`, `scale 1.075→1`; glyph `scale 1.014→1` | `bezier(.25,.7,.3,1)` |
| 落款 (seal) | 340–500 | Plum dot `opacity 0→1`, `scale 1.9→1`; overlaps the bleed tail by 120 ms | `bezier(.2,.7,.25,1)` |
| Breath-hold | 500–564 | Completed mark at rest | — |
| 掀纸 (tear) | 564–940 | Both paper halves slide off screen; mark rides the top half and fades | `bezier(.3,.55,.25,1)` |

The seal landing (t = 500 ms) fires one
`Haptics.impactAsync(ImpactFeedbackStyle.Soft)`.

App reveal carries **no** animation of its own. The real interface is exposed
as-is. (A parallax on the revealed content was prototyped and rejected: the app
root is `NativeTabs` backed by `UITabBarController`, so the underlying view tree
is UIKit and cannot be transformed from JS.)

### Tear geometry

- Mark box: 76 pt wide, centred — top edge at `centerY - 38`.
- Tear line: `centerY + 52`, i.e. 14 pt of breathing room below the mark box.
  The entire mark, seal included, therefore sits on the upper half and leaves
  *with the paper it is printed on* rather than fading in place.
- Both halves travel at **equal speed**: the top half covers `tearY` in 376 ms;
  the bottom half's duration is scaled by its shorter distance
  (`376 × (screenH − tearY) / tearY`). The bottom half starts 20 ms later, so
  the tear reads as opening downward from the seam.
- Mark opacity `1→0` over 200 ms starting at t = 604 ms (40 ms into the tear).

## Layer structure

Bottom to top:

```
NativeTabs                        real app; mounted only once ready
└ splash overlay (absolute fill, absorbs touches while playing)
  ├ top half     top:0  height:tearY   bg: paper   shadow on bottom edge
  │  ├ paper grain (tiled)
  │  └ mark box (positioned in SCREEN coordinates, not half-sheet coordinates)
  │     ├ ink shadow  = splash-icon.png, scale 1.075, opacity .30
  │     ├ glyph       = splash-icon.png, width 76
  │     └ seal        = View + borderRadius
  └ bottom half  top:tearY bottom:0    bg: paper   shadow on top edge
     └ paper grain (tiled)
```

Seal geometry derives from `assets/brand/mark.svg` (`cx 196.25, cy 195.5, r 10`
in a 256 viewBox), scaled to the 76 pt mark box: diameter 5.9 pt at
`left 55.3, top 55.1` within the box.

## State machine

A pure reducer over `(elapsed, ready, failed, reduceMotion)` drives the phases.
`ready` = `fontsLoaded && dbReady`; `failed` = `dbError !== undefined`.

- **`elapsed` counts from the moment the native splash is actually gone**, not
  from overlay mount. `SplashScreen.hideAsync()` plus its fade keeps the native
  image on screen for a few hundred ms after `RootLayout` mounts, and anything
  scheduled inside that window plays underneath it and is never seen. The clock
  starts when `hideAsync()` resolves *and* the Reduce Motion query has settled.
  (Measured on device: with the clock started at mount, the entire 洇 beat was
  swallowed and only the seal — which lands at 500 ms — made it to screen.)
- Mark beats run unconditionally; they never consult `ready`.
- The tear may begin when `elapsed ≥ 564` **and** (`ready` or `failed` or
  `elapsed ≥ 8000`) **and** `NativeTabs` has had two frames to paint. In effect
  the start time is `max(564, gateOpenedAt + 2 frames)`. Once started it is
  monotonic — it can never be un-started.
- **Paper breath-hold**: if the tear has not begun by `elapsed ≥ 800`, ease into
  a hold state — the two halves separate by 0.75 pt each (1.5 pt seam), sine
  in-out, 1200 ms half-cycle. The seam exposes desk colour; combined with the
  paper-edge shadows it reads as paper already under tension. Opacity is
  untouched. No spinner, no copy.
- When `ready` arrives during the breath-hold, cancel the repeat and run the
  tear **from the current seam width** — no snap back, no restart.
- 8 s ceiling: tear regardless and let the app's own empty/error state take
  over. `failed` tears immediately so the existing `dbError` screen is reachable.
- **Reduce Motion** (`AccessibilityInfo.isReduceMotionEnabled`): no bleed, no
  tear, no seal animation, no haptic. The overlay renders the completed mark
  with the seal already visible and fades out over 200 ms as soon as `ready`,
  `failed`, or the ceiling arrives — the 564 ms floor and the breath-hold do not
  apply, since there is no animation left to protect.
- **Cold start only.** The overlay mounts once and unmounts when done;
  `AppState` returning to foreground never replays it.

## Asset and configuration changes

- Regenerate `assets/images/splash-icon.png` and `splash-icon-dark.png` as
  **`白` only, without the plum dot**. The seal is the animation's payoff and
  must be born in JS. Second benefit: the ink-shadow layer reuses the same file
  scaled up, and with no dot baked in it cannot smear a pink ghost.
- The JS overlay renders **the same file** at width 76, centred —
  pixel-identical handoff by construction. Add
  `SplashScreen.setOptions({ fade: true, duration: 120 })` to absorb any
  residual seam.
- New `assets/images/paper-grain-{light,dark}.png` at 96 / 192 / 288 px
  (1x/2x/3x → a 96 pt tile), applied with `resizeMode="repeat"`. They are
  **opaque** tiles, not alpha noise over a flat colour: an alpha tile shifts the
  composited mean away from the flat colour the native splash paints, and that
  shift is exactly the handoff pop this design exists to avoid. Light is
  `#fdfcf9` multiplied by a one-sided `[0.9725, 1]` noise field (paper fibre
  absorbs, it does not emit); dark is `#242424` plus a `[0, 7/255]` field. σ ≈
  2/255 on both. The grain belongs to the **paper**, not to the ink — it lives
  on the two halves and leaves with them, so nothing about app rendering
  changes. This is what supplies the softness of the 洇 beat; blur is not used
  anywhere (established Yohaku rule). At the real mark size the 1.075 shadow
  fringe is under 2 pt wide, so a clean scaled duplicate under a grain field
  reads as bleed, not as double-print.
- `app.json` splash `backgroundColor` must equal the **measured mean** of the
  matching tile: light `#f9f8f5` → `#faf9f6`, dark `#141312` → `#282828`.
  Regenerating a tile means re-measuring and updating `app.json` and
  `sheetColor` in `splash-overlay.tsx` together. The tear reveals desk
  `#f0efeb` / `#141414`; paper-over-desk is the physically correct stack and
  matches the app's own surface vocabulary.
- Dark seal colour `#e095a4`, consistent with `assets/brand/mark-dark.svg`.

## Code structure

```
src/components/splash/
  splash-overlay.tsx        layers + Reanimated shared values
  use-splash-sequence.ts    hook wiring the reducer to timers and gates
  splash-sequence.ts        pure reducer + exported phase types
  splash-sequence.test.ts
src/theme/splash-timing.ts  every duration, delay, threshold, scale, opacity
                            and geometry constant — pure numbers, no imports
src/theme/motion.ts         `splashEasing`: the four curves
```

No component hardcodes a duration or curve, matching the existing motion
charter. The constants are split across two files on purpose: the reducer must
stay importable from plain node so `splash-sequence.test.ts` can run under
vitest, and `motion.ts` pulls in Reanimated. Numbers live in `splash-timing.ts`;
only the easings — which need `Easing` — live in `motion.ts`.

`app/_layout.tsx` changes:

- Mount `<SplashOverlay />` immediately. It depends only on PNGs, so it does not
  wait for fonts.
- Keep mounting `NativeTabs` only once `ready`, so the revealed interface is
  never mid-layout. After it mounts, wait two frames before starting the tear.
- The overlay is a sibling of `NativeTabs` inside a `flex: 1` root wrapper.

`src/screens/dev-demos/` gains a **Replay splash** entry that remounts the
overlay with an injectable ready-delay (0 ms and 1500 ms presets) so both the
fast path and the breath-hold can be tuned without cold-restarting.

## Testing

`splash-sequence.test.ts` covers the reducer only:

- `ready` before 564 ms → tear starts at exactly 564 ms.
- `ready` between 564 and 800 ms → tear starts immediately, breath-hold never
  entered.
- `ready` after 800 ms → breath-hold entered, then tear resumes from the current
  seam width.
- 8 s ceiling tears with `ready` still false.
- `failed` tears immediately at any point.
- `reduceMotion` bypasses bleed and tear, still honours the gate.
- Tear start is monotonic: no event sequence can rewind it.

No pixel or animation assertions. Visual verification is on-device via the
simulator workflow and the dev-demos replay entry.

## Risks — status after simulator verification

Verified on an iPhone 17 Pro simulator (iOS 26.5) by recording cold starts and
measuring frames rather than eyeballing them.

1. **Can an RN overlay cover the native tab bar? — CLEARED.** With the tear
   held artificially at 4 s, `NativeTabs` was mounted and laid out beneath the
   paper for four seconds and the bottom 7 % of the screen stayed perfectly
   uniform (pixel spread 0). Tab-bar chrome only appeared as the lower half
   slid clear. The deferred-mount fallback is not needed.
2. **Tile support — RESOLVED.** RN core `Image` with `resizeMode="repeat"` is
   what shipped; `expo-image` was not used for the grain.
3. **Handoff seam — CLEARED.** Across the native→JS handoff the ink-pixel count
   in the mark region moved by 2 px out of 3823, and the sampled paper colour
   did not change at all. `imageWidth: 76` and `width: 76` agree at 3x.
4. **940 ms — CONFIRMED on device.** Bleed measured 4.60→4.93 s (spec 360 ms),
   seal settled 4.97→5.07 s, tear ran 5.10→5.33 s with the seam landing at
   0.567 of screen height (spec 0.561). Retuning remains a taste call, but the
   implementation hits the specified numbers.

Still unverified: dark mode, Reduce Motion, real hardware, and the 8 s ceiling
path.

## Non-goals

Android, warm-resume replay, progress indicators or loading copy, a splash for
OTA update fetches, animated app icon / Icon Composer work.
