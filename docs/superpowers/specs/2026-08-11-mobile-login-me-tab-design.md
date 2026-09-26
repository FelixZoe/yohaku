# mobile 登录页与 me tab

2026-08-11 · 状态：已批准

## 背景

mobile 目前完全无认证：`src/api/client.ts` 是无凭据的纯 fetch，me tab 是占位页（仅 dev-demos 入口）。mx-core 侧 better-auth 已具备：社交 OAuth（生产启用 github/google，`GET /auth/providers` 动态下发）、email+password（注册关闭，实际为 owner 专用）、bearer 插件；自定义 `GET /auth/session` 返回合并后的 `{ name, email, image, handle, role, provider, ... }`（camelize 后），`role === 'owner'` 即站主。web 端登录走同一套 better-auth。

## 已定决策

- **双身份**：读者走 GitHub/Google OAuth，owner 走 email+password，同一登录入口。
- **登录页形态**：iOS formSheet 模态（expo-router `presentation: 'formSheet'`，中等 detent），从 me tab 打开。
- **me tab 范围**：资料卡（登录/登出）+ 关于卡（版本、博客外链）+ 保留组件目录入口（不限 `__DEV__`，维持现状）。设置分组不做。
- **后端在本次范围**：mx-core 注册 `@better-auth/expo` 服务端插件并信任 `yohaku://` scheme。

## 认证链路

### mobile 客户端

- 新增依赖：`better-auth`（与 mx-core 的 `1.6.26` 对齐）、`@better-auth/expo`、`expo-secure-store`（session cookie 入 Keychain；新原生模块，需 pod install）。
- `src/auth/client.ts`：`createAuthClient` + `expoClient({ scheme: 'yohaku', storagePrefix: 'yohaku', storage: SecureStore })`。baseURL = `apiBaseUrl() + '/auth'`——生产 `https://mx.innei.in/api/v3/auth`、本地 `http://localhost:2333/auth`，与 mx-core basePath（prod `/api/v3/auth`、dev `/auth`）恰好同构。ApiSwitcher 运行时切换不 reload，因此用 `getAuthClient()` 按当前 baseURL 记忆化，切换后返回新实例（cookie 存储 key 不分 host，dev 混用可接受）。
- **读者 OAuth**：`getAuthClient().signIn.social({ provider, callbackURL })`，callbackURL 按 expo 插件约定给 app 内路径，插件负责开浏览器、`yohaku://` deep link 回跳、写 cookie。
- **Owner**：`signIn.email({ email, password })`，同 client 同 cookie。
- **Session 状态**：不用 better-auth 自带 `useSession`（拿不到 `role`/`handle`）。`src/auth/session-store.ts` 按 `sync/status.ts` 的 `useSyncExternalStore` 模式：`refreshSession()` 调自定义 `GET /auth/session`（经现有 `request<T>` 走 camelize），成功存用户对象，`null`/失败置未登录。启动时与登录成功后各刷一次。
- **登出**：`signOut()` → 清 store。
- `src/api/client.ts` 的 `fetchRawJson` 统一附加 `Cookie: getAuthClient().getCookie()`（非空时），公共 GET 不受影响，为后续带态请求铺路。

### mx-core（小改动）

- `apps/core` 增加依赖 `@better-auth/expo`（版本对齐 better-auth 1.6.26）。
- `auth.implement.ts`：plugins 数组加 `expo()`；`trustedOrigins` 回调返回值追加 `'yohaku://'`。
- 部署后真机才能对生产验证 OAuth；本地 dev 直接可验。

## 登录 sheet（`(me)/login` 路由）

- `(me)/_layout.tsx` 给 `login` 配 `presentation: 'formSheet'` + 中等 detent。
- 版面自上而下：站主头像 + 「登录到 余白」+ 一行次级副文案；社交品牌图标圆形按钮横排（provider 列表来自 `GET /auth/providers`，为空/失败时显示「社交登录暂不可用」占位）。**主界面不出现邮箱表单**——web 端本就只有社交 provider，后续 Apple 也是加一个按钮；owner 邮箱登录收进二级 UI：底部一行 meta 级「邮箱登录」quiet 链接，点击后 sheet 内容原地切换为邮箱/密码表单（`WellInput` ×2 + `Button`），并提供「返回社交登录」回退。**界面文案不得出现「主人」字样**（副文案用「用社交账号继续」）（2026-08-11 修订）。
- 交互：点社交按钮后该按钮 loading、全表单锁定；OAuth 取消/失败静默解锁，sheet 不关。email 登录失败在表单下方以语义 error 色显示一行「邮箱或密码不对」，不弹窗。任一方式成功 → `refreshSession()` → dismiss。

## me tab（重写 `me.tsx`，实体 UI 在 `src/screens/me/`）

- **资料卡（Paper）**
  - 未登录：占位头像 + 「未登录」+ 登录按钮（push login sheet）。
  - 已登录：expo-image 头像、名字、handle/邮箱次级行；`role === 'owner'` 显示 accent 色「主人」小标签，读者显示 provider 来源。卡尾「登出」入口，系统 `Alert` destructive 确认后执行。
- **关于卡（Paper）**：App 名 + 版本号（`expo-application`）、「博客 innei.in」外链（`WebBrowser.openBrowserAsync`）。
- **组件目录入口**：保留现状。

## 错误处理

- 启动 session 拉取失败：静默视为未登录，me tab focus 时重试。
- 任意带 cookie 请求 401：清空 session store（会话过期即登出态）。

## 验证

- Vitest：session store 状态迁移（刷新成功/失败/登出）；`fetchRawJson` cookie 附加（有 cookie 时带 header、无 cookie 不带）。
- 模拟器 + 本地 mx-core（`localhost:2333`）：email+password 全链路、GitHub OAuth 回跳、登出、401 过期清态。
- mx-core 部署后真机对生产复验 OAuth 闭环。
