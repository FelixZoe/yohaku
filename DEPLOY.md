# 部署说明（Self-host Build）

本仓库整合了 mx-space 个人博客栈的**前后端源码**，所有产物均由 GitHub Actions 云端构建，服务器只负责拉取镜像，无需本地编译。

## 仓库结构

| 目录 | 内容 | 版本 |
| --- | --- | --- |
| `/`（根目录） | Yohaku Web 前端（Next.js） | 6.6.7（上游 bb6ac766） |
| `/core` | mx-space core 后端（NestJS + Postgres + Redis） | v14.14.0（上游纯净发布版） |
| `/apps/mobile` | Yohaku iOS 客户端（Expo，MIT） | 1.0.0 |

## 构建产物（Actions 手动触发 workflow_dispatch）

| Workflow | 产物 | 位置 |
| --- | --- | --- |
| `Build Docker Image` | Web 前端镜像（`BASE_URL=https://api.root.mom` 已烘焙） | `ghcr.io/felixzoe/yohaku:latest` |
| `Build Core Docker Image` | core 后端镜像（内含 admin 面板） | `ghcr.io/felixzoe/mx-core:latest` |
| `Build Unsigned iOS IPA` | 未签名 IPA（自行签名后安装） | Actions 运行页 Artifacts 下载 |

## 服务器更新流程

```bash
cd /opt/mixspace-yohaku
# 在 GitHub 上触发对应 workflow，等待构建完成后：
sudo docker compose pull core migrate yohaku
sudo docker compose up -d
```

- 镜像 `:latest` 与 `:<commit-sha>` 双标签发布，可固定 sha 回滚。
- core 镜像来自官方 `innei/mx-server:14.14.0` 相同的 v14.14.0 源码，数据库迁移由一次性 `migrate` 服务执行。

## iOS 未签名 IPA

`apps/mobile` 构建产物为未签名 IPA，通过 [爱思助手 / AltStore / TrollStore / Xcode] 等工具自行签名安装。

站点与身份配置走 `apps/mobile-overlay/`（对应公开仓库指引中的 `src/site-config.ts` / `PUBLIC_*`），
已配置为本站：apiUrl `https://api.root.mom/api/v3`、siteUrl `https://root.mom`、bundle id `app.root.mom`。

### 自己签名上架（MIT，无需额外授权）

1. **应用名**：`apps/mobile/app.config.ts` 的 `name` 字段。
2. **图标**：替换 `apps/mobile/assets/images/icon.png`（1024×1024）与 `apps/mobile/assets/expo.icon`。
3. **推送**（可选）：Apple 开发者后台为 App ID `app.root.mom` 勾选 Push Notifications，
   prebuild 生成的 entitlements 自带 `aps-environment`；推送需要自建 APNs 中转，不配不影响其余功能。
4. 本地出包：`pnpm --filter @yohaku/mobile ios` 生成 `ios/`，Xcode 打开 `.xcworkspace` → Archive → Distribute App；
   或直接用本仓库 Actions 的未签名 IPA 自行签名。
