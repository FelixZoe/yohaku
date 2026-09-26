# AppShell — RSC Payload Reduction

Date: 2026-05-19
Scope: `apps/web` (Yohaku web app)

## Problem

Every route on innei.in carries a fixed ~210 KB HTML baseline, independent of
page content. Decoding the RSC flight payload of a light page (`/friends`,
162.7 KB flight) shows:

| segment | size | what |
| --- | --- | --- |
| `I` rows (46) | 104.8 KB | client-component references |
| `[` rows (35) | 45.0 KB | server-rendered RSC element tree |
| `T` row (1) | 9.0 KB | inline logo SVG (out of scope) |

Of the 46 `I` rows, **33 carry a near-identical ~3151-byte chunk manifest**
(a 61-chunk list). They exist because the shell is a tree of *server*
components (`app/[locale]/layout.tsx`, `Root`, `Header`, `Content`, `Footer`,
`FooterInfo`) and each one renders client components directly. Every
server→client edge emits one `I` row. 33 edges → ~101 KB of duplicated
manifests.

## Goal

Collapse the shell's server→client boundaries by making the shell
**client-rooted**: the server layout fetches data and renders one client
`<AppShell>`; everything below becomes client→client imports (ordinary bundled
JS, no flight manifest).

### Success criteria

- `/friends` flight: `I` rows 46 → ≤ 15; flight size 162.7 KB → ≤ 60 KB.
- Per-route HTML baseline ~210 KB → ~90 KB.
- `pnpm --filter @yohaku/web build` passes.
- No behavior regression: header, footer, theme switch, search panel, locale
  switch, providers all work; no hydration errors in console.

## Architecture

### Stays server (unchanged)

`app/[locale]/layout.tsx` remains an async Server Component. It still:
- fetches aggregation data, `getMessages`, `setRequestLocale`,
- generates metadata,
- renders `<html><head><body>`,
- keeps the `PreRenderError` fallback branch as-is.

### New: client `<AppShell>`

`apps/web/src/components/layout/root/AppShell.tsx` — `'use client'`. The single
client boundary inside `<body>`. The server layout passes all server-derived
data as props:

```
<AppShell
  locale            messages
  aggregationData   appConfig
  footerConfig      openpanelConfig
  buildInfo
>
  {children}   {/* server-rendered page content, passed through as a prop */}
</AppShell>
```

`AppShell` renders a **verbatim relocation** of the current `[locale]/layout.tsx`
body tree — provider order is copied exactly, nothing reordered:

```
NextIntlClientProvider(locale, messages)
  SafariDetector
  MiSansLoader(locale)
  ErrorBoundary
    WebAppProviders
      OpenPanelInit              (rendered only when openpanelConfig.enable)
      AggregationProvider(aggregationData, appConfig)
      <div data-theme id="root">
        <Root>{children}</Root>
      </div>
      SearchPanelWithHotKey
      Analyze
      SyncServerTime
      RootPortal > BackgroundTexture
```

`Root`, `Header`, `Content`, `Footer` are already pure presentational
components. Once imported by the `AppShell` client graph they compile into the
client bundle automatically — **no `'use client'` directive added, files
otherwise untouched**. `Footer` only loses its `async` keyword.

### New: client `<HeadClient>`

`apps/web/src/components/layout/root/HeadClient.tsx` — `'use client'`.
Consolidates the four `<head>` client components (`Global`,
`HydrationEndDetector`, `ScriptInjectProvider`, `AccentColorStyleInjector`)
into one boundary, still rendered inside `<head>`. Takes a `color` prop for
`AccentColorStyleInjector`. Saves ~3 `I` rows (~9 KB).

### `FooterInfo` conversion (server → client)

`FooterInfo` is the only genuine Server Component in the shell
(`import 'server-only'`, `getTranslations`, `await fetchAggregationData()`,
`process.env`). Converting it:

- remove `import 'server-only'`;
- `getTranslations('common')` → `useTranslations('common')` (messages already
  provided by `NextIntlClientProvider`);
- `await fetchAggregationData()` → receive `footerConfig` as a prop
  (`themeConfig.footer`), drilled `AppShell → Footer → FooterInfo`;
- `process.env.COMMIT_HASH / COMMIT_URL / BUILD_TIME` → receive a `buildInfo`
  prop (`{ commitHash, commitUrl, buildTime }`), read once in the server
  layout; ~100 B serialized into the `AppShell` props;
- the nested `PoweredBy` async component becomes a sync client component using
  `useTranslations` + `buildInfo`;
- `FooterInfo` and `Footer` drop `async`.

## Data flow note

`appConfig` (= `themeConfig.config`) does **not** include `footer` — footer
config lives at `themeConfig.footer`. The server layout therefore passes
`footerConfig={data.theme.footer}` explicitly; it is prop-drilled
`AppShell → Footer → FooterInfo`. No change to `AggregationProvider`.

## Verification

1. Lint + typecheck the changed files.
2. `pnpm --filter @yohaku/web build` — must pass; RSC server/client boundary
   violations surface here.
3. Decode the `/friends` flight payload; confirm `I` rows 46 → ≤ 15 and flight
   size drops ~110 KB.
4. Browser smoke test: home + `/posts` + `/friends`; verify header, footer,
   theme switch, locale switch, search panel; console free of hydration errors.

## Risks & mitigations

| risk | mitigation |
| --- | --- |
| Provider order altered → blank page / context crash | AppShell is a verbatim copy of the existing tree; diff-review the order |
| `FooterInfo` data source migration breaks footer | explicit `footerConfig` prop; smoke-test footer rendering |
| `buildInfo` not threaded → missing version line | read env in server layout, pass as prop; verify in smoke test |
| Head consolidation changes `<head>` behavior | keep `HeadClient` inside `<head>`; verify accent color + injected scripts |

## Out of scope

- The 9 KB inline logo SVG `T` row (separate follow-up).
- Lever B — webpack/rspack `splitChunks` chunk-count tuning.
- mx-core changes (already shipped separately).
