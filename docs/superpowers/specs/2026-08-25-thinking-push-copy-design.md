# 思考推送文案

2026-08-25 · 状态：实现中

跨仓库：`mx-core`（enqueue + Relay APNs）与 `yohaku-oss/apps/mobile`（loc-key）。对照稿：`docs/superpowers/plans/2026-08-25-push-copy-comparison-mockup.html`。网页判别逻辑已在 `apps/web/src/lib/enrichment/recently.ts`，本 spec 复用同一套，不新发明规则。

## 目标

锁屏上的思考通知读起来像首页 Musings：解出 TMDB / 书 / 专辑时写「Innei 观看了『EVA』」，解不出时写「Innei：下午的光把桌面切成两半。」文章和手记去掉「新文章 / 新手记」。旧 Relay 不做兼容，core / Relay / iOS 字符串一起发。

## 已定决策

- 标题一行吃「谁做了什么」。思考解出作品用 `{owner} {verb}「{work}」`；解不出用 `{owner}：{第一行}`。
- 副标题只给思考，且只在有 compact fact 时出现：先作者/歌手 `Radiohead · 2007`，否则形态+年份 `剧集 · 1995`，再没有就空着。
- 文章 / 手记 / 回复不写副标题。删除 `PUSH_CONTENT_*_SUBTITLE`。
- 正文：文章/手记用摘要；思考用站长自己写的话（链接旁的段落）。没有就不发 body loc-key。
- 整条内容只是一个解失败的 URL：不入队。
- 站长名来自 `ownerService.getOwner().name`，和聚合接口同一处。
- 五种语言全部走 APNs loc-key，服务端不拼中文整句。
- 同一事件 `dev.mx-space.content.published.v1`，`resource_type` 分成文章/手记与思考两支。不新开事件类型。
- 回复通知不改。

## 非目标

- 旧 Relay / 旧 iOS 字符串兜底。缺字段的思考事件 Relay 丢弃，不当 `Thinking` + `新思考` 发出。
- 文章分类、手记专题当副标题。
- 评分、类型标签、封面图、Notification Content Extension。
- 在 APNs 里带评论正文、作品简介、私有字段。
- 改网页 Musings 渲染。
- Android。

## 现状

`PushService.enqueueContentPublished` 对 recently 只读 `title` / `metadata.title`，没有就写成 `Thinking`。不看 `content`，也不看 create 时已经 hydrate 好的 `enrichments`。Relay 一律带 `subtitle-loc-key`（新文章 / 新手记 / 新思考）。`RECENTLY_CREATE` 的 payload 在 `warmEnrichments` + `attachEnrichments` 之后发出，enqueue 时 enrichment 通常已经在事件上。

## 锁屏对照

| 形态 | 标题 | 副标题 | 正文 |
| --- | --- | --- | --- |
| 文章 | 那些年我们一起追的前端 | — | 摘要 |
| 手记 | 京都的雨停了一会儿 | — | 摘要 |
| 思考 · TMDB + 原话 | Innei 观看了「新世紀エヴァンゲリオン」 | 剧集 · 1995 | 今晚重看了一遍… |
| 思考 · 纯链接电影 | Innei 观看了「Oppenheimer」 | 电影 · 2023 | — |
| 思考 · 书 | Innei 读了「一百年，许多人，许多事」 | 杨苡 口述 · 2021 | — |
| 思考 · 专辑 | Innei 听了「In Rainbows」 | Radiohead · 2007 | — |
| 思考 · GitHub | Innei 链接到「facebook/react」 | — | — |
| 思考 · 纯文本 | Innei：下午的光把桌面切成两半。 | — | 若有后续段落 |
| 思考 · 解失败的裸 URL | 不推 | | |
| 评论回复 | （通讯通知，不改） | — | 你在《…》中的评论收到了回复。 |

## 架构

```text
RECENTLY_CREATE (hydrated)
        │
        ▼
PushService.enqueueRecently
        │  owner.name
        │  parseRecentlyContent(content, enrichments)
        │  skip bare unresolved URL
        ▼
content.published.v1  data.resource_type = recently
        │
        ▼
Relay buildApnsPayload
        │  loc-key + args only
        ▼
APNs  →  设备本地化  →  锁屏
```

文章 / 手记仍走现有 `enqueueContentPublished`，只是 Relay 不再写 subtitle。

## 协议

事件类型不变。`ContentPublishedDataSchema` 改成按 `resource_type` 分支的 discriminated union。`strict()`。

### 文章 / 手记

```ts
{
  resource_id: string
  resource_type: 'post' | 'note'
  display_title: string        // 1–160
  summary?: string             // 1–360
  target_path: string
}
```

### 思考 · 解出作品

```ts
{
  resource_id: string
  resource_type: 'recently'
  target_path: string          // /thinking/:id
  kind: 'enriched'
  owner_name: string           // 1–80
  verb: 'watched' | 'read' | 'listened' | 'studied' | 'linked'
  work_title: string           // 1–160
  description?: string         // 1–360，站长自己的话
  fact_creator?: string        // 1–80
  fact_year?: string           // 4-digit year
  fact_type?: 'tv' | 'movie' | 'book' | 'album' | 'song'
}
```

`fact_creator` 与 `fact_type` 可以同时缺。有 `fact_creator` 时 Relay 用 creator 行，忽略 `fact_type`。只有 `fact_type` + `fact_year` 时用形态行。只有年份没有 creator / type：不发副标题（年份单独不成行）。

### 思考 · 纯文本

```ts
{
  resource_id: string
  resource_type: 'recently'
  target_path: string
  kind: 'plain'
  owner_name: string
  text: string                 // 第一行，1–160
  summary?: string             // 其余段落，1–360
}
```

`kind` 缺失或 recently 仍带旧的 `display_title`：Relay 视为无效，不投递。

## Core enqueue

`enqueueContentPublished` 拆出 recently 分支（或并列 `enqueueRecentlyPublished`）。输入优先用事件上的 hydrated `content` + `enrichments`；没有 map 再 `findGlobalById` 后按 recently 模块同一套 URL 抽取 hydrate。不在 enqueue 里发起新的外部 enrichment 请求。

判别与网页一致。解析函数放在 core 的 push 模块旁（不让 web 去依赖 push-protocol）。用同一组 fixture 对拍 `apps/web/src/lib/enrichment/recently.ts` 的 `kind` / `verb` / description，规则漂移时两边测试一起红。

1. `kind === 'enriched'` → 填 `verb`（见下表）、`work_title`、可选 `description`。
2. `kind === 'plain'` 且 trim 后是 http(s) URL → **不入队**。
3. `kind === 'plain'` → 第一行 `text`，其余段落拼进 `summary`。
4. `owner_name` 为空 → 不入队。
5. `work_title` / `text` 空 → 不入队。

动词（与 `pickRecentlyVerbKey` 相同，只是 key 名去掉 `musings_verb_` 前缀）：

| category | subtype | verb |
| --- | --- | --- |
| media | movie, tv | watched |
| media | book | read |
| media | music, album, song | listened |
| book | * | read |
| music | * | listened |
| academic | * | studied |
| 其他（github / code / self / bangumi subject…） | | linked |

### Compact fact

从命中的那条 `EnrichmentResult` 取：

- `fact_creator`：attributes 里第一个 `key` 为 `author` 或 `artist` 的字符串值。
- `fact_year`：`publishedAt` 能解析出的四位年。
- `fact_type`：subtype 属于 `tv | movie | book | album | song` 才写。bangumi `subject`、github `repo` 不写 type。

有 creator 就带 `fact_creator` + 可选 `fact_year`。否则有 `fact_type` 且有 `fact_year` 才带这两项。其余组合不写 fact 字段。

## Relay → APNs

`buildApnsPayload` 对 `resource_type === 'recently'` 必读 `kind`。文章/手记不再设 `subtitle-loc-key`。思考：

| 条件 | title-loc-key | title-loc-args | subtitle | body |
| --- | --- | --- | --- | --- |
| enriched + watched | `PUSH_THINKING_WATCHED` | owner, work | 见下 | description |
| enriched + read | `PUSH_THINKING_READ` | owner, work | 见下 | description |
| enriched + listened | `PUSH_THINKING_LISTENED` | owner, work | 见下 | description |
| enriched + studied | `PUSH_THINKING_STUDIED` | owner, work | 见下 | description |
| enriched + linked | `PUSH_THINKING_LINKED` | owner, work | 见下 | description |
| plain | `PUSH_THINKING_PLAIN` | owner, text | 无 | summary |

副标题：

- 有 `fact_creator` 且有 `fact_year` → `PUSH_THINKING_FACT_CREATOR`，args `[creator, year]`。
- 有 `fact_creator` 没有 `fact_year` → `PUSH_THINKING_FACT_CREATOR_ONLY`，args `[creator]`。
- 否则有 `fact_type` + `fact_year` → `PUSH_THINKING_FACT_TV` / `MOVIE` / `BOOK` / `ALBUM` / `SONG`，args `[year]`。
- 否则无 subtitle 字段。

`thread-id` 仍是 `recently`。`category` 仍是 `YOHAKU_CONTENT`。`sound` 仍是 `default`。不设 `mutable-content`。

## iOS 字符串

`assets/notifications/Localizable.xcstrings` 五语齐全。删除三条 `PUSH_CONTENT_*_SUBTITLE`。

| key | en | zh-Hans | zh-Hant | ja | ko |
| --- | --- | --- | --- | --- | --- |
| `PUSH_THINKING_WATCHED` | %@ watched “%@” | %@ 观看了「%@」 | %@ 觀看了「%@」 | %@さんが「%@」を観た | %@님이 “%@”을(를) 봤어요 |
| `PUSH_THINKING_READ` | %@ read “%@” | %@ 读了「%@」 | %@ 讀了「%@」 | %@さんが「%@」を読んだ | %@님이 “%@”을(를) 읽었어요 |
| `PUSH_THINKING_LISTENED` | %@ listened to “%@” | %@ 听了「%@」 | %@ 聽了「%@」 | %@さんが「%@」を聴いた | %@님이 “%@”을(를) 들었어요 |
| `PUSH_THINKING_STUDIED` | %@ studied “%@” | %@ 读了「%@」 | %@ 讀了「%@」 | %@さんが「%@」を読んだ | %@님이 “%@”을(를) 읽었어요 |
| `PUSH_THINKING_LINKED` | %@ linked to “%@” | %@ 链接到「%@」 | %@ 連結到「%@」 | %@さんが「%@」にリンク | %@님이 “%@”에 링크 |
| `PUSH_THINKING_PLAIN` | %@：%@ | %@：%@ | %@：%@ | %@：%@ | %@：%@ |
| `PUSH_THINKING_FACT_CREATOR` | %@ · %@ | %@ · %@ | %@ · %@ | %@ · %@ | %@ · %@ |
| `PUSH_THINKING_FACT_CREATOR_ONLY` | %@ | %@ | %@ | %@ | %@ |
| `PUSH_THINKING_FACT_TV` | Series · %@ | 剧集 · %@ | 劇集 · %@ | ドラマ · %@ | 시리즈 · %@ |
| `PUSH_THINKING_FACT_MOVIE` | Movie · %@ | 电影 · %@ | 電影 · %@ | 映画 · %@ | 영화 · %@ |
| `PUSH_THINKING_FACT_BOOK` | Book · %@ | 图书 · %@ | 圖書 · %@ | 書籍 · %@ | 책 · %@ |
| `PUSH_THINKING_FACT_ALBUM` | Album · %@ | 专辑 · %@ | 專輯 · %@ | アルバム · %@ | 앨범 · %@ |
| `PUSH_THINKING_FACT_SONG` | Song · %@ | 单曲 · %@ | 單曲 · %@ | 曲 · %@ | 곡 · %@ |

`notification-localizations.test.ts` 锁全部新 key，并断言三条旧 subtitle key 已删除。

`PUSH_CONTENT_TITLE` / `PUSH_CONTENT_SUMMARY` 留给文章和手记。

## 错误处理

- owner 名为空、作品名/第一行为空：不入队。
- enrichment hydrate 失败：按 plain 走；若 plain 是裸 URL，不入队。
- Relay 看到 recently 缺 `kind` 或缺必填字段：不调用 APNs，delivery 记协议错误。
- APNs payload > 4 KB：沿用现有 `PayloadTooLarge`。
- 点击路由不改：`target_path` 仍是 `/thinking/:id`。

## 测试

- Protocol：enriched / plain 合法；旧 `display_title` recently 非法；裸字段组合（只有 year、只有 type）非法或被 Relay 忽略副标题。
- Core：TMDB + 描述、纯 TMDB、书（author）、专辑（artist）、GitHub（linked、无 fact）、纯文本、裸 URL skip、owner 缺失 skip。
- Relay：文章/手记无 subtitle-loc-key；五动词 + 两条 fact 形状；plain 无 subtitle。
- Mobile：catalog 含全部新 key、不含已删 subtitle key。

手动：本地 sandbox 推一条 EVA + 原话、一条纯文本，对锁屏像素。不在本 spec 里重跑整条 APNs skill，除非实现分支要求验收。

## 范围

- `mx-core/packages/push-protocol` schema + 可选的 recently 解析纯函数
- `mx-core/apps/core/src/modules/push/push.service.ts` 与对应 spec
- `mx-core/apps/push-relay/src/apns-provider.ts` 与对应 spec
- `yohaku-oss/apps/mobile/assets/notifications/Localizable.xcstrings` 与 localization 测试

不改 fanout 偏好（仍是 `content_recently`）。不改 Notification Service Extension。
