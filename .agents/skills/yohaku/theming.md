# Runtime Theming

> Runtime CSS variable injection. Static tokens in `@yohaku/design-system/src/tokens.css`; runtime overrides in `apps/web`.

## Two-layer mental model

```
@yohaku/design-system/src/tokens.css
  └── @theme blocks: --color-neutral-*, --color-accent (default), --color-info|success|warning|error,
                     --font-sans|serif|mono, --font-logo-*

apps/web/src/styles/variables.css
  └── per-theme: --color-root-bg, --surface-paper, --bg-opacity, --color-border, --color-hair, --field-*

apps/web (runtime <style> injection)
  ├── AccentColorStyleInjector  → overrides --color-accent + --color-root-bg site-wide
  ├── PageColorGradient         → overrides --color-accent for one page; emits --accent-hue
  └── flash.ts                  → injects ::highlight(yohaku-flash) CSS once
```

**Rule**: When you need a value to vary per page or per user, it goes through a runtime injector. When it's stable across the site, it goes in `@yohaku/design-system/tokens.css` or `apps/web/src/styles/variables.css`.

## AccentColorStyleInjector — site-wide accent

Source: `apps/web/src/components/modules/shared/AccentColorStyleInjector.tsx`. Mounted in `apps/web/src/app/[locale]/layout.tsx` `<head>`. One per request.

Picks a random pair from 5 light/dark Japanese-color pairs:

| 名 | Light | Dark |
|---|---|---|
| 梅 ume | `#C56473` | `#E095A4` |
| 江戸紫 edomurasaki | `#745399` | `#A088BB` |
| 鶯色 uguisu | `#76712C` | `#ACA559` |
| 代赭 taisha | `#9C5728` | `#C7864F` |
| 金茶 kincha | `#C87833` | `#E2A06A` |

Emits OKLCH `--color-accent` for both modes. Emits `--color-root-bg` mixed at 0.4% (light) / 0.2% (dark). Tags the `<style>` with `data-light` / `data-dark` attrs.

**To change the palette**:
1. Edit the `accentColorLight` / `accentColorDark` arrays in `AccentColorStyleInjector.tsx`.
2. Update `packages/design-system/src/tokens.css` `--color-accent` default if the brand fallback should change.
3. Update `CHEATSHEET.md` if the canonical accent moves.
4. Run `pnpm --filter @yohaku/design-system check`.

## PageColorGradient — per-page seeded accent

Source: `apps/web/src/components/common/PageColorGradient.tsx`. Server async component.

**Mount once per detail page**, near the top of the tree (before any consumer reads `--color-accent`):

```tsx
<PageColorGradient seed={`${title}-${category.slug}`} />   // post
<PageColorGradient baseColor={topic.hue ?? cover.accent} /> // note (color from cover image)
<PageColorGradient seed={`${title}-${subtitle}`} />        // page
```

**Hue algorithm** (`apps/web/src/lib/glow.server.ts`):
```
SOFT_HUES = [25, 35, 45, 85, 200, 220, 270, 340, 15, 160, 20, 120]
hash      = hashString(seed)
baseHue   = SOFT_HUES[hash % 12]
offset    = ((hash >> 8) % 24) - 12          # ±12° jitter
finalHue  = (baseHue + offset + 360) % 360
```

Mix ratios: light `0.0015`, dark `0.00075` — extremely subtle.

**Glow choreography** in `apps/web/src/styles/layer.css`:

| Layer | Delay | Effect |
|---|---|---|
| `.page-glow-container::before` | 0.15 s | Warm "morning light" rake from top-left |
| `.page-glow-container::after` | 0.4 s | Ambient left-edge fade |
| `.page-glow-accent` | 0.7 s | Hue echo (right side) |

Safari: `.is-safari .page-glow-container { display: none !important; }` — JS injects `is-safari` class to bail on compositing-heavy mask.

## variables.css — per-theme runtime variables

Source: `apps/web/src/styles/variables.css`. Light defaults in `:root`, dark overrides in `[data-theme='dark']`.

| Variable | Light | Dark | Use |
|---|---|---|---|
| `--color-root-bg` | `#fefefb` | `rgb(28,28,30)` | Solid root bg (overridden by injectors) |
| `--surface-paper` | `var(--color-root-bg)` | `var(--color-neutral-2)` | Paper/card surface |
| `--bg-opacity` | `rgba(254,253,251,0.72)` | `rgba(29,29,31,0.72)` | Translucent root |
| `--color-border` | `rgba(24,24,27,0.1)` | `#3f3f46` | Default border |
| `--color-hair` | `rgba(24,24,27,0.08)` | `rgba(255,255,255,0.1)` | Hairline divider |
| `--field-bg` / `--field-border` / `--field-shadow` / `--field-gradient` | … | … | Form input styling |
| `--ease-spring` | 82-point `linear()` spline | — | Spring easing matching Motion |

When you add a new theme-aware variable, declare both light and dark.

## yohaku.css — state-machine layout

Source: `apps/web/src/styles/yohaku.css`. CSS variables on `body` are the source of truth; JS writes them, CSS responds.

| Variable | Values | What it controls |
|---|---|---|
| `body[data-yohaku-state]` | `reading` · `anchored` · `closing` | Sidebar fade, paper scale |
| `body[data-yohaku-mode]` | `post` · `note` | Layout dimensions |
| `--yohaku-panel-w` | px length | Drawer/panel width |
| `--yohaku-anim-ms` | `520ms` default | Animation duration |
| `--yohaku-ease-paper` | cubic-bezier | Unfold easing |
| `--yohaku-side-opacity-reading` | `0` / `1` | Sidebar visibility in reading mode |
| `:root[data-yohaku-dragging]` | `'1'` flag | Skip transitions while dragging |

Class `yohaku-fadeable` on a sidebar element fades it out when reading. Add it; CSS does the rest.

Don't gate behavior in React. Write state to `body.dataset.yohaku<X>` (centralized in `RootDataAttributeBinder`), let `yohaku.css` style it.

## Cascade order

`apps/web/src/styles/index.css`:
```css
@import './tailwindcss.css';      /* Tailwind v4 + design-system tokens + custom utilities */
@import './variables.css';        /* per-theme runtime vars */
@import './scrollbar.css';
@import './print.css';
@import './theme.css';            /* view-transition, ::selection */
@import './webfont.css';
@import './mask.css';
@import 'react-photo-view/dist/react-photo-view.css';
```

`tailwindcss.css` internally:
```css
@import 'tailwindcss';
@import 'tw-animate-css';
@config "../../tailwind.config.ts";
@source "./src/**/*.{js,jsx,ts,tsx}";
@plugin "@tailwindcss/typography";

@import './loading.css';
@import './checkbox.css';
@import './layer.css';
@import './animation.css';
@import './image-zoom.css';
@import './yohaku.css';

@import '@yohaku/design-system/tokens.css';   /* last — upstream tokens */
```

Runtime `<style>` tags land in `<head>` after all imports and win via insertion order or `:root` selector specificity.

## Anti-patterns

- ❌ Overriding `--color-accent` in component CSS → ✅ override only via the two injectors
- ❌ Hardcoding accent hex → ✅ `var(--color-accent)`
- ❌ Storing layout state in JS class flags → ✅ `body.dataset.yohaku<X>`
- ❌ Mounting `PageColorGradient` in a layout that wraps multiple page types → ✅ mount in the page itself
- ❌ Editing `tokens.css` to fix a Tailwind class → ✅ propose spec change first
- ❌ Bypassing `colorjs.io` for OKLCH conversion → ✅ use the helper

## Source files

- `apps/web/src/components/modules/shared/AccentColorStyleInjector.tsx`
- `apps/web/src/components/common/PageColorGradient.tsx`
- `apps/web/src/lib/glow.server.ts`
- `apps/web/src/styles/variables.css`
- `apps/web/src/styles/yohaku.css`
- `apps/web/src/styles/layer.css`
- `apps/web/src/styles/index.css`
- `packages/design-system/src/tokens.css`
