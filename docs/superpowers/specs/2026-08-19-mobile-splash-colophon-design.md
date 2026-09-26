# Yohaku Mobile — Splash Colophon (Publication Identity)

Date: 2026-08-19
Status: approved
Scope: `apps/mobile` splash overlay colophon + native splash handoff.
Supersedes colophon sections of `2026-08-09-mobile-splash-animation-design.md`.

## Intent

The cold-start splash reads as **Innei's publication**, not a generic app logo
screen. The reverse-cut `白` mark remains the primary imprint; the owner is the
publisher, not a second logo system.

## Layout

- **Tear line**: screen vertical midpoint — upper and lower paper halves are
  equal height.
- **Mark (`白`)**: upper half, horizontally centred. Bottom edge sits
  `halfGap` (72 pt) above the tear.
- **Owner avatar**: lower half, horizontally centred, **same 76 pt box** as the
  mark, top edge `halfGap` below the tear — mirror symmetry across the seam.
- **Credit block**: centred column under the avatar — name, then site host in
  caption style. No leading em dash (`Innei`, not `— Innei`).

## Motion (unchanged beats)

Mark beats (洇, 落款) still run unconditionally. Colophon fades in from 240 ms
(window 240–440 ms), slightly ahead of the seal (340–500 ms). Tear still gates on readiness; breath-hold and 8 s ceiling
unchanged. On tear, the mark rides the upper half, the avatar and credit ride
the lower half — the publication identity leaves as two halves of one sheet.

## Assets

- **`splash-icon.png` / `splash-icon-dark.png`**: still `白` only (no seal, no
  avatar). Padded to 228×888 @3x with the glyph pinned to the top so Expo's
  centred native splash matches the JS mark position on a ~852 pt reference
  phone. Other heights may drift slightly.
- **`apps/mobile-overlay/owner-avatar.jpg`**: bundled cold-start avatar,
  exported through `yohaku-mobile-overlay/bundled-assets` (Metro only; Vitest
  uses a null stub). Network `avatarUrl` is fallback when no bundle asset exists.

## Code

- `src/theme/splash-timing.ts` — `halfGap`, removed `tearOffset` and corner
  colophon insets.
- `src/components/splash/splash-overlay.tsx` — centred tear, mirrored geometry.
- `src/components/splash/splash-colophon.tsx` — centred stack, bundled avatar.
- `apps/mobile-overlay/bundled-assets.ts` — closed-source avatar require.

## Non-goals

Changing tear duration/easing, warm-resume replay, or login-sheet mark usage.
