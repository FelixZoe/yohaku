# Yohaku Design Guideline

> 余白 — *less is more*. A constraint-based, token-first design contract for a personal blog. Two layers: **static tokens** owned by `@yohaku/design-system` + **runtime injections** owned by `apps/web`. Edit upstream, never duplicate.

This document is the top-level reference. Day-to-day work is governed by skills in `.claude/skills/yohaku-*.md`. When in doubt, follow the skill that matches the task.

---

## 1. Philosophy

| Principle | What it means |
|---|---|
| **Restraint** | Fewer tokens, stricter enforcement, fewer options. Decisions get clearer when the menu shrinks. |
| **Personal writing as metaphor** | The page is an unfolded letter. Elements lean handwritten over symmetric grid. |
| **CJK parity** | Every font / weight / line-height is tested with Chinese. CJK fallback is mandatory. |
| **Dark/light parity, not dark/light theming** | Same `text-neutral-N` classes work in both modes — `variables.css` auto-inverts. Don't add `dark:` for neutral text. |
| **Mechanical lint, human review** | `pnpm --filter @yohaku/design-system check` catches token drift, banned classes, hardcoded fonts. Hierarchy and semantics still need eyes. |

---

## 2. Architecture

```
@yohaku/design-system (packages/design-system, symlinked from yohaku-oss/)
├── src/tokens.css        ← canonical @theme blocks (colors, fonts)
├── CHEATSHEET.md         ← one-page quick reference
├── SKILL.md              ← AI routing rules for design tasks
├── references/           ← tokens, components, anti-patterns, mockup→react
├── templates/            ← scaffold.html + 9 snippets for static mockups
└── scripts/check.ts      ← drift + banned-class linter

apps/web/src/styles/
├── tailwindcss.css       ← @import 'tailwindcss' + design-system tokens + @utility blocks
├── variables.css         ← per-theme runtime vars (--bg-opacity, --surface-paper, --field-*)
├── theme.css             ← view-transition + ::selection
├── animation.css         ← scroll-driven keyframes (Hero parallax, Timeline reveal)
├── yohaku.css            ← state-machine layout (note paper unfold, drawer, fadeable sidebars)
├── layer.css             ← .page-glow-* radial layers
├── uikit.css             ← .uk-material-{thick,default,thin,ultrathin}
├── scrollbar.css, webfont.css, mask.css, print.css
└── index.css             ← entry; cascade order matters
```

**Cascade rule.** Token contracts ship from `@yohaku/design-system`. Web extends with runtime CSS variables, but never redeclares `--color-neutral-*`, `--color-accent` defaults, or font stacks. To add a token, edit `packages/design-system/src/tokens.css` and rerun `pnpm --filter @yohaku/design-system check`.

---

## 3. Color

### 3.1 Neutral scale (3 tiers, auto-inverting)

Light mode carries a warm parchment undertone (R > G > B); dark mode is pure neutral gray (R = G = B). Same Tailwind class works in both modes — never add `dark:text-neutral-N`.

| Tier | Token | Light | Dark | Allowed roles |
|---|---|---|---|---|
| Surface 1–4 | `--color-neutral-1..4` | `#f9f8f5` → `#d0cec6` | `#141414` → `#5c5c5c` | bg, fill, hover surface — **never text** |
| Border/icon 5–7 | `--color-neutral-5..7` | `#a8a69f` → `#5c5a55` | `#787878` → `#d0d0d0` | n-5: border only · n-6: icon stroke + small label (≤ `text-xs`) · n-7: secondary text/caption |
| Body/heading 8–10 | `--color-neutral-8..10` | `#403f3a` → `#141312` | `#e3e3e3` → `#f8f8f8` | n-9 is the **default body color** — reach here first |

**Banned**: Tailwind's default `neutral-50…950` palette anywhere in `templates/`. The verify script enforces.

### 3.2 Accent + semantic

| Token | Default | 名 | Use |
|---|---|---|---|
| `--color-accent` | `#c56473` | 梅 ume | Primary CTA, focus ring, blockquote bar. **≤ 5% surface coverage.** Overridden at runtime — see §6. |
| `--color-info` | `#3d6896` | 縹 hanada | Info state |
| `--color-success` | `#5e9f7e` | 若竹 wakatake | Success |
| `--color-warning` | `#a87a3d` | 朽葉 kuchiba | Warning, draft label |
| `--color-error` | `#a64953` | 蘇芳 suoh | Error, destructive |

### 3.3 Theme surfaces (runtime, not in tokens.css)

| Variable | Owner | Light | Dark | Use |
|---|---|---|---|---|
| `--color-root-bg` | `apps/web/styles/variables.css` (overridden by injectors) | `#fefefb` | `rgb(28,28,30)` | Solid root background |
| `--surface-paper` | variables.css | `var(--color-root-bg)` | `var(--color-neutral-2)` | Paper/card surface |
| `--bg-opacity` | variables.css | `rgba(254,253,251,0.72)` | `rgba(29,29,31,0.72)` | Translucent root |
| `--color-border` | variables.css | `rgba(24,24,27,0.1)` | `#3f3f46` | Default border |
| `--color-hair` | variables.css | `rgba(24,24,27,0.08)` | `rgba(255,255,255,0.1)` | Hairline divider |

---

## 4. Typography

### 4.1 Three font roles

| Variable | Stack head | Use |
|---|---|---|
| `--font-sans` | Inter (var) → Noto Sans SC → PingFang SC → system-ui | UI default, body |
| `--font-serif` | Noto Serif CJK SC → Source Han Serif → SongTi SC | Headings, prose, marginalia |
| `--font-mono` | OperatorMonoSSmLig → JetBrains Mono → Fira Code | Code, tabular numerals |
| `--font-logo-cjk` | Noto Serif JP → Source Han Serif | **Wordmark only** |
| `--font-logo-latin` | EB Garamond → GT Sectra → Tiempos | **Wordmark only** |

**Mandatory**: any font rendering CJK has `Noto Serif CJK SC` (or sans equivalent) in fallback. Hardcoding `font-family` outside `var(--font-*)` is a lint failure.

### 4.2 Scale (root `14px`)

| Class | px | Use |
|---|---|---|
| `text-xs` | 10.5 | Tiny metadata only |
| `text-sm` | 12.25 | Caption, secondary UI |
| `text-base` | 14 | UI default |
| `text-lg` | 15.75 | Lead paragraph, prose body |
| `text-xl` | 17.5 | Section title |
| `text-2xl` | 21 | H2, prose h1 |
| `text-3xl` | 26.25 | Hero h1 on detail pages |
| `text-4xl` | 31.5 | Largest hero |

### 4.3 Weight rules

| Context | Weight |
|---|---|
| Body | `font-normal` (400) |
| Heading | `font-medium` (500) — **never `font-bold` on CJK** (faux-stroke artifacts) |
| English uppercase eyebrow | `font-semibold` (600) acceptable |
| Line-height body | `1.5` |
| Letter-spacing body | `0.01em` (set on `html`) |
| Letter-spacing eyebrow | `tracking-[4px]` for `text-[9px]–text-xs` uppercase |

---

## 5. Spacing, Radius, Depth

### 5.1 Spacing (Tailwind v4, base 4px)

`gap-1` 4 · `gap-2` 8 · `gap-3` 12 · `gap-4` 16 · `gap-6` 24 · `gap-8` 32. Section breaks use `mt-14` (mobile) / `lg:mt-[80px]` (desktop). Article header bottom `mb-8` / `[&_header.prose]:mb-[80px]`.

### 5.2 Radius

`rounded` 4 · `rounded-md` 6 (default) · `rounded-lg` 8 (cards/inputs) · `rounded-xl` 12 (modals) · `rounded-2xl` 16 — **hero cap, never `rounded-3xl`** (reads decorative).

### 5.3 Depth — pick one

| Cue | When |
|---|---|
| `ring-1 ring-border` | Surface separation against same-tone parent. The default. |
| `shadow-[0_4px_24px_rgba(0,0,0,0.05)]` | "Whisper" card shadow. Subtle. |
| `.uk-material-{thick,default,thin,ultrathin}` | Glass surfaces — sticky header, popover, modal scrim. Pair with `bg-paper/80`. |

**Forbidden**: `shadow-lg`, `shadow-xl`, `shadow-2xl`. They make Yohaku look generic SaaS.

---

## 6. Runtime Theming

Static tokens describe the contract. Runtime injectors decide what each page actually looks like.

### 6.1 AccentColorStyleInjector — `apps/web/src/components/modules/shared/AccentColorStyleInjector.tsx`

- Server-renders one `<style id="accent-color-style">` in `<head>` per page.
- Picks one pair from 5 light/dark Japanese-color pairs (梅, 江戸紫, 鶯色, 代赭, 金茶).
- Outputs OKLCH `--color-accent` for both `[data-theme]` modes + `--color-root-bg` mixed at 0.4% (light) / 0.2% (dark).
- The default `#c56473` from `tokens.css` is the **fallback**, not the production value.

### 6.2 PageColorGradient — `apps/web/src/components/common/PageColorGradient.tsx`

- Server async component. Mount **once** per article/post/note/page detail.
- Hashes `seed` (e.g. `title + category.slug` for post; `topic.name` or `cover.accent` for note) → 12-stop SOFT_HUES list → final hue with ±12° jitter.
- Output: `<RootPortal><div class="page-glow-container"><div class="page-glow-accent" style="--accent-hue: H" /></div></RootPortal>` + a `<style>` overriding `--color-accent` for this view.
- Drives the warm "morning light" rake (0.15s) → ambient (0.4s) → seeded accent echo (0.7s) animation in `layer.css`.
- Disabled on Safari via `.is-safari { display: none !important; }` on `.page-glow-container` for compositing cost.

### 6.3 Yohaku state machine — `apps/web/src/styles/yohaku.css`

CSS variables are the source of truth; JS writes them, CSS responds. Don't gate behavior in JS class flags when a CSS variable will do.

| Variable | Values | Effect |
|---|---|---|
| `body[data-yohaku-state]` | `reading` · `anchored` · `closing` | Sidebar fade, paper scale |
| `body[data-yohaku-mode]` | `post` · `note` | Layout dimensions |
| `--yohaku-panel-w` | `Npx` | Drawer width |
| `--yohaku-anim-ms` | `520ms` default | Animation duration |
| `--yohaku-ease-paper` | cubic-bezier | Paper unfold easing |
| `:root[data-yohaku-dragging='1']` | flag | Skip transitions while dragging |

`yohaku-fadeable` class on a sticky sidebar respects `--yohaku-side-opacity-reading` (0 when reading, 1 otherwise).

### 6.4 flash highlights — `apps/web/src/components/modules/yohaku/flash.ts`

`flashRange(range, durationMs)` uses CSS Custom Highlight API (`CSS.highlights`) — no DOM mutation. Falls back silently on unsupported browsers. Color: `color-mix(srgb, var(--color-accent) var(--yohaku-flash-alpha, 38%), transparent)`.

---

## 7. Layout

### 7.1 Containers

| Component | Max-width | Padding | Use |
|---|---|---|---|
| `WiderContainer` | `max-w-5xl` / `2xl:max-w-6xl` | `px-2` mobile / `px-0` desktop | Posts list, thinking |
| `NormalContainer` | `max-w-3xl` / `2xl:max-w-4xl` | same | Note list, friends, timeline |
| `Paper` | content-driven | `p-8` mobile / `p-[30px_45px]` desktop | Article body with stacked-paper effect |
| `PaperWithEntrance` | same | same | Paper + stack-shift entrance (next sheet slides forward, text rides with it) |

All containers: `mx-auto`, top margin `mt-14` (mobile) / `lg:mt-[80px]` (desktop), `[&_header.prose]:mb-[80px]`.

### 7.2 Shell

```
<Root>
  <Header />               // sticky, 4.5rem tall, max-w-7xl, grid-cols-[4.5rem_1fr_4.5rem]
  <Content>{children}</Content>
  <Footer />
  <ClientOnly>
    <ScrollTop /> <FABContainer /> <RootDataAttributeBinder />
  </ClientOnly>
</Root>
```

`Content` adds `pt-[4.5rem]` for header offset.

### 7.3 Detail page composition

Four route families share a recipe:

1. **Color** — `<PageColorGradient seed={…} />` first.
2. **Provider** — `<CurrentPostDataProvider>` / `<CurrentNoteDataProvider>` / `<CurrentPageDataProvider>` wraps content.
3. **Container** — `WiderContainer` for lists, custom shell + `Paper` for details.
4. **Right sidebar** via `LayoutRightSidePortal` (sticky `top-[120px]`, hidden `<xl`, `yohaku-fadeable`).
5. **Comments** — `<BottomToUpSoftScaleTransitionView delay={500}><CommentAreaRootLazy /></...>` (delayed to avoid layout shift).
6. **Mobile FAB** — `TocFAB` for table of contents.

Notes additionally use a 3-column grid: `xl:grid-cols-[1fr_minmax(auto,60rem)_1fr]` with `NoteLeftSidebar` and 3D-stacked `PaperWithEntrance`.

### 7.4 Server vs client

| Layer | Strategy |
|---|---|
| `layout.tsx`, `page.tsx` | Server async (use `definePrerenderPage()` helper) |
| Providers | Mix — server containers, client context |
| Components | `'use client'` only for interactive/stateful/real-time |
| Dashboard | `force-static` + client SPA, isolated providers |

---

## 8. Components

`apps/web/src/components/` has four layers:

```
common/   theme injectors, error boundary, hydration detector, ClientOnly
ui/       primitives — 49 entries. Reuse beats reinvent. New = user approval.
modules/  domain features — post, note, comment, dashboard, home, …
layout/   shell — root, header, footer, container, dashboard
```

### 8.1 UI primitives — when in doubt, look here first

Form: `button`, `input` (basic + advanced), `textarea`, `label`, `checkbox`, `switch`, `select`, `auto-completion` · Display: `avatar`, `typography`, `divider`, `tag`, `text` · Container: `modal/stacked`, `sheet`, `float-panel`, `float-popover`, `portal`, `scroll-area`, `tabs`, `list` · Content: `markdown`, `markdown-editor`, `code-editor`, `code-highlighter`, `rich-content`, `gallery`, `media`, `link-card`, `rich-link`, `image` · Feedback: `toast` (sonner), `spinner`, `loading` (ink filter), `dropdown-menu`, `pagination`, `relative-time`, `number-transition` · Decoration: `background`, `transition`, `fab`, `viewport`, `back-to-top`, `banner`, `collapse`, `katex`, `excalidraw`, `react-component-render`.

### 8.2 Selection rules

| Surface | Pick |
|---|---|
| Confirm / quick prompt (≤1 field) | `<Dialog>` |
| Multi-field form / content viewer | `<Modal>` (focus-locked, drag-to-move desktop, sheet-drawer mobile) |
| Mobile bottom sheet / right-edge sheet | `<Sheet>` |
| Hover/click-anchored small content | `<FloatPopover>` |
| Action menu (items, checkboxes, radios) | `<DropdownMenu>` |
| State-mutating action | `<Button variant>` |
| Route navigation | `<Link>` (handles hover preview) |
| Static label | `<Tag>` (never a button) |

### 8.3 Conventions (codified in `yohaku-component` skill)

- `tailwind-variants` (`tv()`) for all variant systems — never inline string concatenation.
- `clsxm` from `~/lib/helper` for class composition.
- Forward refs on every interactive primitive.
- Inject CSS variables for theme-dependent fields: `var(--field-bg)`, `var(--field-border)`, `var(--field-shadow)`, `var(--field-gradient)`.
- Barrel `index.ts` per folder; export named components.
- `'use client'` at top of any file with hooks, motion, or DOM events.
- Inline sub-components in parent file unless > 80 lines; max 500 lines/file, 300 lines/component.

### 8.4 Window-scope global registry

`common/Global.ts` exposes `window.yohaku.{Button, useModalStack, ...}` for ad-hoc embeds (rich-content shadow DOM, console scripts). When adding a new public primitive, register it here.

---

## 9. Motion

### 9.1 Spring presets — `apps/web/src/constants/spring.ts`

```ts
microReboundPreset    { type: 'spring', stiffness: 300, damping: 20 }
softSpringPreset      { duration: 0.35, type: 'spring', stiffness: 120, damping: 20 }
softBouncePreset      { type: 'spring', damping: 10, stiffness: 100 }
MODAL_EASING          [0.22, 1, 0.36, 1]
```

Reach for these. Inline transition objects are a code-review smell.

### 9.2 Transition factory — `ui/transition/factor.tsx`

`createTransitionView(options)` produces a memoized component with preset enter/exit. Existing views: `BottomToUpTransitionView`, `BottomToUpSoftSpringTransitionView`, `BottomToUpSoftScaleTransitionView`, `FadeInOutView`, `ScaleTransitionView`, ... All accept `delay`, `lcpOptimization`.

### 9.3 Stagger pattern

```tsx
let animIndex = 0
items.map(item =>
  <BottomToUpSoftSpringTransitionView delay={animIndex++ * 60} lcpOptimization>
    {item}
  </>
)
```

### 9.4 Modal choreography

Entry: `scaleY 0.8→1, opacity 0→1` (300 ms). Backdrop modulation: non-top stack scales to `0.93` with `brightness(0.5)`. Exit: `0.8` again (200 ms). Mobile auto-switches to `<Sheet>` drawer.

### 9.5 Layout-id transitions

Use `layoutId="note-{id}"` / `layoutId="header"` for shared-element animation across views. Naming must be unique and stable.

### 9.6 Reduced motion

`@media (prefers-reduced-motion: reduce)` in `animation.css` and `yohaku.css` either disables or shortens by 40%. **Mobile drops 3D perspective** — no `rotateX`, no `[perspective:Npx]`.

### 9.7 View / scroll timeline

`Hero parallax`, `SecondScreen unfold`, `Timeline reveal`, `Windsock snap` use CSS `animation-timeline: view()`. `@supports` feature-detected; Safari fallback shows immediately. All keyframes live in `animation.css`.

---

## 10. Anti-patterns — fail-fast list

### Color
- ❌ `text-neutral-500` → ✅ `text-neutral-7` (Tailwind palette banned)
- ❌ `text-neutral-5` for body → ✅ `text-neutral-9` (n-5 invisible as text)
- ❌ inline `style={{ color: '#242424' }}` → ✅ `text-neutral-9`
- ❌ multiple accent CTAs in one fold → ✅ one CTA per major section (≤ 5% surface coverage)

### Typography
- ❌ `<strong class="font-bold">中文</strong>` → ✅ `font-medium`
- ❌ `font-family: Charter, Georgia` → ✅ `var(--font-serif)`
- ❌ body at `text-xs` → ✅ `text-sm` minimum

### Layout
- ❌ `shadow-lg`/`xl`/`2xl` → ✅ `ring-1 ring-border` or whisper shadow
- ❌ borderless on borderless → ✅ add ring
- ❌ `rounded-3xl` → ✅ `rounded-2xl` cap

### Components
- ❌ reinvent dropdown/modal/toast → ✅ check `ui/` first; new = user approval
- ❌ "modal that's also a sheet" → ✅ pick one surface type per context
- ❌ accent for active nav / dropdown hover → ✅ neutral-9 + `bg-white/55` or `bg-black/[0.02]`
- ❌ `rounded-full` on nav containers → ✅ removed pill shape; use straight bar
- ❌ `backdrop-blur` on dropdown popups → ✅ solid surface

### Process
- ❌ edit `tokens.css` to make a class work → ✅ propose spec change first
- ❌ fix `pnpm --filter design-system check` failure by suppressing → ✅ fix the root cause

---

## 11. Verification

```bash
pnpm --filter @yohaku/design-system check    # tokens + templates + cheatsheet drift
pnpm --filter @yohaku/web lint               # ESLint + typecheck on changed files
```

`scripts/check.ts` enforces:

1. Banned `(text|bg|border|ring|fill|stroke|from|to|via)-neutral-(50|100|…|950)` in `templates/`.
2. Raw hex in inline `style="…"` outside `#fff`/`#000`.
3. Hardcoded `font-family:` not starting with `var(` or `inherit`.
4. Hex drift between `CHEATSHEET.md` and `src/tokens.css`.

Manual review still covers: inline `style={{}}` in TSX, accent overuse (5% rule), `font-weight: bold` on CJK, comment/docs drift.

---

## 12. Skill index

When working in this codebase, invoke the matching skill before editing.

| Skill | When |
|---|---|
| `.claude/skills/yohaku-component/SKILL.md` | New or modified UI primitive in `apps/web/src/components/ui/` |
| `.claude/skills/yohaku-page-layout/SKILL.md` | New page, route, container, sidebar, App Router work |
| `.claude/skills/yohaku-motion/SKILL.md` | Animation, transition, scroll-driven effects |
| `.claude/skills/yohaku-runtime-theming/SKILL.md` | Accent color, gradient, paper surface, yohaku state vars |
| `.claude/skills/yohaku-module-composition/SKILL.md` | Domain modules — post, note, page, thinking, comment |
| `packages/design-system/SKILL.md` | Static mockup design, mockup→React handoff, token audit |

---

## 13. Quick reference

**Default body**: `text-neutral-9` · **Heading**: `text-neutral-10 font-medium` · **Caption**: `text-neutral-7` · **Card**: `bg-neutral-2 ring-1 ring-border rounded-lg p-4` · **Primary CTA**: accent fill, white text · **Secondary**: `bg-neutral-2 hover:bg-neutral-3 text-neutral-9 ring-1 ring-border` · **Tag**: `bg-neutral-2 text-neutral-7 text-xs px-2 py-0.5 rounded-md` (or `<Tag>`) · **Code**: `bg-neutral-1 ring-1 ring-border rounded-md font-mono text-sm` · **Blockquote**: 4px accent left bar + `text-neutral-7` · **Divider**: `bg-neutral-3 h-px` or `1px solid var(--color-border)`.
