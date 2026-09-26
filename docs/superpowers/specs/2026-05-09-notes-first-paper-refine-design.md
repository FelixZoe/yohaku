# Notes First Paper 之 Refine

**Date:** 2026-05-09
**Scope:** `apps/web/src/app/[locale]/notes/page.tsx:68` 处 `PaperWithEntrance` 第一张 paper 之 layout / decoration / typography 全面 refine。Topic-color 之 warm-spread 改作为 global 改影响 note detail 页之 binder。涉 `NoteLatestRender`、`NoteTopicBinderClip`、`lib/color`
**Status:** spec, not implemented

## 1. 背景与目标

`/notes/` 列表页第一屏（`isFirstPage && latestNote` 时）为一张高视觉密度之 paper：

- 顶左 binder clip（`NoteTopicBinderClip`，dynamic topic-hue saturated）
- 顶右 NID watermark（`#127`，6% opacity，几不可见）
- meta row：mobile topic pill + weather + mood
- title（sans-serif bold tracking-tight，2xl→28px）
- date 长格式
- 可选 cover（max-h 280px，hover scale 1.02）
- content preview（mask 60%→100%）
- LetterBottom：washi tape（45° 条纹）+ italic handwritten link + postmark stamp（圆形「Letter / Post」）+ tape accent piece

问题：

- **意象杂糅**：clip（office）+ stamp（postal）+ washi（stationery）+ handwritten link，多 metaphor 互争。
- **冗 decoration**：postmark stamp 与 tape accent 仅装饰，无信息载荷；NID watermark 6% 几不可见，未尽其位。
- **hierarchy 软**：title sans-serif、preview mask 起点 60% 偏晚而硬切；眉部 weather/mood 与 mobile pill 混排无 rhythm。
- **binder hue 全谱激越**：cool blue / pink topic 落于 warm paper 上偶有违和。

本次 refine 之核心：**守 letter / stationery 之骨，去其冗，紧 hierarchy；topic-color 收敛入 warm 扇区与 paper 同族；cover 升至 paper 顶之 immersive hero，title / eyebrow 浮其上以 magazine 之力收读者第一目。**

**两态 layout**：

- `note.meta?.cover` **存** → **hero 态**：cover 全宽全高升至 paper 顶 edge-to-edge，dark scrim 覆其上，eyebrow + title 白字浮 hero 下端；preview + footer 仍 paper-padded
- `note.meta?.cover` **缺** → **letter 态**：无 hero；eyebrow + title 走 paper 正常 padding，与 §4.2 / §4.3 之 dark-on-paper 变体同

## 2. Non-goals

- 不动 `PaperWithEntrance` / `Paper` / `PaperSheet` 之 stack / deckle / 入场动画
- 不动 `/notes/` 第二屏起的 timeline 列（`NoteListTimeline`）与 pagination
- 不动 `NoteLatestRender` 内本地 `MobileTopicTag` 之 markup 结构（仅 hue 计算改用 `topicWarmHue`）
- 不动 `NoteLatestLexicalPreview` / `Markdown` 之渲染管线
- 不动 `topicStringToHue` 之 hash 算法（仅在其上加 warm-mapping layer）
- 不为本 paper 加新 i18n key（除已有 `note.read_full_note` 之外）
- 不引入新 npm 依赖

## 3. Architecture

涉文件（~3 改）：

| 文件 | 改动 |
| --- | --- |
| `apps/web/src/components/modules/note/NoteLatestRender.tsx` | 主 rewrite：删 NID watermark / postmark / tape accent / washi tape；条件分两态 —— **hero 态**（cover 存）：cover 全宽全高升至 paper 顶 + scrim + eyebrow/title overlay；**letter 态**（cover 缺）：eyebrow + title 走 paper 正常 padding；preview mask 50%；底部 footer flex space-between + hairline rule + stationery mark 左 / read-more 右；本地 `MobileTopicTag` 用新 warm hue |
| `apps/web/src/components/modules/note/NoteTopicBinderClip.tsx` | binder 与 `NoteTopicInlineTag` 内 hue 计算由 `topicStringToHue` 改为新 `topicWarmHue`；`topicColors` API 不变（其内部已用 warm hue）|
| `apps/web/src/lib/color.ts` | 加 `topicWarmHue(name): number`，将 `topicStringToHue` 之 0-360° hue remap 至 warm 扇区 5°-65°；改 `topicColors` 内部用 `topicWarmHue`，sat 提至 52%（light）/ 42%（dark），L 调谐见 §4.7 |

`topicStringToHue` 保留不动（为他处之非 stationery 用途备）。

注：`NoteTopicBinderClip` 与 `NoteTopicInlineTag` 同被 `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx` 引用。本 spec 之 warm-spread 改为 global，故 note detail 页之 binder / inline tag 同变 warm 色调（贯之 letter / stationery 意象，不另加 prop / variant）。无新增文件。无 API / data shape 变。

## 4. 元素逐项之改

### 4.1 NID watermark — 删

现状：`<span className="absolute -top-1 right-0 ... text-5xl ... text-neutral-9/[.06]">#{nid}</span>`，6% 透明度几不可见。

改：删去整 span。NID 重现于底部 stationery mark（`Letter №<nid>`），位单一不冗。

### 4.2 Eyebrow meta row — 替原 meta + 吞 date

现状（含 mobile pill + weather + mood，date 另作一独立 div）：

```tsx
<div className="mb-2.5 flex items-center gap-2 text-xs">
  {note.topic && <MobileTopicTag name={note.topic.name} />}
  {note.weather && <span className="text-neutral-6">{note.weather}</span>}
  {note.mood && <span className="text-neutral-6">{note.mood}</span>}
</div>
{/* ... title ... */}
<div className="mb-6 text-xs text-neutral-6">{format.dateTime(...)}</div>
```

改后：

- **合并** weather / mood / date 入同一 eyebrow row，置于 title 之**前**
- **保留** mobile `MobileTopicTag` 独占一行（`lg:hidden`）；letter 态时位于 eyebrow row 之前；hero 态时位于 hero overlay 之**外**之上方（详 §4.4）
- eyebrow row：`flex flex-wrap items-center gap-x-3 gap-y-1` `font-serif text-[11px] uppercase tracking-[0.16em]`
- **两 variant**：
  - **letter 态（无 cover）**：text `text-neutral-6`，dot `bg-neutral-6/60`（neutral token 自反 light/dark）
  - **hero 态（cover 存）**：text `text-[rgba(250,246,238,0.78)]`，dot `bg-[rgba(250,246,238,0.5)]`（白字 over scrim，无须 dark variant —— scrim 永暗）
- 元素间 separator：3px 圆点
- **render 模式**：先收集 present 之项 `[weather, mood, formattedDate].filter(Boolean)`，遍历时 `index > 0` 处先吐 dot 再吐项；故首项前无 dot，缺项不留空 dot
- date 用既有 `format.dateTime(date, { year, month, day, weekday })`
- spacing：
  - letter 态：eyebrow row `mb-3`
  - hero 态：eyebrow row `mb-1.5`（hero overlay 之内空间紧）

### 4.3 Title — 改 serif

现状：`mb-1.5 max-w-[calc(100%-5rem)] text-2xl font-bold tracking-tight text-neutral-9 lg:max-w-[calc(100%-6rem)] lg:text-[28px]`，默认 sans。

改：

- 字体：`font-serif`（项目 `--font-serif` token，与 letter 之正文 prose 同族）
- 重量：`font-bold`（保 700）
- 字号：
  - letter 态：`text-2xl lg:text-[30px]`
  - hero 态：`text-2xl lg:text-[32px]`（沉浸 hero 下略大以撑视觉重）
- line-height：`leading-[1.18]`
- letter-spacing：`tracking-tight` 不变
- max-width：删去 `calc(100% - 5rem)` / `calc(100% - 6rem)` —— NID watermark 既删无须再让位
- spacing：letter 态 `mb-5` 替 `mb-1.5`（吞 date 之 spacing）；hero 态 `mb-0`（hero 内 title 为最末元素）
- color：
  - letter 态：`text-neutral-9`（自反 light/dark）
  - hero 态：`text-[#faf6ee]`（hardcoded paper-cream，over dark scrim 永亮）
- hover：letter 态 `hover:text-accent`；hero 态 `hover:opacity-85`（白字不宜变 hue，改透明度反馈）
- text-shadow：hero 态加 `text-shadow: 0 1px 2px rgba(0,0,0,0.25)`，提白字 over 复杂 photo 之可读性

### 4.4 Cover image — immersive hero overlay

现状：`mb-6 block overflow-hidden rounded-lg`，`<img className="w-full object-cover transition-transform duration-300 hover:scale-[1.02]" style={{ maxHeight: '280px' }}>`，位于 title 之**后**，居 paper padding 之内。

改：cover 升至 paper 顶 edge-to-edge，dark scrim 覆其上，eyebrow + title 浮 hero 下端 paper-padding-aligned。

#### 4.4.1 Hero 容器

```tsx
<Link
  href={href}
  className="relative isolate block overflow-hidden h-[220px] md:h-[280px] -mx-4 -mt-8 md:-mx-[45px] md:-mt-[30px]"
>
  <img className="absolute inset-0 h-full w-full object-cover" src={coverSrc} alt={...} />
  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,10,0.05)_0%,rgba(20,15,10,0.25)_55%,rgba(20,15,10,0.78)_100%)]" aria-hidden />
  <div className="absolute inset-x-0 bottom-0 px-4 pb-5 pt-10 md:px-[45px] md:pb-6 md:pt-14">
    {/* eyebrow + title — hero variant 见 §4.2 / §4.3 */}
  </div>
</Link>
```

要点：

- **negative margins** `-mx-4 -mt-8 md:-mx-[45px] md:-mt-[30px]`：抵消 `Paper` 之 `p-[2rem_1rem] md:p-[30px_45px]`，使 hero 真正贴到 paper edge；详 §4.4.4
- **isolate**：hero root 加 `isolate`（`isolation: isolate`）以新建 stacking context，使 hero 内之 absolute children（img / scrim / overlay）不外溢；binder clip（在 hero 之外，paper 之内）以更高 z-index 浮其上
- **height**：mobile 220px，md+ 280px（沉浸但不压全屏，留 eyebrow/title 呼吸位）
- **整 hero 为 `<Link>`**：tap/click hero 任处直跳 detail page；title 之内 hover 由 §4.3 之 `hover:opacity-85` 提示
- **删 hover scale** 不变
- scrim：linear-gradient `rgba(20,15,10, 5% → 25% → 78%)` 三 stop。顶端微暗以让 binder clip 与 paper 顶融合，底端深暗以撑白字
- overlay 内 padding：水平随 paper（`px-4 md:px-[45px]`），底端 `pb-6 md:pb-7`，顶端 `pt-10 md:pt-14`（拉 title 离 hero 中点偏下）

#### 4.4.2 Hero 内之 eyebrow + title

按 §4.2 hero variant + §4.3 hero variant 渲染。注意 title 不再是 `<Link>` 包裹（因整 hero 即 link）—— 直接 `<h1>` 即可：

```tsx
<h1
  className="font-serif font-bold tracking-tight leading-[1.18] text-2xl lg:text-[32px]
             text-[#faf6ee] [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] m-0"
>
  {note.title}
</h1>
```

#### 4.4.3 Binder clip 之 layering

`NoteTopicBinderClip` 仍 `lg:block` `absolute -left-[3px] -top-[3px] z-[2]`。在 hero 态下：

- binder 之 z-index 提至 `z-[3]`，确保浮 hero overlay 之上
- binder 物理位置不变 `-top-[3px] -left-[3px]`，仍贴 paper 之顶左角
- 视觉效果：clip 夹住 paper 之顶端，paper 顶端是一张 photo —— 自然意象

#### 4.4.4 Negative margin 与 PaperWithEntrance 之协调

`PaperWithEntrance` (`PaperWithEntrance` → `Paper`) 默认 `p-[2rem_1rem] md:p-[30px_45px]`。本 hero 用 negative margin 抵消该 padding 以达 edge-to-edge：

| 断点 | Paper padding | Hero negative margin |
| --- | --- | --- |
| mobile (default) | `2rem 1rem` (32 16) | `-mx-4 -mt-8` |
| md+ | `30px 45px` | `-mx-[45px] -mt-[30px]` |

注：`Paper` 之 padding 由 `apps/web/src/components/layout/container/Paper.tsx` 内 `<div className={clsxm('relative p-[2rem_1rem] md:p-[30px_45px]', contentClassName)}>` 输出。本 spec **不动 Paper 之 padding**，仅在 NoteLatestRender 内之 hero 用 negative margin 反向抵消。

若日后 Paper padding 调整，hero negative margin 须同步 —— 此为已知耦合。

#### 4.4.5 Letter 态（cover 缺）之 fallback

cover 缺时整 hero 块不渲染。eyebrow + title 走 paper 正常 padding，按 §4.2 letter variant 与 §4.3 letter variant 渲染：

```tsx
<div className="mt-6">
  <MobileTopicTag />          {/* lg:hidden */}
  <div className="eyebrow ... text-neutral-6">{...}</div>  {/* letter variant */}
  <h1 className="text-neutral-9 ... mb-5">              {/* letter variant，wrap Link */}
    <Link href={href} className="hover:text-accent transition-colors">{title}</Link>
  </h1>
</div>
```

**重要**：letter 态下 title **包 `<Link>`**（与原代码同），hero 态下 title **不包 Link**（整 hero 已是 Link）。这是两态唯一之 markup 拓扑差。

### 4.5 Content preview — 微 refine

现状：

```tsx
<div className="max-h-[calc(100vh-40rem)] overflow-hidden"
  style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', ... }}>
```

改：

- mask 起点 60% → 50%（更柔之渐隐，不致硬切）
- max-h 不变（`calc(100vh-40rem)`）
- inner article：保 lexical / markdown 双路；`prose` className 已含 serif，不动

### 4.6 Bottom — 全替 LetterBottom

现状 `<LetterBottom>` 含：washi tape（light + dark 二份）、italic handwritten link 居中、postmark stamp 圆形右下、tape accent piece 右下偏上。

改后：弃 `LetterBottom`，inline 一新 footer block：

```tsx
<footer className="mt-7 flex items-baseline justify-between gap-6 border-t border-[rgba(60,40,20,0.08)] pt-4 dark:border-white/[0.06]">
  <span
    className="font-serif text-[10.5px] uppercase tracking-[0.24em] text-[#b09a78] dark:text-[#8a7860]"
  >
    Yohaku &middot; Letter №<span className="tabular-nums">{nid}</span>
  </span>
  <Link
    className="whitespace-nowrap font-serif text-sm italic text-[#8c6239] tracking-[0.03em] transition-opacity hover:opacity-70 focus-visible:opacity-70 dark:text-[#d4a574]"
    href={href}
  >
    {t('read_full_note')} →
  </Link>
</footer>
```

要点：

- **删** washi tape（light + dark 两 div 全去）
- **删** postmark stamp 圆形
- **删** tape accent piece
- **加** hairline rule（border-top 1px @ 8% warm-ink，dark 6% white）作分隔
- **左** stationery mark：`Yohaku · Letter №<nid>`，serif 10.5px uppercase，letter-spacing 0.24em，color `#b09a78`（light）/ `#8a7860`（dark）
  - 文案为固定 stationery 印记 `Yohaku · Letter №<nid>`，**不 i18n**（与 brand wordmark 同性质，CJK locale 下亦保留拉丁印记）；nid 用 `tabular-nums`
- **右** read-more：保现有 italic serif `t('read_full_note')`，warm brown `#8c6239` / `#d4a574`，箭头 `→` 直接附于 i18n 文之后
- spacing：`mt-7 pt-4`（原 LetterBottom `mt-1 pb-4 sm:pb-12` 极宽松，今收敛）

### 4.7 Topic warm-mapped color — global

现状：`topicColors(name, isDark)` 用 `topicStringToHue` 全 360° 之 hue（cool blue / green / pink 皆可），sat 35%，L 40/45/35（light）/ 50/55/45（dark）。`NoteTopicInlineTag` 与 `MobileTopicTag` 直接调 `topicStringToHue` 计 hue，亦走全谱。

改：

1. **新增** `lib/color.ts`：`topicWarmHue(name: string): number`

   ```ts
   export function topicWarmHue(name: string): number {
     const rawHue = topicStringToHue(name)
     // 0-360° → 5°-65° 之 warm 扇区（amber / sienna / ochre / olive 之间）
     return 5 + (rawHue / 360) * 60
   }
   ```

   `topicStringToHue` 不动；`topicWarmHue` 为新 stationery-tone 入口。

2. **改** `topicColors(name, isDark)` 内部用 `topicWarmHue` 替原 `topicStringToHue`，并提饱和、调 L 之 spread：

   ```ts
   export function topicColors(name: string, isDark: boolean) {
     const hue = topicWarmHue(name)
     const s = isDark ? 42 : 52
     const l = isDark ? 48 : 42  // mid (face center)
     return {
       from: `hsl(${hue}, ${s}%, ${l + 8}%)`,  // 50/56 — face top-left
       mid:  `hsl(${hue}, ${s}%, ${l}%)`,       // 42/48 — face center
       to:   `hsl(${hue}, ${s}%, ${l - 8}%)`,   // 34/40 — edge / tab base
     }
   }
   ```

   `from→mid→to` spread 由原 ±5 升至 ±8，face 之 3D 立体感略加；warm-only 故各 topic 间差异收敛而仍可辨。

3. **改** `NoteTopicBinderClip.tsx` 之 binder 主块（`NoteTopicBinderClip` 函数体）：line 33 `const hue = topicStringToHue(topic.name)` → `const hue = topicWarmHue(topic.name)`。该 hue 仅用于 vertical tab 之 hardcoded 渐变（line 81 `hsl(${hue}, 30%, ${isDark ? 38 : 28}%)`），保 tab 与 face 同族。binder 之 face 渐变用 `topicColors` 之返回，已含 warm hue，不需直接动。

4. **改** `NoteTopicBinderClip.tsx` 之 `NoteTopicInlineTag` block：内之 `topicStringToHue` → `topicWarmHue`，余 sat/L 算式不动（mobile pill 仍 muted-warm 一族）。

5. **改** `NoteLatestRender.tsx` 之本地 `MobileTopicTag`：内之 `topicStringToHue` → `topicWarmHue`。

`topicStringToHue` 之未来 non-stationery 用途（例：timeline card / topic page hero）若需别色域，自调用别 helper 即可；本 spec 不预设。

### 4.8 mobile 通考

- binder clip 仍 `lg:block`（unchanged），mobile 不显
- 本地 `MobileTopicTag` 仍 `lg:hidden`（unchanged），位于 eyebrow row 之**前**（详 §4.2）
- eyebrow row 之 weather/mood/date：mobile 同 row，过长则自然 wrap（`flex-wrap` + `gap-y-1`）；不需 stacked layout
- hero 高度断点见 §4.4（mobile h-[220px] / md+ h-[280px]）；letter 态无 cover 时此项不适用

## 5. Edge cases

| 情形 | 处理 |
| --- | --- |
| `note.meta?.cover` **缺** | 走 letter 态：无 hero；eyebrow + title 之 letter variant；title wrap `<Link>` |
| `note.meta?.cover` **存** | 走 hero 态：full-bleed hero + scrim + overlay；eyebrow + title 之 hero variant；hero 整体即 `<Link>` |
| `note.topic` 缺 | 不渲 binder（lg）/ inline pill（mobile）；hero 态下 hero 内仍渲 eyebrow + title |
| `weather` / `mood` 缺 | 跳过该格与其前 dot；若三者皆缺，仍渲 date |
| `note.content` / `note.text` 皆缺 | preview 块不渲；hero / letter 态后直接 footer |
| `note.contentFormat === 'lexical'` | 走 `NoteLatestLexicalPreview`；mask 同样作用其外层 wrapper |
| `note.contentFormat` 为 markdown | 走 `<Markdown variant="note">`；保 `prose` className |
| 极暗 cover image（深夜 / 黑底 photo） | scrim `rgba(20,15,10, 5%→25%→78%)` 已含 78% 底端深暗，白字仍可读；不需 fallback |
| 极亮 cover image（雪景 / 白底 photo） | scrim 顶端 5% 略浅，但底端 78% 仍足撑白字；title text-shadow 提一档可读性 |
| `t('read_full_note')` 极长之 locale（如 ru） | footer flex `gap-6`，过长时 stationery mark 会被压；必要时 stationery mark 加 `truncate` |
| nid 为多位数（如 №1234） | tabular-nums 保对齐；max width 不限 |

## 6. Light / Dark token 对照

| 元素 | Light | Dark |
| --- | --- | --- |
| Eyebrow text (letter 态) | `text-neutral-6` | (token 自反) |
| Eyebrow dot (letter 态) | `bg-neutral-6/60` | (token 自反) |
| Eyebrow text (hero 态) | `rgba(250,246,238,0.78)` | (永亮，无须分主题) |
| Eyebrow dot (hero 态) | `rgba(250,246,238,0.5)` | (永亮) |
| Title (letter 态) | `text-neutral-9` | (token 自反) |
| Title (hero 态) | `#faf6ee` + text-shadow `0 1px 2px rgba(0,0,0,0.25)` | (永亮) |
| Hero scrim | `linear-gradient(180deg, rgba(20,15,10,0.05), rgba(20,15,10,0.25) 55%, rgba(20,15,10,0.78))` | 同 |
| Footer hairline rule | `rgba(60,40,20,0.08)` | `rgba(255,255,255,0.06)` |
| Stationery mark | `#b09a78` | `#8a7860` |
| Read-more link | `#8c6239` | `#d4a574` |
| Binder clip warm sat | 52% | 42% |
| Binder clip warm L (mid) | 42% | 48% |

`text-neutral-*` 自动跟随 `@yohaku/design-system` token，无须显式 `dark:` variant。`#xxxxxx` 之 hardcoded 色为 letter / stationery 之刻意 warm-tone，**不**走 neutral 系。Hero 态之白字 / 暗 scrim 不分主题 —— scrim 永暗，文字永亮，与 page theme 解耦。

## 7. 验证 plan

- 手测 `/notes/?page=1` 第一屏：
  - 有 topic + weather + mood + cover 之 note（hero 态主路径）
  - 缺 cover 之 note（letter 态 fallback）
  - 缺 topic（无 binder；hero 态下 hero 内仍 eyebrow + title）
  - 缺 weather / mood（eyebrow 仅 date）
  - 长 title（多行，hero overlay 内不溢出）；nid 1 / 3 位数皆测
  - lexical content + markdown content 各一例
  - **极暗 cover** + **极亮 cover** 各一例，验白字 readability
- 视窗：mobile 375 / tablet 768 / desktop 1280 / 1440
  - hero 高度断点切换：mobile 220 / md+ 280，应平滑无 jump
  - hero negative margin 与 paper padding 之协调，paper 边沿不留缝
- 主题：light / dark 切换不闪烁、token 正确；hero scrim 与 binder clip 在两主题下 z-layering 皆对
- a11y：
  - hero 态 title 仍 h1；hero `<Link>` 之 focus-visible 须有可见 outline（默认 `focus-visible:ring-2 ring-accent` 或类似项目模式）
  - letter 态 title 包之 `<Link>` hover/focus 同
  - read-more `<Link>` 之 hover/focus 视觉同步
  - eyebrow row 不抢 focus（仅文本，无交互）
- 不跑 build；只在改动文件上跑 `pnpm --filter @yohaku/web lint`

## 8. Out-of-scope follow-ups

以下事虽相关，本 spec 不涉，留待另文：

- NoteTopicBinderClip 之 entrance animation `note-binder-clip-entering`（保现状）
- mobile 第一屏整体 spacing 与 PageColorGradient 之联动
- timeline 段（`NoteListTimeline`）与 pagination 之 refine
- post 列表 / thinking 页之同质 refine（若需统一 stationery 风骨）
