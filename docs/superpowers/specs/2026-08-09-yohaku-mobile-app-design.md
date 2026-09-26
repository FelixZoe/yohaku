# Yohaku Mobile (iOS) — Design

Date: 2026-08-09
Status: approved in brainstorming, navigation architecture revised during implementation

## Overview

A new Expo app `apps/mobile` (`@yohaku/mobile`) in the Yohaku monorepo: an iOS
reader client for the blog with visitor sign-in and interactions (comments,
likes), targeting a public App Store release. v1 content surfaces: posts (博文),
notes (手记), thinking (思考). Content reading is offline-first; interactions
are online-only.

## Stack & shell

- Expo (latest stable SDK at implementation time), TypeScript, expo-router,
  New Architecture, dev client (no Expo Go), EAS Build/Submit. iOS only —
  iOS-specific capabilities are allowed freely (SF Symbols via `expo-symbols`,
  `expo-blur`, haptics, context menus).
- Deployment target iOS 18.0. iPhone portrait only — no iPad layouts, no
  landscape. OS-gated visuals (e.g. Liquid Glass materials) degrade to
  blur-based equivalents on iOS 18–25. On iOS 26+, scroll surfaces pair
  ScrollView with a transparent header and the system soft scroll-edge
  effect.
- Identifiers: bundle id `in.innei.yohaku`, Apple team `WL5WKKJG77` (wired
  into app config / EAS).
- pnpm monorepo: Metro needs the standard monorepo config (watchFolders +
  resolver against the workspace root).
- **Native code organization**: a single Expo local module named `Yohaku`
  (`apps/mobile/modules/yohaku/`) owns all Swift code, organized by domain
  subdirectories (first domain: the tab-bar/navigation chrome; later
  domains land beside it). No scattered one-off native modules. The pod is
  named `YohakuKit` (a pod named `Yohaku` collides with the app product
  path); the JS-facing module name stays `Yohaku`. Adding a Swift file to
  the module requires re-running `pod install` — the Pods project fixes
  source lists at install time.

## Identity — app icon and logo

The mobile identity extends the established Yohaku wordmark rather than
introducing a separate app-only brand. The formal wordmark remains the
serif `余白 / yohaku` composition from `yohaku-oss`.

The app mark is the reverse-cut `白` monogram on neutral-9 ink. A single plum
dot sits in the lower-right margin as an editorial annotation: it connects the
mark to the product accent while keeping the dominant idea as negative space.
The iOS Icon Composer asset keeps the ink field as the system-managed fill and
the mark as one foreground layer. The fallback 1024 px icon is flat and opaque;
light and dark splash marks are transparent and use their matching token colors.

## Navigation — compact system tab bar

The section switcher is Expo Router `NativeTabs`, backed by the system
`UITabBarController`, holding four glyphs: 博文 / 手记 / 思考 / 我. Labels are
visually hidden for the compact footprint but retained as accessibility labels.
The selected glyph uses the accent (梅 in light, inverted accent in dark).

UIKit owns the tab bar view, Liquid Glass material, selection morphing,
safe areas, and accessibility. Scroll-driven minimization is explicitly
disabled, so the bar retains its compact configured size while lists scroll.
The `Yohaku` native
module attaches to the existing controller and applies a uniform `0.82`
Core Animation sublayer scale. Width, height, glyphs, and the selection capsule
therefore keep the original system proportions. The `UITabBar` frame is not
changed, so native safe-area calculations and full-size accessibility hit
regions remain intact. It must not hide, replace, resize the frame, or overlay
the system `UITabBar`. iOS 26 uses the system Liquid Glass implementation;
iOS 18–25 keep the corresponding native tab-bar appearance.

Every top-level scrolling surface uses the shared `EdgeEffectScrollView`. It
binds `ScrollViewMarker` directly to the mounted RN `ScrollView`, because the
Stack-level one-shot discovery can run before the ScrollView exists. A
transparent native-stack header supplies UIKit's top overlay edge; its standard
44-point navigation-bar inset is compensated while retaining the status-bar
inset. This produces the system soft edge at both top and bottom without adding
a custom blur overlay.

Each section is an independent list page (visual language: see Native
tonality below):

- Serif large title (web serif chain); entries are paper cards with
  eyebrow (category), serif title (medium weight — never bold for CJK),
  excerpt, meta line.
- Posts list: eyebrow, title, excerpt, relative time · word count · likes.
- Notes list: title, mood/weather meta.
- Thinking: the feed itself is the content — text blocks (no titles) with
  relative time; no detail screen, comments open in a half sheet.
- 我 (Me): auth state, appearance, about, privacy policy / terms links,
  account deletion entry.

Detail screens (post/note) push onto the stack; the tab bar recedes on detail
screens but does not minimize while a root list scrolls.

## Data layer — offline-first

The local database is the single source of truth for content; the network is
only a synchronizer. UI never renders from fetch responses directly.

- **Store**: SQLite via `expo-sqlite` + Drizzle ORM (same ORM family as
  mx-core). List and detail screens read through Drizzle `useLiveQuery` and
  react to local writes.
- **Tables**: `posts`, `notes`, `thinkings`, `categories`, `sync_meta`
  (per-collection watermark/cursor). Article bodies are stored in the DB —
  anything synced or previously opened reads fully offline.
- **Sync engine** (pull-based): runs on cold start, foreground return, and
  pull-to-refresh. Delta sync by `modified` watermark where the API supports
  it; otherwise upsert from the first list page(s). Opening an article fetches
  and persists its body; the engine also prefetches the latest 20 bodies per
  section in the background so recent content is readable offline.
- **Responsibility split**: content (three sections) = SQLite, offline-first;
  interaction data (comments, like counts, session) = TanStack Query,
  network-first, no offline ambition. Mutations (comment, like) are
  online-only in v1. Jotai for UI state; MMKV for preferences.
- Offline: content reads normally; interaction areas show an offline
  placeholder.

## Body rendering — one DOM component, shared web renderer

Post/note bodies are serialized Lexical JSON with custom biz nodes (alert,
banner, chat, poll, KaTeX, Shiki code blocks, excalidraw, …). No native
Lexical renderer is written. Instead:

- Detail screen chrome is native: title, meta bar, action bar, comments — same
  typographic language as the lists.
- The body is a single `'use dom'` Expo DOM component that runs
  `@haklex/rich-static-renderer` plus the Yohaku node overrides. The overrides
  currently living in `apps/web/src/components/ui/rich-content/` are extracted
  into a shared workspace package `packages/rich-content`
  (`@yohaku/rich-content`) consumed by both web and mobile (the "export
  common UI from the web renderer" move). Full node fidelity — KaTeX, Shiki,
  polls, embeds — for free, and zero drift when haklex adds nodes.
- The DOM component sets `scrollEnabled: false`, measures its own height, and
  reports it through a native action so the outer native ScrollView owns
  scrolling. Scroll feel stays native.
- Bridged actions (async function props): `onLinkPress` (internal links route
  via expo-router to native screens; external links open in-app browser),
  `onImagePress` (native lightbox with image list + index), `onHeightChange`.
  Theme (light/dark + accent) flows in via serializable props.
- Renderer JS, KaTeX/Shiki assets, and fonts are bundled into the component —
  body rendering works offline; only body images need network on first view.
- Known risk, accepted: a very long article is one tall WKWebView. Memory and
  first-paint must be validated on device; the escape hatch is letting the DOM
  component own its scrolling inside the native shell.

## Auth & interactions

- **Sign-in**: better-auth Expo plugin — app scheme `yohaku://` deep-link
  return, session in SecureStore. Social providers reuse the existing
  GitHub/Google config.
- **mx-core companion changes** (required):
  1. Add the Apple social provider — App Store guideline 4.8: offering
     third-party login requires Sign in with Apple.
  2. Add the app scheme to better-auth `trustedOrigins`.
  3. Mount better-auth's Expo server plugin.
- **Comments**: threaded view on post/note detail and thinking half-sheet;
  signed-in visitors reply via the existing comment API (TanStack Query,
  network-first).
- **Likes**: posts, notes, thinking, via existing endpoints. Counters render
  with the SlotText flip component.

## App Store compliance

- Sign in with Apple alongside GitHub/Google (above).
- UGC (guideline 1.2): long-press a comment → report; owner-side moderation
  already exists in mx-core.
- Settings page links privacy policy and terms.
- In-app account deletion (Apple requirement once accounts exist) — mx-core
  exposes reader-account deletion (better-auth user delete).
- No tracking, no third-party analytics → clean App Privacy labels, no ATT
  prompt.

## Native tonality — paper on desk

The app does not reuse the web's flat print layout language. Hierarchy is
expressed through native depth, with the paper metaphor made physical:

- **Desk**: the screen ground is warm neutral (n-2 → n-3 subtle gradient).
- **Paper**: every content unit (list entries, detail sheet) is a raised
  paper card (`#fdfcf9`-class surface, ~18px corners, dual-layer whisper
  shadow). Opening an article morphs its card into the full page. All
  rounded surfaces use iOS continuous corners (`borderCurve: 'continuous'`).
- **Wells**: interactive input surfaces sink instead of float — pressed
  depressions in the desk (inset shadow). Content floats, input sinks.

### Component vocabulary

- **Text roles**: serif (web serif chain) has exactly one job — titles (section
  large title ~28, entry title ~19). All other UI text is system sans:
  body 16, secondary 13.5, meta 12, letterspaced eyebrow 10. Never bold CJK.
- **Button**: primary = ink fill (n-10 background, paper text, radius 14) —
  the 梅 accent is never a primary button surface; it is reserved for states
  (liked, focus ring, selection). Secondary = paper card button; quiet =
  text-only; counters = paper pills (♡ 42).
- **Input**: desk well (inset shadow, radius 12); focus = accent hairline
  ring, no border otherwise.
- **Segment control**: well track + sliding paper thumb with spring.

### Motion charter

- Press = physical sink: scale ~0.96 + shadow tightens + light haptic. Never
  opacity flicker. Release settles critically damped — zero visible bounce.
- Sliding elements glide (dampingRatio ≥ 0.95, response < 320ms); rolling
  text is plain ease-out. Nothing in the app visibly bounces (owner taste,
  confirmed on device).
- Number/status changes = SlotText flip (signature, Reanimated).
- List → detail = paper-card morph expansion, gesture-interruptible.
- Fades are for content loading only, never for interaction feedback.

### Token & font bridge

- `@yohaku/design-system` gains a native token export (`tokens.ts` mirroring
  `tokens.css`: neutral 1–10, accent, semantic colors, type scale) plus the
  paper/desk/well surface and shadow recipes above. The package `check.ts`
  verifies css ↔ ts parity so the contract cannot drift.
- Fonts: same faces as web — sans = Inter (bundled; CJK falls through to
  PingFang SC), serif titles = the web serif chain (Noto Serif CJK SC,
  bundled subset), mono stays inside the DOM renderer via the web stack.
- Icons: SF Symbols (`expo-symbols`) + Lucide as the two icon sources.
- Dark mode follows the system; the neutral scale inverts semantically exactly
  as on web (desk darkens, paper becomes the lifted dark surface). Accent
  stays ≤ 5% of any surface.

## Error handling

- Sync failure: silent retry with backoff + a thin status line atop lists.
- Body fetch failure: show the cached copy if present, otherwise retry
  affordance.
- Interaction failure: toast.
- DOM renderer crash: fallback card "在网页中打开" deep-linking to the web
  page.
- Per-screen error boundaries.

## Testing

- Vitest (consistent with the workspace — not jest-expo). Focus on pure
  logic: sync-engine merge/watermark behavior, DB query layer (drizzle against
  an in-memory sqlite driver), link-routing helpers, DOM-component prop
  contracts.
- Renderer regression: a set of real article Lexical JSON fixtures rendered
  through the shared renderer package.
- No E2E in v1 (Maestro later if needed).

## Build sequence (v1 kickoff order)

1. **Scaffold**: `apps/mobile` Expo app, Metro monorepo config, expo-router
   shell, token bridge, identifiers, iOS 18.0 target.
2. **Base components**: Text roles, Button tiers, Input well, Segment,
   paper/desk/well primitives, SlotText, press-sink interaction hook.
3. **Component catalog screen**: a Storybook-style dev page listing every
   base component in all states (light/dark) for tuning on device. Route
   must avoid the repo's gitignored `dev/` pattern — name it `dev-demos`
   (or similar), matching the web app's convention.
4. **Compact native tab bar**: Expo Router `NativeTabs` owns the system
   `UITabBarController`; the `Yohaku` module uniformly scales its native render
   tree while preserving its frame and accessibility geometry. Disable system
   iOS 26 scroll minimization and bind soft scroll-edge effects through the
   shared scrolling surface, then add the four RN section shells.

Data layer, sync, DOM renderer, auth, and detail screens follow after this
foundation, ordered in the implementation plan.

## Non-goals (v1)

Search (Algolia), dashboard/management features, push notifications, Socket.IO
realtime, Android, iPad layout, offline mutation queue.
