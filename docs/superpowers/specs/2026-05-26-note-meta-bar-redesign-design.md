# NoteMetaBar Redesign — Letter Tristream

**Date:** 2026-05-26
**Scope:** `apps/web/src/components/modules/note/NoteMetaBar.tsx` 全重写。涉 `lib/meta-icon.ts`（重写 — icon → hue），`apps/web/src/app/[locale]/notes/(note-detail)/[id]/pageExtra.tsx` 之 `NoteHeaderDate`（去 clock icon），`apps/web/src/components/modules/note/NoteLatestRender.tsx` 之 `EyebrowRow`（icon → hue dot），`apps/web/src/components/icons/emoji.tsx`（整文件删）。加 letter-paper accent tokens 至 `@yohaku/design-system`。
**Status:** spec, not implemented

## 1. 背景与目标

现 `NoteMetaBar` 居 NoteDetailClient 之 title row 下、与 `NoteHeaderDate` + `NoteMetaReadingCount` 同行 inline 平铺，竖线 `|` 串各项：date · weather · mood · read · like · CC · AI · translation · realtime。问题：

- **信息过密**：8+ items 用竖线串挤，扫视累
- **视觉过强**：与 paper 之 ruling line / serif title 协奏失调；mingcute-fill 之 weather icon 与 emoji-like mood SVG 形如卡通 — 与 paper / 信笺手稿调性冲
- **分隔生硬**：竖线 `|` 之 web app 调与 paper aesthetic 不衬
- **层级缺**：stats（read / like / realtime）与 metadata（weather / mood / AI / lang / CC）混作一炉，无主次

本次重设之核心：**承 NoteListItemPaper / NoteLatestRender 已有的"Letter № · 暖色 caption · serif italic"调性，将 meta bar 重塑为 letter-paper stripe — 双行 tristream，serif italic 抒情段 + uppercase caption 戳印段，hue dot 替 cartoon icon。**

## 2. Non-goals

- 不动 `Paper` / `PaperSheet` / paper ruling background / deckle filter
- 不动 `NoteHeadCover` / `NoteTitle` / `NoteTopicInlineTag`
- 不动 `NoteMetaReadingCount` 之 realtime atom 接入逻辑（仅其渲染由 `NoteMetaBar` 接管，组件内合并）
- 不动 `TranslationLanguageSwitcher` 之 dropdown 行为
- 不动 `AIGenBadge` 之 hover preview 行为
- 不动 `FloatPopover` / tooltip 实现
- 不动 i18n key（沿现 `common.*` / `post.copyright_license_tooltip` / `note.*`）
- 不引入新 npm 依赖
- 不动 PostMetaBar（post 侧 dot-separated 文本风别行）

## 3. Architecture

涉文件（4 改、1 删、2 token 加）：

| 文件 | 改动 |
| --- | --- |
| `apps/web/src/components/modules/note/NoteMetaBar.tsx` | 全重写。合并 `NoteMetaReadingCount` 之 realtime 渲染入本组件。导出形态：`<NoteMetaBar />`（保 name），可独立替代现 `<NoteHeaderDate /><NoteMetaBar /><NoteMetaReadingCount />` 三件 |
| `apps/web/src/app/[locale]/notes/(note-detail)/NoteDetailClient.tsx` | `<span>` row 内三件改为单一 `<NoteMetaBar />` |
| `apps/web/src/app/[locale]/notes/(note-detail)/[id]/pageExtra.tsx` | `NoteHeaderDate` 仍 export 不变（preview page 仍可独立用），但 `NoteDateMeta` 内删 `<i class="i-mingcute-time-fill" />`；其 serif italic 形态由 `NoteMetaBar` 内调用时控；保 `<FloatPopover>` 之 `modifiedAt` tooltip 行为 |
| `apps/web/src/components/modules/note/NoteLatestRender.tsx` | `EyebrowRow` 之 `item.icon` 由 `weather2icon()` / `mood2icon()` 改为 hue dot；date item 之 `<MdiClockOutline />` **保留**（NoteLatestRender 之 letter 态 eyebrow row 仍 uppercase caption，clock icon 在此 row 与暖色 caption 一族不突兀） |
| `apps/web/src/lib/meta-icon.ts` | 全重写。删 `weatherIconClassMap` / `moodIconMap` / `weather2icon` / `mood2icon` / `DEFAULT_WEATHER_ICON_CLASS`。加 `weatherHueMap` / `moodHueMap` / `weather2hue(w): string` / `mood2hue(m): string`。保 `weatherTranslationKeyMap` / `moodTranslationKeyMap` / `getWeatherLabel` / `getMoodLabel` 不变 |
| `apps/web/src/components/icons/emoji.tsx` | 整文件**删**（仅 meta-icon.ts 用之；删后无 orphan import） |
| `packages/design-system/src/tokens.css` | 加 `--c-letter-warm-deep` / `--c-letter-warm` / `--c-letter-hairline` 三 token（light + dark） |
| `packages/design-system/CHEATSHEET.md` | `Color > Accent and semantic` 后加 "Letter (paper accents)" 小节，列三 token 之 hex / use |

`apps/web/src/app/[locale]/preview/page.tsx` 用 `<NoteMetaBar />` 已是单 export，自动随之；preview 该处之 `<NoteRootBanner />` 与 `<NoteMetaBar />` 之间结构不变。

`apps/web/src/components/modules/peek/NotePreview.tsx` 同。

无 API / data shape 变。

## 4. Layout & 形态

### 4.1 双行 stripe — tristream

```
┌─ Title row ──────────────────────────────────────────────────┐
│ 某日所记之事                                                  │
│ #topic-inline-tag                                            │
│                                                              │
│ ┌──────────────── NoteMetaBar ─────────────────────────────┐ │
│ │ May 26, 2026 · Wed   ● sunny · ● happy   1,234 · 56 · 3 │ │  ← 上行
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │ │  ← hairline
│ │                     AI · GPT-4 · 中 / EN ▾            © │ │  ← 下行
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**上行**：grid 三段，`grid-cols-[auto_1fr_auto] gap-x-4 items-baseline`

- 左 — date：`serif italic copy-13 text-neutral-7/70`，删 `<i class="i-mingcute-time-fill" />`，保 `<FloatPopover>` `modifiedAt` tooltip
- 中 — mood / weather：`serif italic copy-13`，色 `--c-letter-warm-deep`，每项 `inline-flex items-center gap-1.5`，前缀 6px hue dot
- 右 — stats（极简）：`caption-10 uppercase tracking-[0.22em] tabular-nums`，色 `--c-letter-warm-deep`，渲染为 `read · like · now` 之三 number 串 join by ` · `（无单位 inline、 全文 label 入 hover popover）

**hairline**：`mt-2 pt-1.5 border-t border-[--c-letter-hairline]`

**下行**：`flex items-center gap-3 caption-10 uppercase tracking-[0.16em] text-[--c-letter-warm]`

- AI · `<provider>`：当 `aiGen` 非空 / undefined / null 显
- `lang ▾`：当 `articleTranslation.availableTranslations.length > 0` 显（保 `TranslationLanguageSwitcher`，trigger 字号 / 风随上下文）
- `©`：常显（icon-only `CreativeCommonsIcon`，`ml-auto`，size icon-sm）

下行若 AI / lang / CC 三者皆缺，整下行 + hairline 不渲染。

### 4.2 spacing

- 上行 grid `gap-x-4` (16px) / `items-baseline`
- 上 / 下行间：`mt-2 pt-1.5`（约 10px）
- 整 bar 与 title row 间：沿现 NoteDetailClient 之 `<span class="flex flex-wrap …">` 之位置不动；bar 内自管 layout

### 4.3 weather / mood hue dot 形态

```jsx
<span
  aria-hidden
  className="inline-block size-1.5 rounded-full"
  style={{ background: weather2hue(weather) }}
/>
<span className="font-serif italic">
  {getWeatherLabel(weather, t)}
</span>
```

mood 同。

### 4.4 stats 极简数串

```
1,234 · 56 · 3
```

- 仅当至少一项有值时 render
- 各值之间 `·` 分隔（color `--c-letter-warm-deep` @ 0.4）
- 各 number 独立 `<span aria-label="1,234 reads">`
- 整段 hover popover 显完整文 "1,234 reads · 56 likes · 3 reading now"（一 popover 包整段）
- 单数 / 复数沿 `useTranslations('common').meta_reads` / `.meta_likes`，`activity.current_readers` 之既有 plural 规则

## 5. weather / mood hue 表

**weather (6 种 — 全列)**

```ts
export const weatherHueMap: Record<string, string> = {
  晴:   '#d4a056',  // 暖黄
  多云: '#a8b0b8',  // 浅蓝灰
  阴:   '#9aa0a8',  // 中灰
  雪:   '#c8d0d8',  // 银白偏冷
  雨:   '#6e8fa5',  // 雨蓝
  雷雨: '#5b6478',  // 深蓝紫
}
```

**mood (13 种 — 全列)** 分 4 族（取义便记，hue 各异）：

```ts
export const moodHueMap: Record<string, string> = {
  // 暖红族 · 喜
  开心: '#c56473',
  激动: '#d97d56',
  // 雾灰族 · 哀
  伤心: '#7a8893',
  大哭: '#5e6b78',
  悲哀: '#7d7065',
  不快: '#8a8579',
  // 赭赤族 · 怒 / 痛
  生气: '#a64953',
  可恶: '#8b3a3e',
  痛苦: '#6b3a3e',
  // 暖灰族 · 忧 / 惧
  担心: '#a8896a',
  焦虑: '#a8745b',
  绝望: '#5c5048',
  可怕: '#6b5b48',
}
```

**fallback**：

- `weather2hue(w)`：未命中 → `var(--c-letter-warm)`
- `mood2hue(m)`：未命中 → `var(--c-letter-warm)`

**dark mode**：hex 不另变（这些是 pigment，自带温感，dark 下仍 readable on dark paper）。

## 6. Design tokens — Letter (paper accents)

加至 `packages/design-system/src/tokens.css`（在现 `--color-paper` / `--color-border` 之后新段 `Letter (paper accents)`）：

```css
/* light */
--c-letter-warm-deep: #8c6239;
--c-letter-warm:      #b09a78;
--c-letter-hairline:  rgba(140, 98, 57, 0.10);

/* dark — 沿 NoteListItemPaper 现行 inline 之色 */
@media (prefers-color-scheme: dark) {
  :root {
    --c-letter-warm-deep: #d4a574;
    --c-letter-warm:      #8a7860;
    --c-letter-hairline:  rgba(255, 255, 255, 0.06);
  }
}
```

（具体 dark 注入路径沿 `@custom-variant dark` / `apps/web/src/styles/variables.css` 现行约定，spec 不锁。）

**Tailwind 用法**：`text-[--c-letter-warm-deep]` / `border-[--c-letter-hairline]`。亦可在 design-system 包之 `tokens.css` 同时声明 `@theme` 之 `--color-letter-warm-deep` 等以使 Tailwind 之 `text-letter-warm-deep` shorthand 可用；本 spec 沿现包之约定（参 `--color-accent` 之 expose 模式）。

**CHEATSHEET 更新**：在 "Color > Accent and semantic" 表后加：

```md
### Letter (paper accents)

| Var | Hex (light) | Hex (dark) | Use |
|---|---|---|---|
| `--c-letter-warm-deep` | `#8c6239` | `#d4a574` | Letter caption (uppercase tracking) — date, stats, mood/weather italic |
| `--c-letter-warm`      | `#b09a78` | `#8a7860` | Letter caption secondary — AI / lang / © row |
| `--c-letter-hairline`  | `rgba(140,98,57,0.10)` | `rgba(255,255,255,0.06)` | NoteMetaBar / NoteLatestRender 之 letter stripe 分割线 |

NoteListItemPaper / NoteLatestRender / NoteMetaBar 之 letter-stationery 调性所用之共通色。**勿用于非 letter / paper 语境。**
```

## 7. 边界 / 空值 / fallback

| 缺 | 行为 |
| --- | --- |
| 无 mood && 无 weather | 上行中段 dom 不渲染；grid `1fr` 留空，stats 仍右锚 |
| 仅缺 mood 或仅缺 weather | 中段渲染剩余一项 |
| 无 stats（read / like / realtime 全 0 或 nullish） | 上行右段不渲染；grid 收为 `auto_1fr` |
| realtime = 0 / no room ctx | "now" number 段不渲染（不再以 opacity-40 占位） |
| 无 AI && 无 lang && 无 CC | 下行 + hairline 整不渲染 |
| 无 date | 不会发生（业务必有 createdAt）；防御性：上行左段不渲染 |
| weather / mood 字典未命中 | hue → `var(--c-letter-warm)`；label → 原字符串（沿现 `getWeatherLabel` fallback） |
| `aiGen` 是 `''` / null / undefined | 不渲染（沿现行判断） |

## 8. Mobile / responsive

- `md:` (≥ 768px) 三栏 grid 上行
- < md：上行 `flex flex-wrap gap-x-3 gap-y-1`，date + mood/weather wrap 一行；stats 自然换行至次（仍属"上行"语义块，hairline 仍在 stats 之后）

实现：上行 wrapper class

```
'flex flex-wrap items-baseline gap-x-3 gap-y-1 md:grid md:grid-cols-[auto_1fr_auto] md:gap-x-4'
```

stats 段在 mobile 下 `w-full md:w-auto md:justify-self-end`。

下行 layout 不变（caption row 横铺 flex wrap），mobile 下 © 仍 `ml-auto`。

## 9. Interaction & a11y

| 元素 | interaction | a11y |
| --- | --- | --- |
| date | `<FloatPopover>` hover 显 `modifiedAt`（保现行） | `<time dateTime={createdAt}>` |
| weather dot + label | `<FloatPopover>` hover 显原中文 key（"晴"） | dot `aria-hidden`；label 自带语义 |
| mood dot + label | 同上 | 同上 |
| stats `1,234 · 56 · 3` | 整段 `<FloatPopover>` hover 显完整文 "1,234 reads · 56 likes · 3 reading now" | 各数 `<span aria-label="N reads / likes / reading now">` |
| AI · provider | 保 `<AIGenBadge>` 之 hover preview 行为 | 沿现 badge a11y |
| `中 / EN ▾` | 保 `<TranslationLanguageSwitcher>` 之 dropdown 行为 | 沿现 switcher a11y |
| `©` | 保 `<FloatPopover>` tooltip 显 license 名（`post.copyright_license_tooltip`） | `<a aria-label="Creative Commons license">` |
| hairline | — | `aria-hidden`（border, 非 dom） |

mouse-only hover popover 在 mobile 上沿 `<FloatPopover mobileAsSheet>` 现行模式（tap to open sheet）。

## 10. 实现要点

### 10.1 NoteMetaBar 接口

无 props（沿现）。所有 data 经 `useCurrentNoteDataSelector` 内部取。

### 10.2 NoteMetaBar 内部组件分

```ts
<NoteMetaBar>             // 单 export，外层 wrapper
  <MetaBarUpperRow>       // 上行 grid 三段
    <MetaDate />          // 用 NoteHeaderDate 之 date data + tooltip 逻辑（直接 inline，不复用 export — 因样式差 enough）
    <MetaContextStream>   // 中段：mood / weather 之 italic + hue dot
    <MetaStats />         // 右段：极简 1,234 · 56 · 3 + popover
  </MetaBarUpperRow>
  <MetaBarLowerRow>       // 下行 + hairline；若内容皆空则整段不渲染
    <MetaAIGen />
    <MetaTranslation />
    <MetaCC />
  </MetaBarLowerRow>
</NoteMetaBar>
```

每子组件用 `useCurrentNoteDataSelector` 自取 data。`MetaBarLowerRow` 用 `Boolean(aiGen) || Boolean(translations) || true /* CC always */` 判 — 因 `©` 常显，下行实际"常在"；可省该 short-circuit，下行简化为常渲染（除非业务允禁 CC，本 spec 不考虑此 toggle）。

### 10.3 NoteHeaderDate 之变

`apps/web/src/app/[locale]/notes/(note-detail)/[id]/pageExtra.tsx` 内：

- `NoteDateMeta` 之 `<i className="i-mingcute-time-fill" />` 删
- `NoteDateMeta` 之外层 `<span class="inline-flex items-center space-x-1">` 简化为 `<span class="font-serif italic">`（letter italic 形态在此 component 内默认）
- `font-medium` 删（serif italic 不需 medium）
- 字号由调用方控（`NoteMetaBar` 内 wrapper 给 `text-copy-13`）

`NoteHeaderDate` 仍 export，preview page (`apps/web/src/app/[locale]/preview/page.tsx`) 仍直接调；preview 沿新 letter italic 形态自动跟变。

### 10.4 NoteLatestRender 之变

`EyebrowRow` 之 `item.icon` 由 `weather2icon()` / `mood2icon()` 改：

```ts
// 在 metaItemCandidates 构造处
{
  key: 'weather',
  icon: (
    <span
      aria-hidden
      className="inline-block size-1.5 rounded-full"
      style={{ background: weather2hue(note.weather) }}
    />
  ),
  label: getWeatherLabel(note.weather, tCommon),
}
```

`MdiClockOutline` 仍 import 留（date item 保 clock icon — 此为 NoteLatestRender 之 letter-uppercase eyebrow row 风格，与 NoteMetaBar 之 serif italic 之 date 形态有别，clock icon 在此 row 仍 fit）。

### 10.5 meta-icon.ts 重写后形态

```ts
// 新增
export const weatherHueMap: Record<string, string> = { /* 见 §5 */ }
export const moodHueMap: Record<string, string> = { /* 见 §5 */ }

export const weather2hue = (weather: string): string =>
  weatherHueMap[weather] ?? 'var(--c-letter-warm)'

export const mood2hue = (mood: string): string =>
  moodHueMap[mood] ?? 'var(--c-letter-warm)'

// 删
weatherIconClassMap, moodIconMap, DEFAULT_WEATHER_ICON_CLASS,
weather2icon, mood2icon

// 保
weatherTranslationKeyMap, moodTranslationKeyMap,
getWeatherLabel, getMoodLabel
```

`React` / `FC` import 同删（无 createElement / FC 用途）。

### 10.6 emoji.tsx 删

确认无 orphan：search 全仓 import `from '~/components/icons/emoji'` 与 `EmojiSmile`/`EmojiAngry`/`EmojiSadCry`/`EmojiSadTear`/`EmojiTired`/`EmojiMeh`/`EmojiGrinSquintTears`/`EmojiFrownOpen`/`EmojiGrimace`/`EmojiFlushed`/`EmojiAngry` 全无（已验，仅 meta-icon.ts 用）。

### 10.7 NoteMetaReadingCount 之合并

现 `NoteMetaReadingCount` 是 `apps/web/src/components/modules/note/NoteMetaBar.tsx` 之 export，渲染 `<CurrentReadingCountingMetaBarItem className="font-medium" leftElement={dividerVertical} />`。

新形态下：

- `NoteMetaReadingCount` export **删**
- 其内部 `useCurrentRoomCount` 之 atom hook 调入 `MetaStats` 之内（取 `count`，与 `readCount` / `likeCount` 同 source）
- `CurrentReadingCountingMetaBarItem` 仍 export 不变（共用组件，他处或用），但 NoteMetaBar 不再调用

`NoteDetailClient.tsx` 之 `<NoteMetaBar /> <NoteMetaReadingCount />` 改为单 `<NoteMetaBar />`。

## 11. 实现顺序（提供给后续 plan）

1. design-system 包加 letter tokens + CHEATSHEET 更新；`pnpm --filter @yohaku/design-system check` 验过
2. `lib/meta-icon.ts` 重写（删 icon, 加 hue）
3. `components/icons/emoji.tsx` 删
4. `NoteLatestRender.tsx` 之 EyebrowRow 改（最小 diff — 仅 icon 字段）
5. `pageExtra.tsx` 之 `NoteHeaderDate` / `NoteDateMeta` 改（删 clock icon + 调字体形态）
6. `NoteMetaBar.tsx` 全重写
7. `NoteDetailClient.tsx` 之 row 改单 `<NoteMetaBar />`
8. `preview/page.tsx` 与 `NotePreview.tsx` 走查；皆已用 `<NoteMetaBar />` 单 export，无需改 markup（自动随变）

每步独立可 typecheck / lint。重设涉两 caller（NoteMetaBar + NoteLatestRender），分两 commit 也可。

## 12. Open questions

- (a) Tailwind shorthand：是否在 design-system 包之 `tokens.css` 之 `@theme` 内 expose `--color-letter-warm-deep` 以使 `text-letter-warm-deep` 之 class 可用？现 spec 沿 `text-[--c-letter-warm-deep]` 之 inline var pattern；若 expose，则 mockup / template 之 patterns 须同改。本 spec 默认 inline var，待实现时若觉笨可改 expose。
- (b) NoteLatestRender 之 date item 之 `MdiClockOutline` 与 NoteMetaBar 之 serif italic date 形态有别 — 是 design 之故意（两处 row 风格本异：NoteLatestRender 之 row 是 uppercase caption，NoteMetaBar 之上行是 serif italic）。本 spec 默认保留，若 future 欲统一可同削。

## 13. 验证

- 实现后开 `/notes/<nid>` 详情页（含 weather + mood + read + like + AI + translation 全 fields 之 note）人工验
- mobile viewport（< 768px）验 wrap 行为
- dark mode 验暖色 token 倒
- 空值边界：取 / 造一无 weather / mood / AI / translation 之 note 验
- a11y：screen reader 验 stats `aria-label` 与 dot `aria-hidden`
- `pnpm --filter @yohaku/web lint`
- `pnpm --filter @yohaku/design-system check`
