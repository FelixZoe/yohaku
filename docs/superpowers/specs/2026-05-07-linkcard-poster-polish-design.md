# LinkCard PosterCard Polish — Movie & Music

> 2026-05-07 · scope: `apps/web` (frontend) + `mx-core` (backend) · status: design

## 背景

LinkCard 之 `PosterCard` 现行同 template 共用于 movie / album / book 三 variant，仅以 `kind` 切 aspect 与文案差异。视觉过于平面，缺乏 per-work atmosphere；信息层级单一，rating / artist / genres 全靠点状 meta 行承载。

`EnrichmentResult` schema 已备 `color` / `image.blurhash` / `image.width/height` optional 字段，然后端 provider 实际只 github-repo 写 `color`（且其值乃 language 名，非颜色）。movie 与 music 之 `color` 必 undefined。

并存一架构问题：`enrichment.service.resolve()` 现行在 DB row 过期时走 **inline 阻塞 refetch**，非 stale-while-revalidate。叠加将引入之 image fetch + sharp dominant 提色，inline 路径首访问者体感会明显劣化。

## 目标

1. **PosterCard polish**：保留 horizontal layout（image-left → body-right），refine typography、hierarchy、atmospheric wash。
2. **后端 color/blurhash extraction**：覆盖 TMDB · Netease · QQ · Bangumi · NeoDB 五 provider，集中于 service 后处理，per-provider 零改动。
3. **Stale-while-revalidate 改造**：`resolve()` 与 `hydrateUrls()` 改为「DB 有则立返、过期则后台 refresh」。借既有 `TaskQueueService` 实现 dedup 入队。

## 非目标

- 其他 LinkCard variant（Repo / Issue / PR / Discussion / User / Paper / Leetcode / Fallback）— 不动。
- `BookCard` 复用 `PosterCard` shell — 视觉层 polish 自然继承，但本 spec 不专议 book 之 attribute（书评、译者、ISBN）排布。
- `github-repo.provider` 之 `color = language name` 既有错用 — 不动。新 extraction step 加 hex guard，不覆盖。
- 不做 backfill 脚本。legacy cached row 待自然 TTL 过期 → SWR 路径触 refresh → 渐进收敛。

## 设计

### Section 1 · 后端 SWR 改造

**位置**：`mx-core/apps/core/src/modules/enrichment/enrichment.service.ts`

**resolve() 改造**：

```
DB row 存：
  ├─ 立返 normalized（不论 expiresAt）
  └─ 若过期 → enqueue refresh task（fire-and-forget，不 await）

DB row 不存：
  └─ 同步 fetch（cold path，等 provider call + enrichWithImageMeta）
```

**enqueue 实现**：

- 用 `TaskQueueService` 之 dedup 机制（`task-queue.constants.ts:dedup` key）。
- dedup hash：`enrichment-refresh:${provider.name}:${match.id}`。
- 同一作品并发请求重复入队即丢弃（既有原子 Lua 保证）。
- task scope：`enrichment`。
- task payload：`{ provider, externalId }`，handler 调既有 `EnrichmentService.refresh()`。

**failure backoff**：

- 现行 backoff 检查（`failureCount > 0 && now < backoffUntil`）保留于 resolve 路径，**作为是否 enqueue 之 guard**。
- 在 backoff 期：返 stale row + 不 enqueue refresh（避免 wasted task）。
- 出 backoff：返 stale row + enqueue refresh。
- refresh task handler 不再判 backoff — 入队即由 dispatcher 信任之。

**hydrateUrls() 改造**（`enrichment.service.ts:202-224`）：

- 现行 `expiresAt < now → skip` 改为 **return-anyway**（含过期 row 一并返）。
- 同时若过期 → 同 resolve 路径 enqueue refresh。
- 保 SSR hydrate 与 client resolve 语义一致。

**Redis hot cache（10min）**：保留。SWR 之第一道防线，热门 URL 不击 DB。

### Section 2 · 后端 image meta extraction

**位置**：`enrichment.service.ts` 新增私有方法 `enrichWithImageMeta(result)`。

**调用点**：所有「provider.fetch → upsert」路径，三处皆补：

- `resolve()` cold path（`enrichment.service.ts:86-101`）
- `refresh()`（`enrichment.service.ts:161-180`）— 后台 task 经此触
- `getOne()`（`enrichment.service.ts:135-159`）— admin / hydrate path

DB hit 路径无须处理（数据已含完整 enrichment）。

**逻辑**：

```ts
private async enrichWithImageMeta(result: EnrichmentResult): Promise<void> {
  if (!result.image?.url) return
  if (result.color) return  // github-repo 等已自填者 skip

  try {
    const { size, accent, blurHash } =
      await this.imageService.getOnlineImageSizeAndMeta(result.image.url)
    result.color = accent
    result.image.blurhash = blurHash
    result.image.width = size.width
    result.image.height = size.height
  } catch (error) {
    this.logger.warn(`Image meta extraction failed for ${result.url}: ${error.message}`)
    // swallow — color 是 optional 字段
  }
}
```

**provider 覆盖**：因置于 service 后处理，**自动覆盖所有 provider**（凡 `result.image?.url` 非空者）。无须 per-provider 改动。

**依赖注入**：`EnrichmentService` 构造函数加 `ImageService`。需在 `EnrichmentModule` imports 引 `HelperModule`（`processors/helper/helper.module.ts`），其已 export `ImageService`。

**数据完整性**：

- `accent` 来自 `sharp().stats().dominant`，hex 格式 `#rrggbb`，前端可直用。
- `blurHash` 来自 `encodeImageToBlurhash`（32x32 raw → blurhash 4x4 component）。
- `size` 来自 `sharp().metadata()`，含 `width` / `height` / `type`（`type` 不存于 `EnrichmentImage`，丢弃）。

**性能**：

- 既有 cold path 已含 provider HTTP call（多在 200-500ms）；额外 image fetch + sharp decode 增 100-300ms。
- 仅 24h 一次 per 作品。SWR 改造后用户从不直接等此延迟。
- ImageService 内部已配 `referer` + `user-agent`，netease p1.music.126.net / qq y.gtimg.cn 服务端抓取无 CORS 之忧。

### Section 3 · 前端 PosterCard 重构

**位置**：`apps/web/src/components/ui/link-card/variants/PosterCard.tsx`

**对外 API 不变**：`MovieCard` / `BookCard` / `AlbumCard` 三 wrapper 保留，`dispatch.tsx` 不动。

#### 3.1 视觉 — atmospheric wash

**落地形式**：CSS variable 拆三层：

1. **`--wash-color`**：per-card，inline style 注入 `data.color`（hex），仅有 hex 之卡片才设此 var。
2. **`--card-wash-alpha`** / **`--card-wash-alpha-dim`**：per-theme，写于 component 同位 CSS module；dark 由 `:global(.dark)` 覆盖。
3. **gradient `background`**：于 stylesheet 之 `.poster-card-wash` class 中定义，引用上二 var。

新增 file：`apps/web/src/components/ui/link-card/variants/PosterCard.module.css`（co-located CSS module；项目此 dir 历史曾有 `LinkCard.module.css`，删后空缺，此次以新形式回归）。

```css
/* PosterCard.module.css */
.poster-card-wash {
  --card-wash-alpha: 0.14;
  --card-wash-alpha-dim: 0.035;
  background:
    linear-gradient(90deg,
      color-mix(in oklch, var(--wash-color) calc(var(--card-wash-alpha) * 100%), transparent) 0%,
      color-mix(in oklch, var(--wash-color) calc(var(--card-wash-alpha-dim) * 100%), transparent) 50%,
      transparent 75%
    ),
    var(--surface-paper);
}

:global(.dark) .poster-card-wash {
  --card-wash-alpha: 0.18;
  --card-wash-alpha-dim: 0.045;
}
```

**hex guard**：仅当 `data.color` match `/^#[0-9a-f]{6}$/i` 才施 `.poster-card-wash` class 与 inline `style={{ '--wash-color': data.color }}`；否则保 `LinkCardShell` 默认 `bg-paper` + `ring-border`，无 wash。

#### 3.2 typography（token-only）

| 区 | class |
|---|---|
| **kicker** | `text-xs font-semibold uppercase tracking-widest text-neutral-6` |
| **title** | `text-base font-semibold leading-snug text-neutral-10 line-clamp-2` |
| **desc** | `text-base leading-normal text-neutral-7 line-clamp-1` |
| **meta** | `text-xs text-neutral-7`（沿用 `MetaRow` atom，`mt-1.5` → `mt-1`） |

注：本项目 `text-base` = 14px。title 与 desc 同 size，唯 weight（semibold vs regular）与 color（n-10 vs n-7）分层。

#### 3.3 数据 → display 映射

| 类 | kicker | desc | meta（次序） |
|---|---|---|---|
| **movie** | `Movie · YYYY` | — | `★ rating` · genres · host |
| **tv** | `TV · YYYY` | — | `★ rating` · genres · host |
| **song** | `Song` | artist | `《album》` · host · `▶` |
| **album** | `Album · YYYY` | artist | host · `▶` |
| **book** | `Book · YYYY` | author *(若 attribute 有)* | rating · host |

**movie 不示 desc**：现行 PosterCard 渲染 `data.description`（TMDB overview 之多行长文），与 card 紧凑感冲突，drop。

**music desc dedup**：netease provider 既将 description 设为 artist 名（`netease-music.provider.ts:54`），亦写 `attributes.artist`。前端先取 attribute、否则取 description；二者等值不重复。

**▶ pill**：移除现行 PosterCard 之右下 floating badge（`PosterCard.tsx:53-60`），改为 meta 行内 inline pill：

```tsx
<span className="inline-flex items-center gap-1 rounded-sm bg-neutral-2 px-1.5 py-px text-xs text-neutral-7">▶</span>
```

#### 3.4 image 槽

**有 image.url**：
- `<img>` 渲染，加 `width`/`height` attr（来自 `image.width/height`）防 CLS。
- 若 `image.blurhash`：以 `<Blurhash>`（`react-blurhash`，已在 deps）作绝对定位 placeholder，image `onLoad` 触 fade-out（透明度切换 250ms）。
- 若 `image.blurhash` 缺：image 加载期 poster 槽 `bg-neutral-2`，无 placeholder。

**无 image.url**：
- 渲染 `HostStamp` atom（`atoms/HostStamp.tsx`），56×56 圆角，与 body 垂直居中。

**aspect 与尺寸**：沿用现行 `ASPECT_BY_KIND`：

```ts
const ASPECT_BY_KIND = {
  movie: { width: '76px', aspect: '2/3' },
  book:  { width: '60px', aspect: '5/7' },
  album: { width: '84px', aspect: '1/1' },
}
```

#### 3.5 file 改动

```
apps/web/src/components/ui/link-card/variants/
  PosterCard.tsx              (rewrite — wash + blurhash + 新 typography)
  PosterCard.module.css       (新增 — wash gradient + dark variant alpha)
  atoms/HostStamp.tsx         (sizing 微调，保 56x56 居中)
  atoms/MetaRow.tsx           (mt-1.5 → mt-1)

dispatch.tsx / index.ts / LinkCardShell.tsx 皆不动。
PosterCard.tsx 预计 < 200 行。
```

### Section 4 · End-to-end data flow

```
Markdown / Thinking entry
  └─ <LinkCard url={...}>
       ├─ EnrichmentMapContext (page-level inline hydrate)
       │    └─ hydrateUrls() — 改为返已有任意 row（含过期），且过期者 enqueue refresh
       │
       └─ cache miss → useQuery → /enrichment/resolve
              └─ EnrichmentService.resolve() — SWR 路径
                   ├─ Redis 10min hit → 返
                   ├─ DB row 存：立返；过期则 enqueue refresh
                   └─ DB row 缺：cold path 同步 fetch
                        └─ provider.fetch(id)
                        └─ enrichWithImageMeta(result) — 拉图 + sharp.stats().dominant
                        └─ repository.upsert(result, expiresAt)
                        └─ 返
```

后台 refresh task：调既有 `EnrichmentService.refresh()`，其内部已 `provider.fetch + upsert + redis-bust`。仅须新增 `enrichWithImageMeta` 之调用对称。

## Edge cases

| case | 行为 |
|---|---|
| `data.color` 缺（image 缺 / extract 失败 / legacy row） | 不上 wash，纯 `bg-paper` + `ring-border` |
| `data.color` 非 hex（github lang 名） | guard 拒之，无 wash |
| `data.image.url` 缺 | `<HostStamp>` 占位，居中对齐 body |
| `data.image.url` 存但 `blurhash` 缺 | 直渲 `<img>`，无 placeholder fade（image 加载期 poster 槽 `bg-neutral-2`） |
| 同一作品并发请求触 refresh 多次 | TaskQueueService dedup hash — `enrichment-refresh:${provider}:${id}`；重复入队即丢弃 |
| Provider 不可用（gating off / token missing） | refresh task handler 见 ProviderDisabledError → 静默 noop，不计 failure |
| Provider fetch 失败 | task handler 抛错；既有 `recordFailure` 路径将 DB row `failureCount++` 与 `lastError` 更新；下次 resolve 见 backoff 生效 |
| Stale row 颜色不再合作品（重发 cover） | 最多 stale 24h，next request 触 refresh 自正 |
| Dark mode 切换 | wash 用同 `--wash-color`，alpha 由 dark variant 切；OKLCH `color-mix` 双向工作 |

## 测试

**后端 unit**：

- `enrichment.service.spec.ts`（新增）：
  - `resolve(url)` DB row 过期 → 立返 stale 数据 + 验 TaskQueueService 被调（dedup key 正确）。
  - 同 url 二次 resolve 仍过期 → 仅一次入队（dedup 验证）。
  - DB row 缺 → 同步 fetch path，验 `enrichWithImageMeta` 被调。
  - `hydrateUrls` 含过期 row → 返之，且 enqueue refresh。
- `enrichWithImageMeta` 单测：
  - image.url 存 + color 缺 → 调 ImageService、设 color/blurhash/size。
  - color 已存 → skip。
  - ImageService throw → result 不变 + warn 一次（`logger` mock 验之）。

**前端 component**：

- `PosterCard` 测：
  - color hex match → wash style 注入（验 `--wash-color` CSS variable 设置）。
  - color 缺 / 非 hex → 无 wash style。
  - image.url 缺 → 渲 `HostStamp` 而非 `<img>`。
  - subtype = movie / tv / song / album / book → 各 kicker 文案正确。

**visual regression**：本次不强求自动测；人工对照现行与新版于 light + dark + 含 image / 无 image / 含 color / 无 color 之 matrix。

## 兼容性

- `EnrichmentResult` schema 不变（`color` / `image.blurhash` / `image.width/height` 已是 optional 既定字段）。
- `LinkCard` / `MovieCard` / `AlbumCard` / `BookCard` 对外 API 不变。
- 旧 cached row 无 color → 渐进收敛（24h TTL 内 SWR 路径自补），无破坏。
- `hydrateUrls` 行为变化：现行调用方依赖「skip 过期」之语义则需评估；现行唯一调用方为 `EnrichmentMapContext` 之 SSR 路径，改为返过期 row 是 SWR 之正路。

## Open question

- **TaskQueueService scope 设置**：scope 用 `enrichment-refresh` 还是更广之 `enrichment`？不影响功能，约定 naming 即可。
- **task handler 注册**：refresh task type 须在 `TaskQueueProcessor` 注册 handler。具体注册形式（per-type handler vs shared）依 plan 阶段验证既有 pattern。
