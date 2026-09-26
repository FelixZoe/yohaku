# mobile 多语言 + AI 通知卡

2026-08-12 · 状态：已批准

## 背景与范围

web 详情页正文之上有一张 `PostNoticeCard`（`apps/web/src/app/[locale]/posts/
(post-detail)/[category]/[slug]/pageExtra.tsx:197`），按需堆叠 banner、过期
提醒、相关文章、翻译提示、摘要/关键洞察、skills 六类 item。mobile 详情页
（`post-detail.tsx`）目前只有 header → `ArticleBody` → `ArticleTail`，无对应
区域；更靠下的一层是 `api/client.ts:107` 的 `requestDetail` 只提取
`meta.enrichments`，`summary` / `insights` / `related` / `skills` /
`translation` / `tts` 全部丢弃，SQLite 也没有承接列。

mx-core 侧能力齐备（`apps/core/src/common/response/meta.types.ts`）：
`PostResponseMeta` 含 `summary`（`{id,text,lang,createdAt}`）、`related`
（`RelatedRefSchema` 是 `.passthrough()`，实测条目带完整 `category` 对象）、
`translation`（**以 article id 为 key 的 map**，值为 `{article:{isTranslated,
sourceLang,targetLang,model,availableTranslations}}`）、`insights`、`skills`、
`paywall`、`tts`；`NoteResponseMeta` 只有 `insights` / `summary` / `tts`。

翻译由请求语言驱动：`Lang` 装饰器（`common/decorators/lang.decorator.ts`）
取值优先级 `query.lang > header['x-lang']`。mobile 把 `accept-language` 显式
清空（绕 mx-core 的 `GET /notes/nid/:nid` 500 bug，`client.ts:63`）且从不传
`?lang=`，因此 `isTranslated` 恒为 false —— **翻译 item 在多语言落地前是死
代码**。这决定了本轮把多语言作为前置子项目。

本轮包含：mobile 多语言（界面文案 + 内容语言 + 缓存分键 + 切换入口）；详情页
AI 通知卡透出摘要、相关阅读、翻译来源。
明确排除：skills 卡片、TTS 入口、余白深度解读抽屉（`YohakuDrawerPaper` 对应
物）、banner、过期提醒、web 端任何改动。

## 已定决策

- 拆两部分，A（多语言）是 B（通知卡）的前置；同一分支、同一 migration 落地。
- i18n **自建极简 `t()`**，不引入 i18n-js / react-i18next；唯一新依赖
  `expo-localization`。
- 界面语言与内容语言**合一**（与 web 同构），一个 locale 同时决定文案和
  `?lang=`。
- 缓存**按语言分键**：`posts` / `notes` / `categories` 加 `lang` 列，主键改
  `(id, lang)`。不清库重拉，旧语言行保留、离线可用。
- 摘要在卡内**收成一行入口**，全文走原生 formSheet；不在卡内展开（真实摘要
  ~230 字，展开会把正文推出首屏）。
- 通知卡容器 = `Paper` 底 + accent 套色 + 右上角暖琥珀洇痕，走 RN 0.86 原生
  `experimental_backgroundImage`（linear + radial 均支持，见
  `react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts:520`），不引入
  `expo-linear-gradient`。
- 翻译行**不带「查看原文」**：mobile 已有语言切换，看原文即切语言，不在文章
  内开第二个入口。
- meta 落库用**单个 JSON 列** `article_meta`，不拆成三列——纯展示数据、同读
  同写，后续补 skills / tts 不必再动 schema。

---

# A · 多语言

## locale 模型

新目录 `src/i18n/`：

- **`config.ts`**：`locales = ['zh','zh-TW','en','ja','ko'] as const`、
  `defaultLocale = 'zh'`，与 `apps/web/src/i18n/config.ts` 逐字对齐。
- **`locale-store.ts`**：照 `auth/session-store.ts` 的 `useSyncExternalStore`
  模式（mobile 无 jotai，遵循既有约定）。导出 `getLocale()`（同步，供非 React
  的 api client 用）、`setLocale()`、`useLocale()`。
- 初值：`SecureStore.getItem('locale')` —— **同步 API**
  （`expo-secure-store` 的 `getItem`，非 `getItemAsync`）。这一点是必需的：
  locale 要在 drizzle migration 完成前就可读，走 SQLite 会有先有鸡还是先有蛋
  的问题。未存过则用 `expo-localization` 的 `getLocales()[0]` best-match：
  `zh-Hant-*` → `zh-TW`，其余 `zh-*` → `zh`，精确命中直取，未命中 → `zh`。
- `setLocale()` 同步写 SecureStore + 通知 listeners，再触发一次
  `syncAll({ force: true })`。

## 文案目录

`src/i18n/messages/zh.ts` 为 source of truth（`as const`），其余四个
`satisfies typeof zh` —— key 缺失即 tsc 报错，比 web 的运行时
`message-usage.test.ts` 更早拦截。约 95 条现有硬编码中文，分布在 22 个文件。

`useTranslations(ns)` 返回 `t(key, vars?)`，插值用 `{name}` 占位符做字符串
替换。**不使用 `Intl.RelativeTimeFormat`** —— Hermes 的 ICU 覆盖度需真机验证，
不值得为 5 个时间档位赌它。`lib/datetime.ts` 的中文拼接改为 catalog 模板
（`'{n} 分钟前'` / `'{n}m ago'`），`formatRelativeTime` 签名加 locale 参数，
既有单测同步改造。

## 内容语言下发

`api/client.ts` 的 `buildQuery`（`client.ts:30`）统一注入 `lang: getLocale()`。
保留 `accept-language: ''` 不动——`Lang` 装饰器 `query.lang` 优先级更高，两者
不冲突，且继续规避 notes 500 bug。

实测确认列表接口同样受 `lang` 影响：`GET /posts?lang=en` 返回翻译后的 `title`
**以及翻译后的 `category.name`**，所以 `categories` 表也必须分键。

## 缓存分键

`posts` / `notes` / `categories` 加 `lang: text('lang').notNull()`，主键改
`(id, lang)` 复合主键。三个必须一起改。

三处非显然的连带修改：

- **`notes.nid` 现为 `.unique()`**（`db/schema.ts:31`）。插入第二种语言的同
  一条手记当场唯一约束冲突，须改为 `(nid, lang)` 复合唯一。
- **`syncCategories` 的 `notInArray` 剪枝**（`sync/engine.ts:92`）必须加
  `eq(categories.lang, lang)`，否则同步 en 会把 zh 的分类全删。`syncPosts` /
  `syncNotes` 不剪枝，不受影响。
- **`refreshPostBody` / `refreshNoteBody`** 的 `.where(eq(posts.id, row.id))`
  须补 lang 条件，否则会跨语言覆写。

其余 query 站点（5 个文件、13 处）统一补 `eq(table.lang, locale)`：
`lists/posts-list.tsx`、`lists/notes-list.tsx`、`details/post-detail.tsx`、
`details/note-detail.tsx`、`sync/engine.ts`。

`liked_refs` 按 `refId` 键，与语言无关，不改。

## 切换入口

`me-screen` 新增一张「偏好」`Paper` 卡，一行 `语言 / 简体中文 ›`
（`SinkPressable` + `cardRow` 既有样式）。点开新路由 `src/app/locale.tsx`，照
`_layout.tsx:105` 的 `login` 配置：`presentation: 'formSheet'`、
`sheetAllowedDetents: [0.5]`、`sheetGrabberVisible: true`。5 个选项用普通
`View` 列表，**不放 ScrollView** —— formSheet 内 ScrollView 若非 screen 直接
子级会零高度渲染成空白页，5 项无需滚动，直接绕开。

选中项右侧 accent 勾；点选即 `setLocale()` 并 dismiss。

---

# B · AI 通知卡

## meta 管线

`api/client.ts` 的 `requestDetail`（`client.ts:107`）现只挑
`meta.enrichments`，扩展为一并抽取 `summary` / `related` / `translation`。
payload 是 snake_case（`created_at`、`is_translated`、`source_lang`、
`available_translations`），须走 `camelize`；`enrichments` 那条「map key 是
URL 不能整体 camelize」的例外（`client.ts:117`）不适用于新字段。

新增 **`src/api/article-meta.ts`**：纯函数
`extractArticleMeta(rawMeta) → ArticleNoticeMeta | null`。

```ts
interface ArticleNoticeMeta {
  summary: { text: string; source: 'author' | 'ai'; createdAt: string | null } | null
  related: { id: string; title: string; categorySlug: string | null; slug: string | null; nid: number | null }[]
  translation: { sourceLang: string | null; targetLang: string | null } | null
}
```

- `translation` 是**以 article id 为 key 的 map**，详情响应只有一个 key，取
  `Object.values()[0]?.article`；仅在 `isTranslated` 为真时产出对象，否则
  `null`。web 的 `flattenTranslation`（`lib/api/article-meta.ts:62`）在处理同
  一件事。
- `summary.source` 由调用方判定：`post.summary`（手写）非空取 `'author'`，
  否则落 `meta.summary.text` 记 `'ai'` —— 与 web `SummarySwitcher.tsx:27` 同
  一优先级。`createdAt` 仅 `'ai'` 时有值。
- 三者皆空时整体返回 `null`。

## 落库

`posts` / `notes` 加 `article_meta` JSON 列，写法同 `enrichments`：
`text('article_meta', { mode: 'json' }).$type<ArticleNoticeMeta | null>()`。
主键已是 `(id, lang)`，故天然按语言分开，无需额外处理。

`postBodyFromApi` / `noteBodyFromApi`（`sync/merge.ts`）签名增加 meta 参数，
内部完成 author/ai 的来源判定后写入。

注意 `excerpt` 现为 `post.summary ?? post.text`（`merge.ts:38`），把手写摘要
和正文截断混在一列，**不可**用它判断有无手写摘要——判定只看 `post.summary`
原始字段。`excerpt` 语义与列表展示保持不变。

## 组件结构

- **`src/components/ui/notice-card.tsx`**：`NoticeCard` 容器 + `NoticeRow`。
  容器 = `Paper` 底叠两层 `experimental_backgroundImage`：135° accent 套色
  linear + 右上角暖琥珀 radial 洇痕。web 的数值（`accent/[0.04]`、
  `rgba(255,228,180,0.12)`、120px）是给宽卡调的，手机卡宽 ~353pt 须上调：
  light 用 `rgba(255,228,180,0.16)` / r150，dark 减半到 `0.10`（对应 web 的
  `dark:opacity-50`）。行内距 `18 × 14` 对齐 web `px-[18px] py-3.5`；行间
  `StyleSheet.hairlineWidth`，同 `article-tail.tsx:83`。空子节点整卡不渲染
  （对齐 `NoticeCard.tsx:19`）。
- **`src/screens/details/article-notice.tsx`**：组装，post / note 共用。按 web
  顺序渲染：翻译 → 相关阅读 → 关键洞察。
- **`src/app/summary/[kind]/[id].tsx`**：摘要全文 formSheet，
  `sheetAllowedDetents: [0.62, 1]`。**路由只带 `kind` + `id`**，正文从
  SQLite 读——local-first，不把几百字塞进路由参数。sheet 内 `ScrollView`
  必须是 screen 的直接子级，包一层 `View` 会整页空白。底部
  `AI 生成 · {日期}` 落款仅 `source === 'ai'` 时出现。

行的形态：

| 行 | 内容 | 交互 |
| --- | --- | --- |
| 翻译 | 地球图标 + 「本文由 AI 译自{语言}」 | 无 |
| 相关阅读 | 标题行 + 每条 `↳ 标题` | `/posts/{categorySlug}/{slug}` |
| 摘要 | ✦ + 「摘要」\|「关键洞察」+ chevron | 推 summary formSheet |

摘要行标题随来源切换（`'author'` → 「摘要」，`'ai'` → 「关键洞察」），与
`pageExtra.tsx:289` 一致。相关条目缺 `categorySlug` 或 `slug` 时跳过该条而非
渲染死链。

## 挂载

`post-detail.tsx:125` 的 header `</View>` 之后、`ArticleBody` 之前插入
`<ArticleNotice meta={post.articleMeta} />`。`note-detail.tsx` 同理——note 无
`related`，同一组件按数据有无自动收敛，常态是只有摘要一行。

`experiments.typedRoutes` 开启，新增 route 后需重新生成路由类型。

## 迁移

单个 drizzle-kit migration `0003`：加 `lang` 列、改三表主键、改 `notes` 唯一
约束、加 `article_meta` 列。SQLite 无法 ALTER 主键，drizzle-kit 会展开为建新
表 + 拷贝 + 换名。既有行的 `lang` 回填为 `'zh'`（当前唯一的实际语言）。

`useMigrations` 已在 root layout（`_layout.tsx:37`），失败路径已有兜底 UI。

## 错误处理与降级

- `extractArticleMeta` 对任何字段形状异常一律降级为 `null` / `[]`，不抛。
  meta 是锦上添花，不能让详情页挂掉。
- 通知卡数据缺失即整卡不渲染，正文直接接在标题下方，不留空壳。
- summary formSheet 若按 id 查不到行（缓存被清），显示一行占位并可 dismiss。
- 切语言后首次同步失败：沿用现有 `setSyncStatus('error')`，旧语言数据仍在，
  界面文案已切、内容仍是旧语言——可接受的中间态，下次同步自愈。

## 验证

- Vitest：`extractArticleMeta`（translation map 扁平化、author/ai 来源判定、
  异常 payload 降级、三者皆空返回 null）；locale best-match（`zh-Hant-TW` →
  `zh-TW`、未知 → `zh`）；文案 catalog 五语言 key 对齐（tsc 已保证，补一条
  运行时断言防 `as const` 漏写）；`formatRelativeTime` 多语言。
- 模拟器：切换五种语言后列表 / 详情标题与分类名随之变化；切回旧语言秒出
  （复合主键生效，非重新拉取）；英文下详情页出现三行通知卡、中文下两行；
  点关键洞察推 formSheet 且内容可滚；点相关条目正确推栈；note 详情只有摘要
  一行；`syncCategories` 切语言后旧语言分类未被删。
- 明暗两主题下核对洇痕浓度与 hairline 对比度。
