# Multi-language SEO Design

Date: 2026-07-10
Repos: mx-core (backend + admin), Yohaku apps/web (frontend)
Status: approved pending user review

## Context

innei.in currently ships weak SEO copy: homepage title `静かな森 - 致虚极，守静笃。`,
description `致虚极，守静笃。` (8 chars, no informational value), keywords
`blog,mx-space,space,静かな森`. The backend `seo` config is single-language, so
the five web locales (zh, zh-TW, en, ja, ko) all receive the same Chinese copy.

A live audit also confirmed web-side defects:

- `/timeline`, `/friends`, `/projects`, `/notes` emit `canonical = https://innei.in`
  (inherited from the root layout), telling Google they are duplicates of the homepage.
- Homepage `<title>` is coupled to `seo.description` (`title.default = "${title} - ${description}"`),
  so the description cannot be lengthened without bloating the title.
- Title assembly is inconsistent across pages (`-`, `·`, `|` separators; raw English
  `category` / `tag` labels on localized pages).
- Note detail pages have BreadcrumbList but no BlogPosting JSON-LD (posts have both).
- Home Blog JSON-LD hardcodes `inLanguage: 'zh-CN'` for every locale.
- Custom pages (`(page-detail)`) and the notes list have no canonical/hreflang metadata.

## Decisions

1. **Locale scope**: authored copy for `zh` (base) + `en` (overlay) only.
   Resolution chain: `i18n[lang]` → `i18n.en` → base. `zh-TW` is normalized to `zh`
   by mx-core's `normalizeLanguageCode`, so it gets the base copy; `ja`/`ko` fall
   back to `en`.
2. **Storage approach**: per-locale overlay embedded in the existing `seo` config
   section (mirrors the theme config `base + .{lang}` overlay precedent). No new
   tables, no translation-entry coupling, aggregate cache invalidation already wired.
3. **No `subtitle` field**. `seo.title` becomes `Innei`; the homepage title is the
   bare name (industry pattern for personal sites: antfu.me, joshwcomeau.com,
   kentcdodds.com). `og:site_name` and WebSite JSON-LD `name` follow `seo.title`.
   The brand 静かな森 survives only inside the zh description.
4. **Copy highlights the author's identity**: AI product engineer & design engineer.

## Part 1 — mx-core

### Schema (`apps/core/src/modules/configs/configs.schema.ts`)

Extend `SeoSchema` with:

```ts
i18n: z.record(
  z.string().length(2),
  z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    keywords: z.array(z.string()).optional(),
  }),
).optional()
```

- `configs.default.ts`: add `i18n: {}` to the seo default.
- The `i18n` field must not render through the generic form DSL (no per-locale
  component exists). Exclude it from `generateFormDSL` output (hidden field metadata
  or an explicit skip), since the admin gets a bespoke editor (below).

### Patch semantics (`configs.service.ts`)

`patch()` shallow-merges objects, so deleting a locale key from `i18n` would never
persist. Add a merge customizer (oauth-style special case) so `seo.i18n` is
**replaced wholesale** on patch, like arrays.

### Aggregate resolution (`apps/core/src/modules/aggregate/aggregate.controller.ts`)

New pure function:

```ts
resolveSeo(seo, lang): PublicSeo
// lang falsy or 'zh'  -> base (i18n stripped)
// otherwise           -> { ...base, ...(seo.i18n?.[lang] ?? seo.i18n?.en) }
```

Overlay fields replace base fields wholesale (shallow spread, only defined keys).
Do not use lodash `merge` here: it merges arrays index-wise and would interleave
base and overlay keywords.

- Apply in `aggregate()` (already receives `@Lang()`) and in `site()` (add `@Lang()`).
- `i18n` is never exposed on public aggregate responses; the admin sees the full
  object via the options endpoints as usual.
- Unit tests for the fallback chain: `zh` → base; `en` → en overlay; `ja` → en
  overlay; overlay fields absent → inherit base; unknown lang with no `i18n.en` → base.

### Admin editor (`apps/admin`)

Follow the `AIConfigEditor` precedent: `SystemSettings.tsx` special-cases
`section.key === 'seo'` and renders a bespoke `SeoConfigEditor`:

- Language tabs: 中文 (base fields) / English (`i18n.en` overlay).
- Fields per tab: title, description, keywords (tags input). Overlay fields are
  optional; empty means "fall back".
- Saves the whole section through the existing `patchOption('seo', ...)` path.
- Setup wizard (`SetupSiteStep.tsx`) stays untouched (base fields only).

## Part 2 — Yohaku web

### New helper `~/lib/seo/metadata.ts`

```ts
buildPageMetadata({
  locale, path,          // -> alternates.canonical (locale-prefixed) + alternates.languages
  title,                 // page title; '%s - {seo.title}' template applies
  description?,          // defaults to site description
  og?: { image?, type? },// og/twitter title+description derived from the same source
  translations?,         // restricts hreflang set (post/note detail)
  types?,                // extra alternates.types entries (says/thinking RSS)
})
```

The helper always includes the main feed (`application/rss+xml` → `/feed`) in
`alternates.types` — previously the root layout provided it site-wide, and
dropping root-level `alternates` must not lose feed autodiscovery. `types`
entries are appended to it.

Reuses `~/lib/seo/hreflang.ts` (`buildLocalePrefixedPath`, `buildLanguageAlternates`,
`getSupportedLocalesFromTranslations`). Unified ` - ` separator everywhere,
including the OpenGraph title template (currently ` | `).

### Metadata relocation

- Locale-dependent metadata (title default/template, description, keywords,
  openGraph, twitter) moves from `src/app/layout.tsx` to
  `src/app/[locale]/layout.tsx` `generateMetadata`, fed by the existing
  `fetchAggregationData(locale)`. The backend returns already-resolved seo,
  so the web does no fallback logic of its own.
- Root layout keeps only `metadataBase`, `robots`, viewport. Its
  `alternates.canonical` is **removed** (this is the homepage-canonical bug).
  `alternates` becomes leaf-page responsibility via `buildPageMetadata`
  (Next.js replaces the whole `alternates` object per segment, so parents must
  not own it).
- `title.default = seo.title` (`Innei`); template stays `%s - ${seo.title}`.

### Page coverage

Via `buildPageMetadata`:

- Lists: `/posts` (fix hardcoded `/posts` canonical), `/notes` (currently no
  metadata at all), `/timeline`, `/friends`, `/projects`, `/says` (+RSS types),
  `/thinking` (+RSS types), `/categories/[slug]`, `/posts/tag/[name]`,
  `/notes/series`, `/notes/series/[slug]`.
- Details: post, note, custom page (`(page-detail)` gains canonical + languages;
  it currently has none).
- Category/tag titles localize through message catalogs (new keys in all five
  locales, enforced by `message-usage.test.ts`), replacing `xxx · category` /
  `#xxx · tag`.

### Structured data & OG

- Note detail: add BlogPosting JSON-LD mirroring the post builder
  (headline, description, dates, image, author).
- Home Blog JSON-LD: `inLanguage` from `HREFLANG_BY_LOCALE[locale]`; author
  `Person` gains `jobTitle: 'AI Product Engineer / Design Engineer'` and `sameAs`
  built from aggregate `socialIds` (GitHub, X). WebSite JSON-LD `name` = `seo.title`.
- `/home-og` accepts `?lang=` and renders the resolved per-locale copy; each
  locale's metadata points its `og:image` at the matching URL.

### Tests

- Unit tests for `buildPageMetadata` (canonical prefixing, hreflang set,
  separator, types passthrough).
- `messages/message-usage.test.ts` run for the new catalog keys.

## Part 3 — Copy (entered via admin after mx-core deploys)

zh (base fields):

```text
title:       Innei
description: Innei，AI 产品工程师与设计工程师。个人博客「静かな森」分享 AI 产品与工程实践、前端与全栈开发、TypeScript、React，也记录独立开发、旅行与生活随想。
keywords:    Innei, 静かな森, AI 产品工程师, 设计工程师, AI 工程, 前端开发, TypeScript, React, 独立开发, 技术博客
```

en (`i18n.en`; title omitted, falls back to `Innei`):

```text
description: Innei — AI product engineer & design engineer. Writing on AI products and engineering, frontend and full-stack development, TypeScript, React, indie hacking, and life.
keywords:    Innei, AI product engineer, design engineer, AI engineering, frontend development, TypeScript, React, indie hacker, blog
```

Length checks: zh ≈ 65 chars (Google zh snippet ≈ 78), en ≈ 150 chars (limit ≈ 160).

## Rollout order

1. Deploy mx-core (schema addition is backward compatible; new field optional).
2. Enter the copy above in the admin SEO editor.
3. Deploy Yohaku web (relies on resolved seo + decoupled homepage title).

## Out of scope

- Sitemap `xhtml:link` locale alternates (mx-core generates the sitemap; deferred).
- Google/Bing verification metadata (user may already verify via DNS).
- Dedicated ja/ko copy (falls back to en by design).
- RSS `language` field (the feed content is Chinese; value stays accurate).
