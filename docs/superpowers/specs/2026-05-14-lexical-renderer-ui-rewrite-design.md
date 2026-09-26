# Lexical Renderer UI Rewrite — Design

**Status:** draft, pending user file review (2026-05-14)
**Scope:** alert · blockquote · banner · nestdoc — rewrite the static-render UI of these four Lexical blocks shown by `@yohaku/web`.

## 0. Styling Convention

The four override files live in `apps/web` and therefore use Yohaku's Tailwind v4 + CSS custom properties stack — **not** vanilla-extract. For each override:

- Layout / sizing / spacing → Tailwind v4 utilities (`my-4`, `px-6`, `gap-3.5`, `border-l`, etc.).
- Static colors / typography → design-system tokens via Tailwind theme keys (`text-copy-14`, `text-caption-10`, `border-(--color-neutral-3)`, `text-(--color-neutral-9)`).
- Per-type dynamic colors → set CSS custom properties inline on the root element via the `style` prop, then reference them with Tailwind arbitrary values:

```tsx
const MARKER_COLOR: Record<AlertType, string> = {
  note: 'var(--color-info)',
  tip: 'var(--color-success)',
  important: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  caution: 'var(--color-error)',
};

<div
  data-type={type}
  style={{ '--marker-color': MARKER_COLOR[type] } as CSSProperties}
  className="..."
>
```

No new global stylesheets unless an attribute selector (e.g. `[data-no-open-quote] .glyph { display: none }`) is unavoidable; if needed, co-locate in `apps/web/src/styles/lexical-overrides.css` and import once from `LexicalContent.tsx`.

---

## 1. Goals

1. Replace the haklex default visuals for the four blocks with a Yohaku-native treatment that fits the `余白` ("breathing space") aesthetic: thin lines, generous indent, minimal background fill, semantic color as the primary differentiator.
2. Use `@yohaku/design-system` tokens exclusively for color / typography / surface. Do not depend on `@haklex/rich-style-token`'s semantic palette.
3. Add an `attribution` field to blockquote (cite the source — "— author, work"). Requires a small haklex schema extension.
4. Keep behavior of nestdoc (preview + click-to-open dialog) unchanged. Only the visual frame is rewritten.

## 2. Architecture

Two layers of work, with ~90 / 10 split.

### Layer A — Yohaku override (primary)

All four block renderers are replaced via the existing `composeRenderer` plumbing in `apps/web/src/components/ui/rich-content/LexicalContent.tsx`. No new framework code; only new override modules wired into the existing `modules` / `builtinNodeOverrides` arrays.

New files in `apps/web/src/components/ui/rich-content/`:

- `LexicalAlertOverride.tsx` — replaces `alertModule.renderers.Alert`
- `LexicalBannerOverride.tsx` — replaces `bannerModule.renderers.Banner`
- `LexicalNestedDocOverride.tsx` — replaces `nestedDocModule.renderers.NestedDoc`
- `LexicalBlockquoteOverride.tsx` — registered as `builtinNodeOverrides.quote`

`LexicalContent.tsx` is amended to import these and pass them to the respective module override and `builtinNodeOverrides`.

`apps/web/src/components/ui/rich-content/lexical-content-styles.ts` drops the now-redundant default CSS imports:

```ts
// REMOVED — all four blocks are fully overridden in Yohaku; haklex defaults
// would only add unused class rules.
- import '@haklex/rich-compose/style/alert.css'
- import '@haklex/rich-compose/style/banner.css'
- import '@haklex/rich-compose/style/nested-doc.css'
```

`foundation.css` and the remaining per-module CSS files stay imported. `NestedDocRenderer` (used inside the override's preview) only delegates to `useOptionalNestedContentRenderer()` — it has no dependency on `nested-doc.css`. The builtin `quote` case is overridden via `builtinNodeOverrides`, so haklex's `.rich-quote` rule in `foundation.css` does not target our `<blockquote class="rich-quote-yohaku">`; no separate quote CSS to remove. Update the comment block at the top of `lexical-content-styles.ts` to add `alert / banner / nested-doc / quote` to the "skip the upstream CSS entirely" list.

Wiring (sketch):

```tsx
import { ALERT_MODULE_NAME } from '@haklex/rich-compose/modules/alert';
import { BANNER_MODULE_NAME } from '@haklex/rich-compose/modules/banner';
import { NESTED_DOC_MODULE_NAME } from '@haklex/rich-compose/modules/nested-doc';

const alertModuleYohaku: RichRendererModule = {
  name: ALERT_MODULE_NAME,
  renderers: { Alert: LexicalAlertOverride },
};
const bannerModuleYohaku: RichRendererModule = {
  name: BANNER_MODULE_NAME,
  renderers: { Banner: LexicalBannerOverride },
};
const nestedDocModuleYohaku: RichRendererModule = {
  name: NESTED_DOC_MODULE_NAME,
  renderers: { NestedDoc: LexicalNestedDocOverride },
};

composeRenderer({
  modules: [
    /* ...existing... */
    alertModuleYohaku,      // replaces alertModule
    bannerModuleYohaku,     // replaces bannerModule
    nestedDocModuleYohaku,  // replaces nestedDocModule
    /* ... */
  ],
  builtinNodeOverrides: {
    /* ...existing paragraph/link/autolink/table... */
    quote: lexicalBlockquoteOverride,
  },
});
```

Importing the `*_MODULE_NAME` constant alone does not pull `AlertRenderer` / `BannerRenderer` / `NestedDocStaticDecorator` into the bundle — same pattern as the existing `POLL_NODE_KEY` import in `poll-module.ts`.

### Layer B — haklex schema extension

Independent npm repo at `../haklex`. Changes required:

- `packages/rich-editor/src/nodes/RichQuoteNode.ts` (new) — subclasses `@lexical/rich-text` `QuoteNode`, adds `__attribution: string | null`, with `static getType() = 'rich-quote'`, `static clone`, `static importJSON`, `exportJSON`, `getAttribution`, `setAttribution`.
- `packages/rich-editor/src/nodes/shared.ts` — register `RichQuoteNode` and add `{ replace: QuoteNode, with: () => new RichQuoteNode() }` so existing markdown shortcut (`> `) still produces the new node.
- `packages/rich-editor-ui/src/components/quote-attribution/` (new) — a popover invoked from the floating toolbar when a quote node is selected. UI: single-line text input, save/clear.
- `packages/rich-compose/src/static-renderer/engine/renderBuiltinNode.tsx` — extend `case 'quote'` to read `(node as any).attribution` and render a `<footer>` line below children (haklex default rendering, consumed by admin-vue3 / mx-core).
- Export module-name string constants from each `packages/rich-compose/src/modules/*/module.ts` (precedent: `POLL_NODE_KEY` in `modules/poll/index.ts`):

  ```ts
  // modules/alert/module.ts
  export const ALERT_MODULE_NAME = 'alert' as const;
  export const alertModule: RichRendererModule = {
    name: ALERT_MODULE_NAME,
    renderers: { Alert: AlertRenderer },
  };
  ```

  Same for `BANNER_MODULE_NAME` and `NESTED_DOC_MODULE_NAME`. Re-export from each module's `index.ts` alongside the existing `*Module` export. Yohaku then imports the constant only — no bundle cost from the default renderer.
- Publish: minor version bump of haklex (per the existing pin policy in `apps/web/package.json`).

Yohaku's `LexicalBlockquoteOverride` reads the same `attribution` field; admin-vue3 / mx-core get the default rendering for free.

## 3. Components

### 3.1 `LexicalAlertOverride.tsx` — alert (静谧)

DOM:

```tsx
<div role="note" data-type={type} className="rich-alert-yohaku">
  <div className="rich-alert-yohaku-body">
    <div className="rich-alert-yohaku-label">
      <span aria-hidden className="rich-alert-yohaku-dot" />
      {ALERT_LABELS[type]}
    </div>
    <div className="rich-alert-yohaku-content">{children}</div>
  </div>
</div>
```

Visual contract:

- Container: no background, no border (except left rule on body), block margin `my-4` (Tailwind).
- Body: `border-left: 1px solid var(--marker-color)`, `padding: 4px 0 4px 24px` (Tailwind: `border-l py-1 pl-6` with `border-(--marker-color)`).
- Label: `text-caption-10` uppercase, weight 500, letter-spacing 0.08em, color `var(--marker-color)`, opacity 0.9.
- Dot: 6px circle, `background: var(--marker-color)`, inline with label, 6px gap.
- Content: `text-copy-14`, color `var(--color-neutral-9)`.

`--marker-color` is set per `data-type` via attribute selectors (see § 4).

### 3.2 `LexicalBannerOverride.tsx` — banner (明快 v3)

DOM:

```tsx
<div role="note" data-type={type} className="rich-banner-yohaku">
  <div aria-hidden className="rich-banner-yohaku-line" />
  <div className="rich-banner-yohaku-inner">
    <span aria-hidden className="rich-banner-yohaku-dot" />
    <div className="rich-banner-yohaku-content">
      <div className="rich-banner-yohaku-header">{BANNER_LABELS[type]}</div>
      {children}
    </div>
  </div>
</div>
```

Visual contract:

- `.rich-banner-yohaku`: `position: relative; padding: 18px 14px 16px; background: linear-gradient(180deg, var(--marker-tint) 0%, transparent 60%);` (Tailwind: `relative pt-[18px] px-3.5 pb-4 bg-[linear-gradient(180deg,var(--marker-tint)_0%,transparent_60%)] my-4`). No border, no border-radius.
- `.rich-banner-yohaku-line`: `position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, var(--marker-color) 30%, var(--marker-color) 70%, transparent 100%);`
- `.rich-banner-yohaku-inner`: `display: flex; gap: 14px; align-items: flex-start; padding-left: 24px`.
- Dot: 8px circle, `margin-top: 7px`.
- Header: `text-copy-13`, weight 700, color `var(--marker-color)`, margin-bottom 4px.
- Content: `text-copy-14`, color `var(--color-neutral-9)`.

`--marker-tint = color-mix(in srgb, var(--marker-color) 7%, transparent)`.

### 3.3 `LexicalBlockquoteOverride.tsx` — blockquote (大字 glyph + attribution)

Registered as `builtinNodeOverrides.quote: BuiltinNodeRenderer`.

Signature: `(node, key, children, defaultRenderer) => ReactNode`. Read `(node as any).attribution`, and `data-no-open-quote` / `data-no-close-quote` from the node's existing detection (current logic in `renderBuiltinNode.tsx` already adds these dataset markers — preserve them).

DOM:

```tsx
<blockquote
  key={key}
  className="rich-quote-yohaku"
  data-no-open-quote={hasOpenQuote ? '' : undefined}
  data-no-close-quote={hasCloseQuote ? '' : undefined}
>
  <span aria-hidden className="rich-quote-yohaku-glyph">&ldquo;</span>
  <div className="rich-quote-yohaku-body">{children}</div>
  {attribution && (
    <footer className="rich-quote-yohaku-attribution">— {attribution}</footer>
  )}
</blockquote>
```

Visual contract:

- Container: `font-family: var(--font-serif)` (Tailwind `font-serif`). No background, no border. Block margin `my-4`.
- Glyph: 48px Georgia, line-height 0.6, opacity 0.4, color `var(--color-accent)` (i.e. Yohaku's `--a`), margin-bottom 6px, display block.
- Body: `font-style: italic`, `text-copy-15`, color `var(--color-neutral-9)`, padding-left 28px.
- Attribution: `text-align: right`, `text-label-12`, color `var(--color-neutral-7)`, margin-top 8px, font-style normal.
- When `data-no-open-quote` is present: `display: none` on `.rich-quote-yohaku-glyph` via CSS attribute selector.

### 3.4 `LexicalNestedDocOverride.tsx` — nestdoc (静谧 preview)

Re-implements `NestedDocStaticDecorator` against the same hooks: `useColorScheme`, `usePortalTheme`, `usePresentDialog`, `useOptionalNestedContentRenderer`, `useVariant`. Behavior of `presentDialog` and `truncateEditorState(contentState, 6)` is unchanged. Only the visual frame changes.

DOM (collapsed state):

```tsx
<div
  role="button"
  tabIndex={0}
  className="rich-nestdoc-yohaku"
  onClick={handleOpen}
  onKeyDown={...}
>
  <div className="rich-nestdoc-yohaku-header">
    <span>嵌套文档</span>
    <span aria-hidden className="rich-nestdoc-yohaku-divider" />
    <span className="rich-nestdoc-yohaku-action">展开 ›</span>
  </div>
  <div className="rich-nestdoc-yohaku-preview">
    <NestedDocRenderer value={previewState} />
  </div>
  {needsTruncation && (
    <div aria-hidden className="rich-nestdoc-yohaku-fade" />
  )}
</div>
```

Visual contract:

- Container: `border-left: 1px solid var(--color-neutral-3); padding: 4px 0 4px 24px; cursor: pointer; position: relative;`. No bordered box, no border-radius.
- Header row: `display: flex; align-items: center; gap: 8px; margin-bottom: 8px; text-caption-10 uppercase, color: var(--color-neutral-7), letter-spacing: 0.06em`.
- Divider: `flex: 1; height: 1px; background: var(--color-neutral-3)`.
- Action `展开 ›`: same caption-10 style. `›` transitions `transform: translateX(2px)` on hover.
- Preview: clipped, pointer-events disabled (existing `previewSurface` semantics).
- Fade: `position: absolute; left: 0; right: 0; bottom: 0; height: 2.5rem; background: linear-gradient(to bottom, transparent, var(--surface-paper));`.
- Hover (`.rich-nestdoc-yohaku:hover`): `border-left-color: var(--color-accent)`; action `›` translates right 2px.
- No dark overlay, no Maximize2 icon.

Dialog (opened state): unchanged from current implementation — uses Yohaku's `PeekModal` via the `presentDialog` provider already wired in `LexicalContent.tsx`.

### 3.5 `RichQuoteNode` + editor UI (haklex)

`RichQuoteNode.ts`:

```ts
import { QuoteNode, SerializedQuoteNode } from '@lexical/rich-text';
import type { Spread, LexicalUpdateJSON, EditorConfig } from 'lexical';

export type SerializedRichQuoteNode = Spread<
  { attribution: string | null },
  SerializedQuoteNode
>;

export class RichQuoteNode extends QuoteNode {
  __attribution: string | null;

  constructor(attribution: string | null = null, key?: string) {
    super(key);
    this.__attribution = attribution;
  }

  static getType(): string {
    return 'rich-quote';
  }

  static clone(node: RichQuoteNode): RichQuoteNode {
    return new RichQuoteNode(node.__attribution, node.__key);
  }

  static importJSON(json: SerializedRichQuoteNode): RichQuoteNode {
    return $createRichQuoteNode(json.attribution ?? null).updateFromJSON(json);
  }

  exportJSON(): SerializedRichQuoteNode {
    return { ...super.exportJSON(), attribution: this.__attribution };
  }

  getAttribution(): string | null {
    return this.getLatest().__attribution;
  }

  setAttribution(value: string | null): this {
    const writable = this.getWritable();
    writable.__attribution = value && value.trim() ? value.trim() : null;
    return writable;
  }
}

export function $createRichQuoteNode(attribution: string | null = null) {
  return new RichQuoteNode(attribution);
}
```

Node registration in `shared.ts`:

```ts
nodes: [
  /* ...existing... */
  RichQuoteNode,
  { replace: QuoteNode, with: () => new RichQuoteNode() },
]
```

Editor UI:

- Located at `packages/rich-editor-ui/src/components/quote-attribution/`.
- A button appears in the floating toolbar when the selection is inside a `RichQuoteNode`.
- Click opens a popover with a single text input prefilled with current attribution.
- Save commits via `editor.update(() => $getSelection() ... .setAttribution(value))`.
- Clear sets to `null`.

`renderBuiltinNode.tsx` `case 'quote'`:

```tsx
case 'quote': {
  const attribution = (node as any).attribution as string | null;
  /* existing detection code keeps producing data-no-open-quote / data-no-close-quote */
  return (
    <blockquote
      key={key}
      className={shared('quote')}
      data-no-close-quote={hasCloseQuote ? '' : undefined}
      data-no-open-quote={hasOpenQuote ? '' : undefined}
    >
      {children}
      {attribution && <footer className={shared('quoteAttribution')}>— {attribution}</footer>}
    </blockquote>
  );
}
```

Add `quoteAttribution: 'rich-quote-attribution'` to `shared.css.ts` semantic class names; default styling: `text-align: right; font-size: 12px; color: var(--color-textSecondary); margin-top: 8px;` (haklex tokens — admin-vue3 / mx-core consume).

## 4. Token Mapping

All visual styles draw exclusively from `@yohaku/design-system` (no `@haklex/rich-style-token` palette in the four override files).

### Semantic color per alert / banner type

| haklex type | Yohaku token            | hue          |
| ----------- | ----------------------- | ------------ |
| note        | `var(--color-info)`     | 縹 hanada     |
| tip         | `var(--color-success)`  | 若竹 wakatake  |
| important   | `var(--color-accent)`   | Yohaku accent (runtime `--a`) |
| warning     | `var(--color-warning)`  | 朽葉 kuchiba   |
| caution     | `var(--color-error)`    | 蘇芳 suoh      |

Implemented as CSS attribute selectors:

```css
.rich-alert-yohaku[data-type="note"]      { --marker-color: var(--color-info); }
.rich-alert-yohaku[data-type="tip"]       { --marker-color: var(--color-success); }
.rich-alert-yohaku[data-type="important"] { --marker-color: var(--color-accent); }
.rich-alert-yohaku[data-type="warning"]   { --marker-color: var(--color-warning); }
.rich-alert-yohaku[data-type="caution"]   { --marker-color: var(--color-error); }
/* analogous for .rich-banner-yohaku */
```

### Neutrals

- Hairline rules: `var(--color-neutral-3)` (#e3e1db)
- Secondary text / labels: `var(--color-neutral-7)` (#5c5a55)
- Body text: `var(--color-neutral-9)` (#24231f)
- Headings (banner header is colored, not neutral): n/a here

Dark mode inverts automatically via Yohaku's neutral-tier definition.

### Typography (Yohaku role+px tokens)

- alert label / nestdoc header: `text-caption-10` (10px / 1.4)
- banner header: `text-copy-13` (13px / 1.54)
- alert body / banner body / nestdoc preview body: `text-copy-14` (14px / 1.57)
- blockquote body: `text-copy-15` (15px / 1.6), italic, serif
- blockquote attribution: `text-label-12` (12px / 1.5), normal style

### Fonts

- blockquote: `font-family: var(--font-serif)` (Noto Serif / Source Han Serif chain)
- all others: inherit `var(--font-sans)` from `LexicalContent.tsx`

### Surface

- nestdoc bottom fade → `var(--surface-paper)` (runtime override, light/dark aware)

Banned (project lint enforces):

- raw hex outside the contract
- `text-[Npx]` arbitrary sizes
- `text-neutral-50..950` Tailwind defaults
- `@haklex/rich-style-token`'s `vars.color.alertInfo/Tip/Important/Warning/Caution` in the four override files

## 5. Data Flow & Hooks

- **alert / banner**: pure functional, no state.
- **blockquote**: pure functional. `node.attribution` read at render time.
- **nestdoc**: same hooks as `NestedDocStaticDecorator` today — `useColorScheme`, `useOptionalNestedContentRenderer`, `usePresentDialog`, `usePortalTheme`, `useVariant`. `handleOpen` calls the resolved `presentDialog` (Yohaku's `PeekModal` per the existing `LexicalContent.tsx` wiring).

## 6. Edge Cases

- Unknown `type` on alert / banner → fall back to `note`.
- Empty children → render the container anyway (preserves vertical rhythm in editor previews and inline embeds).
- blockquote with `attribution === null` or empty string → omit the `<footer>` line.
- blockquote text starting with an opening quote glyph (`"…"` / `“…”` / `「…」` / `『…』`) → existing dataset attributes `data-no-open-quote` / `data-no-close-quote` are emitted; Yohaku CSS hides `.rich-quote-yohaku-glyph` when `[data-no-open-quote]` is set.
- nestdoc with no renderable children (`hasRenderableEditorState === false`) → return `null` (existing behavior).
- nestdoc title `walk` extraction → keep the 80-char truncation.
- Theme switching → all tokens are theme-aware via `--color-*` variables and `@custom-variant dark`; no separate dark stylesheet.

## 7. Testing

| layer                            | what                                                                                                       | tool                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Yohaku override                  | Manually render all five alert types, all five banner types, blockquote (with / without attribution), nestdoc (with / without preview); inspect light + dark | manual, `pnpm --filter @yohaku/web dev` |
| Yohaku override                  | Lint + typecheck on changed files only                                                                     | `pnpm --filter @yohaku/web lint`        |
| haklex `RichQuoteNode`           | importJSON / exportJSON round-trip; markdown shortcut `> ` produces the new node                           | existing haklex vitest                  |
| haklex editor UI                 | Selection inside quote node surfaces toolbar button; popover edits commit; clear sets `null`               | existing haklex e2e or unit             |
| haklex `renderBuiltinNode`       | Fixture with `attribution` renders `<footer>`; without renders no footer                                   | existing haklex unit                    |

No new Playwright suite. Visual regression handled by manual + screenshot diff on PR.

## 8. Scope / Non-Goals

**In scope**

- Four Yohaku override renderer files (alert / banner / nestdoc / quote).
- Remove `alert.css` / `banner.css` / `nested-doc.css` imports from `lexical-content-styles.ts` (haklex defaults are now dead weight for these blocks).
- `RichQuoteNode` schema + editor popover UI in haklex.
- `renderBuiltinNode.tsx` `case 'quote'` extension (so admin-vue3 / mx-core inherit attribution support).
- Export `ALERT_MODULE_NAME` / `BANNER_MODULE_NAME` / `NESTED_DOC_MODULE_NAME` constants from haklex `rich-compose/modules/*/module.ts`.
- haklex minor version bump and Yohaku pin update.
- ESLint + typecheck pass on changed files.

**Out of scope (deferred / follow-up)**

- Visual rewrite of haklex's `AlertEditRenderer` / `BannerEditRenderer` / `NestedDocEditDecorator` (the editor-side appearance shown in admin-vue3 stays as-is).
- New alert / banner types (still five).
- Changes to `noteVariant`'s `text-indent: 2em` first-line CJK indent.
- Mobile-specific layouts beyond natural reflow.
- OG image / RSS-specific rendering of these blocks.
- Modifications to `LexicalContent.tsx`'s `composeRenderer` framework, modal wiring, paragraph / link / autolink / table / CodeBlock overrides.

## 9. Open Questions

None at brainstorming time. Implementation may surface CSS-specificity issues against `@haklex/rich-compose/style/*.css` imports; if so, scope the override classes more tightly (e.g. `.rich-content .rich-alert-yohaku ...`) rather than removing the haklex stylesheets — they still cover internal paragraph spacing.
