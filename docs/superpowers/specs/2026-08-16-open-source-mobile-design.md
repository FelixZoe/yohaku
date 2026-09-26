# 开源 Yohaku iOS 客户端

日期：2026-08-16
状态：设计已确认，待实施
范围：把 `apps/mobile`、`packages/rich-content`、`packages/dom-webview` 迁入公开仓 [Innei/Yohaku](https://github.com/Innei/Yohaku)，让第三方能指向自己的 mx-core 编译；闭源仓只保留 App Store overlay。

## 目标

公开一份可独立编译的 iOS 阅读客户端。别人 clone [Innei/Yohaku](https://github.com/Innei/Yohaku)，填自己的 mx-core，即可 `expo run:ios`。Innei 自己的 App Store 包（bundle `in.innei`）仍从同一份代码出，发行身份盖在闭源 overlay 上。

日常开发的 source of truth 是公开仓。闭源 `Innei-dev/Yohaku` 通过已有 submodule `yohaku-oss`（指向 `Innei/Yohaku`）消费它。

## 非目标

- Android（mobile 永久 iOS-only）
- 现在改 GitHub 仓库名（公开仓继续叫 `Innei/Yohaku`，之后若要改只改显示名）
- 开源网站（`apps/web` 仍在 `Innei-dev/Yohaku`，赞助模型不变）
- 把 `@yohaku/rich-content` 发到 npm
- 给社区用户做多站点账号体系
- 用 `git filter-repo` 把闭源提交历史洗进公开仓

## 现状

| 层 | 位置 | 公开？ |
|---|---|---|
| 设计系统 | `yohaku-oss/design-system` → [Innei/Yohaku](https://github.com/Innei/Yohaku)，npm `@yohaku/design-system` | 是 |
| iOS 客户端 | 闭源仓 `apps/mobile` | 否 |
| 富文本渲染 | 闭源仓 `packages/rich-content`（web + mobile 共用） | 否 |
| WebView 分叉 | 闭源仓 `packages/dom-webview` | 否 |
| 网站 | 闭源仓 `apps/web` | 否 |

公开 OSS 仓是 **[Innei/Yohaku](https://github.com/Innei/Yohaku)**（本地 submodule 路径仍叫 `yohaku-oss/`）。闭源实现是 `Innei-dev/Yohaku`。这两个名字都对，本次不改。

mobile 现在不是独立产品：

- workspace 依赖 `@yohaku/design-system`、`@yohaku/rich-content`
- pnpm override 把 `@expo/dom-webview` 指到 `packages/dom-webview`
- 本地原生模块 `apps/mobile/modules/yohaku/`
- 站点身份写死：`innei.in`、`https://mx.innei.in/api/v3`、bundle `in.innei`、Apple Team `KAMM5N88X3`、owner 兜底「Innei」
- `apps/mobile/LICENSE` 是 Expo 模板 MIT
- 闭源仓根许可证是 MIT + `ADDITIONAL_TERMS.md`（AGPL 口吻 + 商用限制），不能带到客户端公开树
- `apps/mobile/ios/` 已被 gitignore，Pods 不在版本库里

已有可复用的运行时换 API：`apps/mobile/src/api/base-url.ts` 用 `expo-sqlite/kv-store` 存 dev API。owner 已能从 mx-core aggregate 拉名字 / 头像 / 站点 URL。

## 仓库形态

公开仓 [Innei/Yohaku](https://github.com/Innei/Yohaku) 从「设计系统仓」扩成公开 monorepo。`design-system/` 留在仓库根，npm 发布路径不变：

```
Innei/Yohaku
├── design-system/              # 已有，继续发 @yohaku/design-system
├── apps/mobile/
├── packages/rich-content/
├── packages/dom-webview/
├── assets/
└── pnpm-workspace.yaml         # design-system + apps/* + packages/*
```

闭源仓用 symlink 接，和现在的 `packages/design-system` 同一模式：

```
Innei-dev/Yohaku
├── yohaku-oss/                      # submodule → Innei/Yohaku
├── packages/design-system    → yohaku-oss/design-system
├── packages/rich-content     → yohaku-oss/packages/rich-content
├── packages/dom-webview      → yohaku-oss/packages/dom-webview
├── apps/mobile               → yohaku-oss/apps/mobile
├── apps/web/
└── apps/mobile-overlay/             # 只存在于闭源
```

本地目录名 `yohaku-oss/` 暂时不改，和以后的 GitHub 改名一起动。

`@yohaku/rich-content` 继续 `private: true`，只作为 workspace 包存在于公开 monorepo。闭源 web 通过 symlink + `workspace:*` 使用同一份源码。不发 npm。

公开仓里 `@yohaku/design-system` 用 workspace 协议指向根上的 `design-system/`。闭源仓里同一包名继续解析到 symlink，行为不变。

`@expo/dom-webview` 的 override：公开仓写 `link:./packages/dom-webview`；闭源仓写 `link:./packages/dom-webview`（该路径已是 symlink）。

## 站点配置

站点身份分两类。

**运行时（JS 可读，可在设置页改）：** API、站点 URL、站点 hosts、隐私页、owner 兜底。

**构建时（必须进包）：** bundle id、URL scheme、associated domains、Apple Team、EAS project、生产 env、App Store 图标。

公开仓唯一入口是 `apps/mobile/src/site.ts`。现在散落的常量都改读它：

| 字段 | 现在 | 公开默认 | 闭源 overlay |
|---|---|---|---|
| `apiUrl` | `https://mx.innei.in/api/v3` | 空字符串 | 生产 API |
| `siteUrl` | `https://innei.in` | 空字符串 | `https://innei.in` |
| `siteHosts` | `innei.in`, `www.innei.in` | `[]` | 现网 hosts |
| `privacyUrl` | `https://innei.in/privacy` | `{siteUrl}/privacy`（siteUrl 空则为空） | 同推导即可 |
| owner 兜底 | Innei + GitHub 头像 | 无（等 aggregate） | 现在这份 `bundledOwner` |
| `scheme` | `yohaku` | `yohaku` | 不改 |
| `bundleId` | `in.innei` | `dev.yohaku.app` | `in.innei` |

`app.json` 改成 `app.config.ts`：从同一份配置写 `scheme`、`bundleIdentifier`、`associatedDomains`。Apple Team、EAS project、生产 `EXPO_PUBLIC_*` **只出现在闭源 overlay**，不进公开树。

### Overlay 解析

闭源 `apps/mobile-overlay/` 至少包含：

- `site.ts` — 覆盖运行时字段和 owner 兜底
- `expo.json` — `appleTeamId`、associated domains、图标路径、EAS
- App Store 图标（公开仓继续用现有 Yohaku mark）

mobile 启动 / `app.config.ts` 求值时：overlay 文件存在则用它，否则用公开默认。别人单独 clone `Innei/Yohaku` 时 overlay 路径不存在。闭源 monorepo 里开发或 EAS 发版时 overlay 自动生效。

overlay 与 Metro 共用同一套「workspace 根」查找（见下节），相对那个根读 `apps/mobile-overlay/`。找到闭源仓根则加载 overlay；只找到公开仓根则该目录不存在，走默认。不要用环境变量开关区分两种工作树，避免 EAS 漏设打出占位 bundle。

### 第一次打开

公开默认 `apiUrl` 为空。冷启动进入设置页，粘贴 mx-core 地址（复用已有 kv-store）。连上后用已有 aggregate 拉主人名字、头像、`webUrl`，再推导 `siteHosts`、`siteUrl`、WebView Referer。

闭源 App Store 包因 overlay 写死 `apiUrl`，用户看不到这步。设置页文案走 mobile 现有五套语言（en / ja / ko / zh / zh-TW），不扩新的 i18n 架构。

### 保持产品名、不跟站点绑死

这些标识留在公开树，不做成站点配置：

- 内部 scheme `yohaku-asset`
- WebView 消息 `yohaku:image-preview` / `yohaku:image-preview-prewarm`
- auth `storagePrefix: 'yohaku'`
- 原生模块名 `Yohaku` / pod `YohakuKit`

这些必须拔掉：

- `packages/dom-webview` 的 `DEFAULT_SITE_REFERER = 'https://innei.in/'` → 调用方传入 `siteUrl`，包内无站点默认
- `DomAssetSchemeHandler.defaultReferer` 同步删除硬编码
- `UIMenu` id `in.innei.selectionComment` → `dev.yohaku.selectionComment`（或由 bundle id 推导）
- 测试夹具里的 `innei.in` / `mx.innei.in` → `example.com` / `https://mx.example.com/api/v3`

### Metro

`apps/mobile/metro.config.js` 禁止再写死 `path.resolve(projectRoot, '../..')`。从 `projectRoot` 向上找最近的 `pnpm-workspace.yaml`：单独 clone 时根是 `Innei/Yohaku`，放进闭源 monorepo 且经 `apps/mobile` symlink 启动时，必须落到闭源仓根（不能落到 `yohaku-oss/`）。判定「真实 workspace 根」时以含有 `apps/web` 或根 `pnpm-workspace.yaml` 的 packages 列表包含 `@yohaku/web` 为准；若只找到 `yohaku-oss` 的 workspace 文件，再看是否存在上层闭源 workspace，有则用上层。

单独 clone 公开仓时只有一层 workspace，用那一层即可。

## 搬迁顺序

公开历史用干净快照，不用 `filter-repo`。闭源仓保留完整历史。公开仓一次导入提交，避免 Team ID 和生产 API 出现在 `Innei/Yohaku` 的 `git log` 里。

三步必须按序。中间 App Store 包不能断。

### 第一步：闭源仓内先可配置，不搬目录

1. 新增 `apps/mobile/src/site.ts` 与 `apps/mobile-overlay/`（写入当前生产值）。
2. `app.json` → `app.config.ts`。所有硬编码改读配置。
3. Metro 改为向上找 workspace 根。
4. 测试夹具改为 `example.com`。
5. 验证：overlay 存在时行为和现在一致（bundle、API、Universal Links、owner 兜底、Referer）。

### 第二步：洗过的树拷进 Innei/Yohaku

拷贝：

- `apps/mobile/`（源码、assets、modules、drizzle、shims、babel/metro/tsconfig/vitest）
- `packages/rich-content/`
- `packages/dom-webview/`

不拷贝 / 拷贝前清掉：

- `apps/mobile/ios/`（本就 ignore）
- `apps/mobile-overlay/`
- `eas.json` 里的 `appleTeamId`、生产 `EXPO_PUBLIC_API_URL`
- Expo 模板 `LICENSE`，换成 Innei MIT
- `bundledOwner` 的 Innei 兜底（公开默认改为空）
- `DEFAULT_SITE_REFERER` / `SITE_HOSTS` 的 `innei.in`

公开仓一次 commit，说明加入 iOS 客户端和 rich-content。`design-system/` 原位不动。`pnpm-workspace.yaml` 补上 `apps/*`、`packages/*`。公开 `eas.json` 只留能本地 `expo run:ios` 的开发 profile。

### 第三步：闭源仓改成消费者

1. 更新 `yohaku-oss` submodule 到含 mobile 的提交。
2. 删除本地 `apps/mobile`、`packages/rich-content`、`packages/dom-webview`。
3. 换成与 `packages/design-system` 相同的 symlink。
4. `@expo/dom-webview` override 仍指向 `./packages/dom-webview`（现为 symlink）。
5. overlay 留在闭源仓。EAS 发版仍从闭源仓跑。

web 继续 `workspace:*` 使用 `rich-content`。haklex、赞助私有实现、网站部署流程不动。

单独 clone 公开仓的开发命令：`pnpm install && pnpm --filter @yohaku/mobile start`，再 `expo run:ios`。无 overlay 时 API 为空，走设置页。闭源 monorepo 里 overlay 自动盖上，日常路径保持 `pnpm --filter @yohaku/mobile`。

## 许可与对外说明

公开仓一律 MIT，版权 Innei。`design-system` 已是 MIT；mobile 与 `rich-content` 对齐。`dom-webview` 保留上游 Expo MIT，现有 `VENDOR.md` 继续说明分叉。闭源仓根的 MIT + `ADDITIONAL_TERMS.md` 不进入 `Innei/Yohaku`。

[Innei/Yohaku](https://github.com/Innei/Yohaku) 的 `README.md` / `README.en.md` / `README.ja.md` 改口吻：

- 设计系统（原样保留）
- iOS 客户端开源，指向自己的 mx-core 即可编译；iOS 18+；没有 Android
- 网站实现仍在 `Innei-dev/Yohaku`，赞助模型不变

闭源仓 README 补一句：mobile 源在公开的 `Innei/Yohaku`，这里只留发行 overlay。

公开仓 CI：保留现有 `design-system` check；加上 `@yohaku/mobile` 的 vitest 与 `@yohaku/rich-content` 的 `check`。公开仓不做 EAS 发版。

## 成功标准

1. 只 clone `Innei/Yohaku`，`pnpm install`，填自己的 mx-core，`expo run:ios` 能编起来，列表和正文能读。
2. 闭源仓带 overlay 的行为与现在一致：bundle `in.innei`、生产 API、现有图标，EAS 仍能交 App Store。
3. `apps/web` 仍通过 `workspace:*` 使用 `rich-content`，网站不受影响。
4. 公开工作树与公开 `git log` 里没有 Apple Team、没有默认 `mx.innei.in`、没有 Innei 头像兜底。
5. 第三方改的是一份 site config / 设置页，不用 fork 一堆硬编码。

## 风险

- Metro / pnpm 在「symlink + 双 workspace 根」下认错根，会装两份 React 或解析到未 override 的上游 `@expo/dom-webview`。第一步必须先在闭源仓验证，再搬。
- overlay 解析若依赖环境变量，EAS 漏设会打出占位 bundle。所以用路径存在性判定，不用开关。
- 公开仓拷贝若在硬编码清干净之前发生，Team ID 会进公开历史。第二步只拷洗过的树。
- `rich-content` 迁走后，闭源仓若漏 symlink，web 构建会立刻断。第三步与 submodule 更新必须同一提交。
