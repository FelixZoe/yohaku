# mobile Tab 4 — 书房与读者页

2026-08-25 · 状态：已批准（brainstorming）

## 背景

第四格名叫「我」，图标跟登录者走，页内却叠了站长在场、会员、博客和读者账号。主语断了：启动页和 desk 都在说这是谁的站，Tab 4 却按社交客户端做成客人主页。

本 spec 把第四格改成书房。读者的「我」变成屋里的第二层。

## 已定决策

- **形态**：App 是一间书房。前三格是作品，第四格主语是站长。
- **两层路由**：进 tab 是书房；一扇门进读者页。不拆成第五个 tab。
- **Tab 图标**：永远是站长头像。未登录、读者登录、站长登录都不换成 session 头像。快照未到时用 `bundledOwner`，不回落空的 `person.crop.circle`。
- **Tab 读屏**：站长名字（`owner.name`）。未就绪时用 `siteHost`。不用「我」「主人」「书房」。
- **组名**：`(me)` 改为 `(study)`。Trigger、长按开调试、secret tap 都跟过去。
- **「书房」只是设计用语**：不出现在 UI、读屏、导航返回标题里。
- **登录 sheet、活动数据、上架合规**：仍以 [2026-08-15-mobile-me-tab-design.md](2026-08-15-mobile-me-tab-design.md) 与 [2026-08-11-mobile-login-me-tab-design.md](2026-08-11-mobile-login-me-tab-design.md) 为准。本文件只改第四格主语、路由和两页 UI。

## 路由

```
(tabs)/(study)/index      书房（tab 根）
(tabs)/(study)/reader     读者页（tab 内再推一层，tab bar 保留）
```

根 stack 不动：

| 路由 | 角色 |
| --- | --- |
| `/login` `/locale` `/desk` | sheet |
| `/liked` `/reading` `/my-comments` | 列表；tab bar 退场 |
| `/posts/…` `/notes/…` `/comments/…` | 原文；与现有详情一致 |

登录、locale、desk 不塞进 `(study)` stack。

## 书房 `index`

一种滚动面：现有 `EdgeEffectScrollView` + desk。现有 `MeAmbienceWash` / `MeAmbienceGrain` 留在这一页，不跟到读者页。

自上而下：

1. **站长 hero**（居中，肖像）
   - 头像、衬线名、letterspaced `siteHost`
   - 三种 session 都不改主语。不出现「未登录」、不出现登录按钮、不盖「主人」章。
2. **在场**
   - 有 live desk 时：纸面卡（封面或 app 图标 + 曲名/应用名 + live 点）。点进现有 `/desk`。
   - 无在场：整块不渲染。
3. **会员**：现有 `MembershipBanner`，位置不变（站长区，不是设置项）。
4. **博客**：现有外链，`WebBrowser.openBrowserAsync(owner.webUrl)`。靠近站长，不跟版本挤在一组。
5. **客人卡**（门）

### 客人卡

| 状态 | 外观 | 点按 |
| --- | --- | --- |
| 未登录 | 占位头像 +「我」 | `router.push('/login')` |
| 读者 | 读者头像 +「我」+ 名字 | `router.push('/reader')` |
| 站长 | **不贴第二张脸**，一行「账号」 | `router.push('/reader')` |

未登录登录成功：sheet dismiss，**留在书房**。客人卡就地换成读者脸和名字。再点才进 `/reader`。

`__DEV__` 组件目录不放书房。放到读者页底。

## 读者页 `reader`

Tab bar 仍在。系统返回到书房；返回标题用系统默认（前一页），不写「书房」。

### 读者 session

肖像（brainstorm 选 B）：居中大头像、名字、`handle · provider`。无大标题「我」——肖像就是标题。不在 hero 放登出。

其下：

1. **活动票根**（现有 `ActivityStats`）
   - 未登录两列：赞过的 \| 最近阅读。登录后三列插入「我的评论」。
   - 计数为 0 仍显示、仍可点。空发生在列表页。
   - 「我的评论」在 total 返回前数字位留空，禁止先画 0。
2. **通用**：语言 → `/locale`；通知（`push` 已配置时）；存储；版本（不可点）；隐私政策。
3. **账户**：登出；非 owner 显示删号。规则与 2026-08-15 相同。
4. `__DEV__` 组件目录在最底，生产包不出现。

未登录落到这一页的路径：本 spec **不提供**（门在未登录时只开登录 sheet）。若深链或以后误推 `/reader`，hero 用现有未登录肖像 +「登录」按钮，行为与今日 Me 未登录 hero 相同。

### 站长 session

跳过肖像 hero。页顶 `largeTitleSans`「账号」，然后从票根起，其余行与读者相同。不显示删号（已有 `showDeleteAccount`）。

## Tab chrome

`apps/mobile/src/app/(tabs)/_layout.tsx`：

- Trigger `name="(study)"`。
- Icon：`owner.avatarUrl` 经现有 `tabAvatarIconSource` + `TabBarDomain` 圆形裁切。`bundledOwner` 为冷启动源。
- `accessibilityLabel` / Paper tab `title`：`owner.name`，否则 `siteHost`。
- 去掉 `tabs.me` 作为可见/读屏文案。i18n 可留内部键给读者页标题「我」或删掉，不回到第四格。
- 长按第四格、连点开调试：目标从 `(me)` 改为 `(study)`，行为不变。

Swift `TabBarDomain` 仍认「最后一格」为头像 tab，不依赖路由名。JS 事件名可在实现时改成 study，不作为产品面。

## 组件与文件

| 现况 | 去向 |
| --- | --- |
| `app/(tabs)/(me)/` | 删除，换成 `(study)/index.tsx` + `reader.tsx` |
| `screens/me/me-screen.tsx` | 拆成 `screens/study/study-screen.tsx` 与 `screens/study/reader-screen.tsx` |
| `activity-stats`、三个列表、login/locale sheet、membership | 仍由读者页或根路由消费；目录可后迁，不挡第一刀 |
| `desk-line.tsx` | 书房改为在场卡；现有一行字不再作为书房主展示。`/desk` sheet 不改 |
| `owner/store.ts` | Tab 图标与书房 hero 的数据源 |

## 文案（新键，五份 locale）

放在 `study` 命名空间，避免再往 `me` 里堆主语：

- `me`：我（客人卡标题、读者页内部如需）
- `account`：账号（站长门、站长读者页大标题）
- 客人卡未登录不写「登录」作主标题——主标题仍是「我」；登录是点按行为。

`auth.signInPitch` 等登录 sheet 文案不改。界面仍不得出现「主人」，除非沿用现有 `auth.owner` 且本 spec 已禁止把它画在书房 hero 上。

## 错误处理

- 站长快照缺失：hero 用 `bundledOwner`；二者都无时隐藏站点行，头像用墨色占位圆（仅此回落）。Tab 读屏用 App 名「余白」。
- 登录失败：现有 sheet 行为。书房客人卡不变。
- 删号 / 隐私 / 评论计数失败：2026-08-15 原规则。
- desk 不可见：不占位。

## 测试

Vitest：

- 客人卡可见性与点按目标：未登录 → `/login`；读者 → `/reader`；owner → `/reader` 且无第二头像。
- Tab 图标源：有 session 时仍是 `owner.avatarUrl`，不是 `session.image`。
- 读者页：owner 不渲染肖像 hero；读者渲染。
- 未登录不渲染「我的评论」块（沿用 `showMyComments`）。
- 删号行：无 session 无；owner 无；普通读者有。

i18n：`messages.test.ts` 五份同步。

真机：未登录点客人卡出 login、成功后仍在书房且卡上是自己的脸；再点进读者肖像；owner 登录书房无「主人」章、门为「账号」、读者页无第二头像；Tab 未登录即站长头像；读屏是站长名。

## 非目标

- 第五个 tab
- 把赞 / 阅读 / 评论收回 `(study)` stack
- 改 login sheet 结构或 owner 邮箱二级入口
- 自拟服务条款、手动外观、跨设备同步赞/阅读
- 把「书房」写成用户可见产品名
- 改 desk sheet、会员购买链路、隐私页正文

## 与既有 spec 的关系

- [2026-08-09-yohaku-mobile-app-design.md](2026-08-09-yohaku-mobile-app-design.md) 的第四格「我」由本文件改主语。
- [2026-08-11-mobile-login-me-tab-design.md](2026-08-11-mobile-login-me-tab-design.md) 的登录 sheet / session 保持；其「me tab UI 范围」早已被 08-15 取代，现再被本文件的两页结构取代。
- [2026-08-15-mobile-me-tab-design.md](2026-08-15-mobile-me-tab-design.md) 的活动三类、阅读表、评论计数、隐私与删号仍然有效。其中「整页结构」「路由挂在 `(me)`」以本文件为准。实现里列表已在根 stack，本文件承认现状，不再搬回 tab stack。
