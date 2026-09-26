# mobile Tab 4（我）— 身份、活动、上架合规

2026-08-15 · 状态：已批准（brainstorming）

## 背景

Tab 4 已是「我」：登录态、语言、版本、博客外链、登出。前三个 tab 把内容读完后，这一页太空；同时 App Store 上架还缺隐私政策入口和删号。2026-08-11 的 me tab spec 明确不做设置分组、不放法律链接；本 spec 取代其中 **Me 页 UI 范围**，登录 sheet 形态仍以那份为准。

## 已定决策

- **气质**：数字主页。头像居中；活动是可点的纸面计数块，不是设置行，也不是本页 feed。
- **活动三类都要**：赞过的、我的评论、最近阅读。本页只显示计数；点块推进 `(me)` stack 列表。
- **未登录**：只露本地两块（赞过的、最近阅读）。「我的评论」登录后才插入。
- **合规最小上架**：本页放隐私政策 + 登录后删号。服务条款用 Apple 标准 EULA，不自拟、不入口。
- **外观**：继续跟系统，不做手动浅色/深色。

## 整页结构

自上而下，一种滚动面（现有 `EdgeEffectScrollView` + desk）：

1. 大标题「我」（现有 `largeTitleSans`）。
2. **身份 hero**（居中）
   - 未登录：占位头像、「未登录」、现有副文案「登录后可评论与点赞」、墨色主按钮「登录」→ 现有 login sheet。
   - 已登录：头像、名字、`handle · provider` 次级行；`role === 'owner'` 保留 accent「主人」小标。不在 hero 放登出。
3. **活动计数块**
   - 纸面小块，数字用 SlotText。未登录两列：赞过的 | 最近阅读。登录后三列：赞过的 | 我的评论 | 最近阅读。
   - 计数为 0 仍显示、仍可点。空发生在列表页。
   - 「我的评论」在 total 返回前块仍在、数字位留空，禁止先画 0 再跳成真实数字。
4. **行列表**（现有 `MeRow` 语言）
   - 语言 → `/locale`
   - 版本（不可点）
   - 博客 → `WebBrowser.openBrowserAsync(owner.webUrl)`
   - 隐私政策 → `WebBrowser.openBrowserAsync('https://innei.in/privacy')`
   - 已登录：登出（现有 destructive `Alert`）
   - 已登录且 `role !== 'owner'`：删除账号
5. `__DEV__` 组件目录入口保持在最底部，生产包不出现。

## 三个列表

路由挂在 `(me)` stack 内，tab bar 保留。点进原文则走根 stack（`/posts/...`、`/notes/...`、`/comments/:id`），tab bar 退场，与现有详情一致。

| 入口 | 数据 | 列表内容 | 点进 |
| --- | --- | --- | --- |
| 赞过的 | 本地 `liked_refs`，`kind ∈ {post, note, recently-up}`，按 `likedAt` 倒序 | 博文/手记用现有列表行语言；思考用正文截断 | 博文 `/posts/[category]/[slug]`；手记 `/notes/[nid]`；思考 `/comments/[id]`（现有思考评论 sheet） |
| 我的评论 | 网络优先，当前 session 读者的评论分页，按时间倒序 | 评论截断 + 原文标题 + 相对时间 | 带 `commentId` 打开对应详情/sheet；评论区能滚到该条则滚，否则至少打开原文 |
| 最近阅读 | 本地 `reading_history`，按 `openedAt` 倒序 | 博文/手记列表行 | 同赞过的博文/手记 |

Join 一律走当前 locale 的 posts/notes 行。原文已被同步删掉：行仍在，标题为「内容已不可用」，不可再点进。思考「顶」同理：thinking 行没了就降级。

空态文案在列表页居中：

- 赞过的：「还没有赞过内容」／「在博文、手记或思考里点赞后会出现在这里」
- 我的评论：「还没有评论」／「在文章或思考里留言后会出现在这里」
- 最近阅读：「还没有阅读记录」／「打开博文或手记后会出现在这里」

列表视觉复用现有 list 行 / paper，不新做一套。

## 数据

### 赞过的

现有 `liked_refs`。计数 = 排除 `recently-down` 后的行数。`useLiveQuery`，离线可用。思考只收「顶」，不收「踩」。

### 最近阅读

新表 `reading_history`：

- `ref_id` 主键
- `kind`：`'post' | 'note'`
- `opened_at`（ms）

打开博文/手记详情且本地已有对应 row 时 upsert（更新 `opened_at`）。按文章去重，不是按访问次数计数。最多 100 条：写入后删掉最旧的溢出行。思考没有详情页，不记。密码手记只要原生详情 screen 带着有效 row 挂载，就算一次阅读。

### 我的评论

mx-core 新增读者自己的评论分页（见下方「同一次上架的仓库外工作」）。mobile 用 TanStack Query；Tab 4 的数字取 `pagination.total`。未登录不请求。请求失败：计数保留上次成功值；列表页提供重试。不写入 SQLite。

## 错误处理

- 赞 / 阅读：纯本地，无网络失败面。
- 我的评论列表失败：列表页一行「点此重试」，与现有评论区失败态同族。
- 删号失败：toast，保持登录。
- 隐私政策：交给系统浏览器。
- 点「内容已不可用」：无导航。

## 上架（Guideline 落点）

### 落在本页 / 本仓库

- **隐私政策（5.1.1）**：公开稳定 URL `https://innei.in/privacy`（无 locale 前缀）。App Store Connect 与 Me 行打开同一地址。`apps/web` 增加 locale-free 页面，中文为主、附英文，说明：账号（OAuth 的名字/邮箱/头像）、评论正文、点赞（服务端按 IP 去重）、无第三方分析、无广告追踪、无 ATT。
- **删除账号（5.1.1(v)）**：仅登录且非 owner 可见。系统 `Alert` 说明不可恢复 → 调 better-auth 删除当前读者 → 本地 `signOut()`。设备上的 `liked_refs` / `reading_history` **不**随号清掉。Owner 账号不提供删号（避免误删站主）。

### 同一次上架必须有、但不在 Tab 4 UI

- **Sign in with Apple（4.8）**：登录 sheet 已按 `GET /auth/providers` 动态画按钮。生产启用 mx-core 已有的 Apple provider 后按钮会出现；mobile 补 Apple 的 `ProviderIcon`。不改 sheet 结构和 owner 邮箱二级入口。
- **UGC 举报（1.2）**：评论长按增加「举报」。一次确认后 POST 到 mx-core；成功 toast。不收集举报理由。站主侧沿用现有评论审核/删除。2026-08-11 评论 spec 曾排除举报，本 spec 把它收回上架清单。
- **条款**：Connect 使用 Apple 标准 EULA。
- **隐私标签**：无追踪、无第三方分析，不弹 ATT。`ITSAppUsesNonExemptEncryption` 已是 false。

## 组件与路由

- 重写 `MeScreen`：hero + `ActivityStats` + 现有行。`ActivityStats` 根据 `useSession()` 在 2 / 3 块之间切换。
- 新 screen：`src/screens/me/liked-list.tsx`、`my-comments-list.tsx`、`reading-list.tsx`。
- 新路由：`(me)/liked`、`(me)/comments`、`(me)/reading`。
- 详情：`post-detail` / `note-detail` 在「有本地 row」时 upsert 阅读记录。
- 评论详情若支持 `commentId` search param，则滚到该条；没有也不阻塞 v1 打开原文。

## 同一次上架的仓库外工作

| 仓库 | 工作 |
| --- | --- |
| `apps/web` | locale-free `/privacy` 页，URL 为 `https://innei.in/privacy` |
| `mx-core` | ① 当前读者评论分页 GET（session 绑定，非 admin `author-activity`）② 生产打开 Apple provider ③ 读者删号（better-auth user delete，若尚未对 Expo session 接通）④ 评论举报 POST（记录 + 通知站主即可，v1 不做公开状态机） |

## 测试

Vitest（mobile）：

- `reading_history` upsert 更新时间、100 条上限删最旧。
- 赞计数排除 `recently-down`。
- 未登录不渲染「我的评论」块。
- 删号行：无 session 无；owner 无；普通读者有。
- 评论计数 reducer：失败不清成 0。

i18n：五份 messages 同步（`messages/message-usage.test.ts`）。

真机：未登录 / 读者 / owner 三种 Me；三块进列表再进原文；隐私政策外链；读者删号确认与失败；登录 sheet 出现 Apple（生产 provider 开启后）。

## 非目标

- 自拟服务条款页
- 赞 / 阅读跨设备同步
- 阅读进度百分比、思考记入阅读
- 手动外观切换
- 「我的评论」进 SQLite
- 把 Me 做成第四条内容流（本页不展开列表）

## 与既有 spec 的关系

- [2026-08-09-yohaku-mobile-app-design.md](2026-08-09-yohaku-mobile-app-design.md) 里 Me 的「appearance / terms / 删号」在本 spec 落地为：无 appearance、无自拟条款、有隐私政策与删号。
- [2026-08-11-mobile-login-me-tab-design.md](2026-08-11-mobile-login-me-tab-design.md) 的登录 sheet 与 session 模型保持；Me 页 UI 范围以本文件为准。
- [2026-08-11-mobile-comments-likes-design.md](2026-08-11-mobile-comments-likes-design.md) 排除的举报，由本 spec 收回为上架项。
