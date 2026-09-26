# Yohaku Design System Package

**Date:** 2026-04-25

**Scope:** Introduce a new workspace package `@yohaku/design-system` that owns the static design contract (tokens, references, templates, AI skill) for the Yohaku monorepo. Migrate the static `@theme` blocks out of `apps/web/src/styles/tailwindcss.css` into the package, and have the web app import them. Runtime CSS injection (dynamic accent, page color gradient, fadeable keyframes) stays in `apps/web`.

**Inspiration:** [Kami](https://github.com/tw93/kami) — a constraint-based design system for static documents, with a single source of truth, a tight cheatsheet, and an AI skill that routes natural-language requests onto templates. We adapt the same shape to a webapp context: the contract describes UI tokens and components, and the templates target HTML mockups that map back to existing React components.

## Goals

1. **Single source of truth for design tokens.** Static color, typography, spacing, radius, shadow, and backdrop tokens live in one place. Web imports them; AI reads the same file.
2. **AI-readable contract.** A `SKILL.md` + `CHEATSHEET.md` + `references/*.md` set lets Claude Code (and similar agents) produce Yohaku-style mockups and React components without inventing colors, components, or anti-patterns.
3. **Mockup-to-React continuity.** Designers (human or AI) iterate in standalone HTML using the same tokens, then hand the result off to React using a documented mapping table. No drift between mockup and production.
4. **Drift detection.** A verify script checks that the cheatsheet's hex values match the canonical token CSS, and that template snippets do not contain forbidden patterns (raw hex, banned `neutral-50~950` classes, hardcoded font families).

## Non-Goals

- Replacing Storybook or building an in-app component explorer.
- Producing PDF, slide deck, or marketing-page artifacts (Kami already covers static document output).
- Defining content tone, copy guidelines, or editorial voice (deferred — would be a separate `writing.md`).
- Enforcing tokens in `apps/web` runtime CSS or in dependent packages outside this monorepo.
- Publishing to npm. The package stays workspace-local.

## Architecture

Two-layer separation between **static contract** (package) and **runtime injection** (web):

| Layer | Lives in | Owns |
|---|---|---|
| Static contract | `packages/design-system` | Color tier (`--color-neutral-1..10`, accent base, semantic info/success/warning/error), font stacks (`--font-sans/serif/mono`), `@custom-variant dark`, plus AI-facing docs and templates |
| Runtime | `apps/web/src/styles/` | `:root` / `[data-theme="dark"]` overrides for `--surface-paper`, `--bg-opacity`, `--color-border`; dynamic OKLCH accent injection (`AccentColorStyleInjector`); per-page `PageColorGradient` seed; `yohaku-fadeable` keyframes; prose, scrollbar, and other app-specific layers |

Web's `apps/web/src/styles/tailwindcss.css` becomes:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@config "../../tailwind.config.ts";
@source "./src/**/*.{js,jsx,ts,tsx}";

@plugin "@tailwindcss/typography";

@import '@yohaku/design-system/tokens.css';   /* canonical static tokens */

@import './loading.css';
@import './checkbox.css';
@import './layer.css';
@import './animation.css';
@import './image-zoom.css';
@import './yohaku.css';                       /* runtime, app-specific */
```

## File Layout

```
packages/design-system/
├── package.json              # name: @yohaku/design-system
├── README.md                 # human entry (English + Chinese sections)
├── SKILL.md                  # Claude routing rules (English)
├── CHEATSHEET.md             # one-page token + decision reference (English)
├── src/
│   └── tokens.css            # canonical @theme blocks
├── references/               # English
│   ├── tokens.md             # full token spec (3-tier neutral, accent rules, type scale, CJK fallback)
│   ├── components.md         # ui/ catalog: when to use Button vs Link vs Tag, Modal vs Sheet vs Dialog, etc.
│   ├── anti-patterns.md      # forbidden patterns: n-5 as text, neutral-50~950, raw hex, synthetic bold, etc.
│   └── mockup-to-react.md    # HTML class ↔ ui/ component mapping + handoff steps
├── templates/                # English comments
│   ├── scaffold.html         # empty page wired with token import + dark toggle + font
│   └── snippets/
│       ├── hero.html
│       ├── list-card.html
│       ├── modal.html
│       ├── sheet.html
│       ├── form.html
│       ├── code-block.html
│       ├── stat-grid.html
│       └── comment-thread.html
└── scripts/
    └── check.ts              # token drift + snippet lint
```

`package.json` exports:

```json
{
  "name": "@yohaku/design-system",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./tokens.css": "./src/tokens.css",
    "./skill": "./SKILL.md",
    "./cheatsheet": "./CHEATSHEET.md"
  },
  "files": ["src", "references", "templates", "SKILL.md", "CHEATSHEET.md", "README.md"]
}
```

## Token Migration Plan

**Move from `apps/web/src/styles/tailwindcss.css` → `packages/design-system/src/tokens.css`:**

- The full `@theme inline { ... }` block defining `--color-paper`, `--font-sans`, `--font-serif`, `--font-mono`.
- The `@theme { ... }` block defining `--color-accent`, `--color-neutral-1..10`, `--color-info/success/warning/error`, the initial `--color-border` declaration, and the `--color-muted-1..10` aliases.
- The `@custom-variant dark (...)` declaration.

**Stay in `apps/web/src/styles/`:**

- `html`, `body`, `.rich-content`, `.prose`, `@layer utilities` and the rest of the file.
- `:root` / `[data-theme="dark"]` runtime overrides in `variables.css` and `theme.css`.
- All CSS that references runtime-injected variables (`--a`, `--bg-opacity`, page color gradient seeds).
- `yohaku.css`, `webfont.css`, `animation.css`, `loading.css`, `checkbox.css`, `image-zoom.css`, `layer.css`, `mask.css`, `print.css`, `scrollbar.css`, `uikit.css`.

**Verification of the migration:** `pnpm --filter @yohaku/web dev` boots, the home page and a representative content page render visually identical to before, and dark mode still toggles correctly.

## AI Skill Contract

`SKILL.md` (English) declares triggers for natural-language routing:

- "Make a Yohaku mockup for X"
- "Design a new hero / modal / sheet / list card"
- "Convert this mockup to React"
- "Audit token compliance in this file"
- Chinese equivalents: "做一个 Yohaku 风的 mockup / 设计一个新组件 / mockup 转 React / 检查 token 合规"

The skill defines four task tiers and what to read for each:

| Task | Reads | Produces |
|---|---|---|
| New mockup (design phase) | CHEATSHEET, `tokens.md`, `anti-patterns.md` | Copies `templates/scaffold.html`, cherry-picks from `snippets/`, writes to `docs/superpowers/plans/<topic>-mockup.html` or similar |
| New React component | CHEATSHEET, `components.md`, `anti-patterns.md` | Reuses existing `apps/web/src/components/ui/*`; only adds new ui/ entry when no existing primitive fits, and the new entry follows tokens |
| Mockup → React handoff | `mockup-to-react.md`, `components.md` | Replaces HTML classes with ui/ components and Tailwind tokens per the mapping table |
| Token audit | `anti-patterns.md`, `tokens.md` | Reports violations: n-5 used as text, banned `neutral-50~950`, raw hex outside contract, hardcoded font-family, etc. |

### CHEATSHEET ten invariants

1. Neutrals are three-tier: 1-4 surface/fill, 5-7 border/icon/secondary, 8-10 body/heading.
2. n-5 must never be used for text. n-6 only for small text. n-7 for secondary text.
3. Tailwind's `neutral-50~950` palette is banned. Use `text-neutral-1..10` only.
4. Accent covers ≤ 5% of any surface. Reserved for CTA, focus ring, and brand mark.
5. Default body text color is n-9.
6. Only three font roles exist: sans, serif, mono. CJK fallback is mandatory wherever Chinese or Japanese can render.
7. Backdrop blur has four levels (thick, default, thin, ultrathin). Do not invent more.
8. Border radius follows Tailwind defaults; `rounded-2xl` is the cap for hero surfaces.
9. Depth comes from ring or whisper shadow. Hard drop shadows are forbidden.
10. Mockup HTML files must `@import` `@yohaku/design-system/tokens.css`. Raw hex outside the contract is a lint failure.

## Verification

`scripts/check.ts` runs in Node and is wired into `pnpm --filter @yohaku/design-system check`:

1. Parse `src/tokens.css` and build a map of declared CSS variables and their hex / value.
2. Parse `CHEATSHEET.md` color tables; assert every hex value listed there exists in the tokens map and matches.
3. Glob `templates/**/*.html`. For each file:
   - Reject raw hex literals outside `<style>` blocks that override the contract.
   - Reject `text-neutral-50`, `text-neutral-100`, ..., `text-neutral-950`.
   - Reject inline `font-family` values that bypass `var(--font-sans|serif|mono)`.
   - Require that the file references the canonical token import.
4. Exit non-zero on any drift, print a unified diff.

The script is small enough to live as a single TypeScript file with no extra dependencies beyond what the monorepo already has (`tsx` or `bun` for execution).

## MVP Scope

Shipped in one connected change set:

- `packages/design-system/` created, registered in `pnpm-workspace.yaml`.
- `package.json`, `README.md`, `SKILL.md`, `CHEATSHEET.md` written.
- `src/tokens.css` populated by lifting static blocks from `apps/web/src/styles/tailwindcss.css`.
- `apps/web/src/styles/tailwindcss.css` rewritten to import from the package; web boots with no visual diff.
- `references/{tokens,components,anti-patterns,mockup-to-react}.md` drafted.
- `templates/scaffold.html` and the eight snippets written.
- `scripts/check.ts` written and passes against the initial cheatsheet and templates.

### Out of MVP

- `references/writing.md` (content tone and quality bars).
- Page archetype templates (article-page, feed-page, home-page).
- PDF / slide / marketing-page output paths.
- Storybook or in-app `/design` explorer.
- CI integration of the check script (will follow once it stabilizes locally).

## Implementation Phases (rough)

1. **Package skeleton + token migration.** Create the package, lift tokens, rewire web, verify visual parity.
2. **AI contract.** Write SKILL, CHEATSHEET, and the four reference docs.
3. **Templates + verify.** Write scaffold, snippets, and `check.ts`. Iterate until check passes.

Detailed steps will be produced by the writing-plans skill in the next stage.

## Open Questions

None at design time. Edge cases (`tw-animate-css` ordering, `@source` glob discovery from a sibling package, Tailwind v4 `@config` resolution across packages) will surface during phase 1 and be addressed inline.
