# Seasonal Background Design Spec

User-approved rules for every component in this directory. A background that
violates rule 1 or 2 gets rejected regardless of craft — this has happened
(Tsubaki large blossoms, Higanbana rooted clusters, Tsukimi moon + grass,
Cumulus clouds, Tsubame birds were all cut for being "pictures").

## The seven rules

1. **Atmosphere, not picture.** A background depicts weather, light, or drift —
   never a nameable object or scenery. Banned: ground lines, horizons, rooted
   plants, celestial discs (moon/sun), animals, large individual flowers. The
   season is conveyed only through hue family, particle density, and motion.
2. **Full-field distribution.** Elements scatter across the whole viewport.
   No anchored composition, no edge-grown clusters, no focal subject. Diffuse
   light fields (Komorebi) are fine; shaped light sources (a moon disc) are not.
3. **Element size.** Base size typically 8–36 px, hard max 44 px (the
   AutumnLeaves near-layer cap). Reference ranges: Snow 4–22, Sakura 8–36,
   AutumnLeaves 14–44. Larger elements must be sparser and blur-softened (DoF).
4. **Restraint.** Single-element peak alpha ≤ ~0.7 (nearest layer only; most
   elements 0.25–0.5). Instantaneous screen coverage stays low. Overlay test:
   body text on top of the background must never have a recognizable shape
   behind a paragraph.
5. **Motion without events.** Continuous slow drift. Small, dim accent events
   are allowed (DiamondDust glints, Kazahana gusts); large-area or
   high-brightness events are not. Density may breathe on a ≥15 s period at
   subtle amplitude.
6. **One hue family per background,** receding toward the page surface —
   light theme reads as pale ink on paper, dark theme as faint glow in night.
7. **Performance.** dpr capped at 2, particle counts capped and scaled with
   viewport area, geometry/sprites pre-generated (per resize), rAF loop with
   dt clamp, full cleanup on unmount.

## House component pattern

`'use client'`; named export `XxxBackground` + exported `XxxBackgroundProps`
(`density` / `speed` / `intensity` all defaulting to 1, plus extras as needed);
`useIsomorphicLayoutEffect` + `isClientSide` resize handling; `propsRef` for
live prop reads inside the loop; canvas className
`pointer-events-none fixed inset-0 z-0 size-full`. Canvas 2D for sprite/vector
particles, WebGL fullscreen shader for surface textures (Minamo), WebGPU
instanced quads for SDF-drawn petals (Sakura/Wisteria — must render null when
WebGPU is unavailable). Theme-adaptive components read `useIsDark` rather than
receiving a theme prop.

## Seasonal wheel (design of record)

Implemented in `BackgroundTexture.tsx` as the table-driven `SEASON_PRESETS`
(pools of presets per slot; a pool with several entries is sampled once per
mount).

| Slot | Period | Light | Dark |
|---|---|---|---|
| Deep winter | Dec 1 – Jan 31 | DiamondDust | Snow |
| Late winter | Feb 1 – Mar 10 | Ume (snow-plum mix) | Kazahana |
| Spring | Mar 11 – Apr 15 | Sakura | Sakura |
| Late spring | Apr 16 – May 31 | Wisteria | Wisteria |
| Early summer | Jun | Ajisai | Firefly |
| High summer | Jul 1 – Aug 31 | Komorebi / Minamo (pool) | Firefly / Hanabi (pool) |
| Early autumn | Sep 1 – Oct 15 | Kinmokusei (day tuning) | Kinmokusei (night tuning) |
| Late autumn | Oct 16 – Nov 30 | AutumnLeaves | AutumnLeaves |

Hanabi is the one user-approved exception to rule 5 (localized, dim, rare
bursts). Not wired into the wheel: ParticlePhysics (demo-only since the wheel
became exhaustive). Cut and deleted: Aoba, Cumulus, Tsubame, Tsubaki,
Higanbana, Tsukimi. `(dev)/backgrounds` is the review bench for all of this.
