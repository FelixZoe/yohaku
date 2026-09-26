# iOS App Store 内购会员入口

2026-08-20 · 状态：已批准（brainstorming）

跨仓库：`yohaku-oss/apps/mobile`（入口 + StoreKit）与 `mx-core`（校验 + 会员写入）。网页结账仍是 Dodo，见 `mx-core/docs/superpowers/specs/2026-07-18-paid-articles-membership-design.md`。本 spec 不替换那份，只加 Apple 并列通道。

## 目标

已登录读者能在 iOS App 里用系统订阅页购买月/年会员；买成后同一 reader 在 App 和网页都算会员，付费博文在 App 内解锁。未登录只看到「登录后订阅」，不拉起内购。App 不再用 Safari 买会员。

## 已定决策

- 入口两处：付费博文截断区、Me tab 会员 banner。
- 购买只走 App Store 内购。系统 `SubscriptionStoreView` 出月/年、价格、条款、恢复购买。
- 未登录：付费墙主按钮「登录后订阅」→ `/login`。Me banner 仍只在登录后出现。
- 网页 Dodo 继续服务 web。`membership.provider` 不改成 `apple`。iOS 不调用 `POST /membership/checkout`。
- 已是 Dodo / manual 有效会员：App 当会员，不出现购买按钮；误走 confirm 也不改绑定。
- 会员资格仍绑 reader。一笔 Apple 订阅（`originalTransactionId`）只绑一个 reader。

## 非目标

- RevenueCat 或其他第三方 IAP 中台。
- Safari / 网页结账作为 iOS 购买后备。
- 先买后绑账号、家庭共享特殊 UI、优惠码页、退款自动化。
- 改网页 checkout UI。
- Android。
- 对账 cron / 轮询 Apple（续费靠通知 + App 内静默 confirm）。

## 现状

App 已有付费墙和 Me banner，但购买链指向 Safari（文章页或站点首页）。mx-core 会员表一行一 reader，支付适配器目前只有 Dodo；`GET /membership/plans` 的 `enabled` 表示网页结账是否可用。`MembershipProvider` 尚无 `apple`。

## 架构

```text
付费墙 / Me banner
        │
        ├─ 未登录 ──────────────► /login
        │
        └─ 已登录且 appleIap.enabled
                │
                ▼
        YohakuNative.presentSubscriptionStore(productIds)
                │  SubscriptionStoreView
                ▼
        交易 JWS
                │
                ▼
        POST /membership/apple/confirm   (reader session)
                │  app-store-server-library 验签
                │  productId → monthly | yearly
                ▼
        applyEvent(provider=apple, subscriptionId=originalTransactionId)
                │
                ├─ 刷新 membership/status
                └─ 付费博文重拉正文（现有 shouldUnlock）

App Store Server Notifications V2
        │
        ▼
POST /membership/webhook/apple
        │  用 originalTransactionId 找回会员行
        └─ applyEvent（续费 / 宽限 / 取消）
```

Apple 是写入通道，不是网页那个「当前 checkout provider」。Admin 的 provider 下拉仍只有 Dodo 等网页渠道。

## mx-core

### 配置

在现有 `membership` section 增加 Apple 字段，与 Dodo 的 `apiKey` / `monthlyProductId` 分开：

| 字段 | 用途 |
| --- | --- |
| `appleBundleId` | App Store Server API 用的 bundle id |
| `appleKeyId` | In-App Purchase 密钥 ID |
| `appleIssuerId` | Issuer ID |
| `applePrivateKey` | `.p8` 私钥（`field.password`，加密存储） |
| `appleMonthlyProductId` | 月订阅 Product ID |
| `appleYearlyProductId` | 年订阅 Product ID |

`membership.enabled` 仍是总开关。Apple 内购可用当且仅当：总开关打开，且上表六项都非空。不另配 sandbox/production：confirm 按 Apple 建议先正式再沙盒；通知自带 environment。

Admin 会员设置补这些字段，并展示 webhook：`POST {apiBase}/membership/webhook/apple`。Dodo 区块不动。

### `GET /membership/plans`

即使网页结账不可用，也要带上 `appleIap`（今天在 Dodo 未就绪时直接 `{ enabled: false, plans: [] }` 会让 iOS 无法发现内购）：

```ts
{
  enabled: boolean // 网页 Dodo checkout
  plans: { plan: 'monthly' | 'yearly'; pricing?: NormalizedPlanPricing }[]
  appleIap: {
    enabled: boolean
    monthlyProductId?: string
    yearlyProductId?: string
  }
}
```

iOS 入口只看 `appleIap.enabled`，不看顶层 `enabled`。

### `POST /membership/apple/confirm`

`@ReaderAuth()`。body：`{ signedTransactionInfo: string }`（StoreKit 2 JWS）。demo 模式禁止。

1. 用官方 `app-store-server-library` 验签；失败 → 400。
2. `productId` 必须等于配置的月或年 Product ID，否则拒绝。
3. `originalTransactionId` 已绑其他 reader → 拒绝（这个 Apple ID 已经开过会员）。
4. 当前 reader 已有其他 provider 的有效订阅（`active` / `on_hold` 且未过期）→ **HTTP 200**，body 与 `GET /membership/status` 相同，**不改**现有行。不要抛 `MEMBERSHIP_ALREADY_ACTIVE`（那是 checkout 用的；这里用户可能刚在 StoreKit 付了款，抛错会让客户端当成失败）。
5. 否则 `applyEvent`：`provider: 'apple'`，`providerSubscriptionId` / 查找键 = `originalTransactionId`，`providerCustomerId` = `appAccountToken` 或 `originalTransactionId`，`plan` 由 productId 映射，`currentPeriodEnd` = 交易 `expiresDate`，`eventId` = `transactionId`（幂等）。
6. 成功与第 4 步都返回与 `GET /membership/status` 相同形状。

Restore 走同一接口。

### `POST /membership/webhook/apple`

已有 `POST /membership/webhook/:provider`。新增 `apple` 适配器：验 App Store Server Notifications V2，映射 `activated` / `renewed` / `on_hold` / `cancelled` / `plan_changed`。`readerId` 不在通知里，用 `originalTransactionId` 查 `memberships.providerSubscriptionId`。找不到行 → 忽略（`missing_reader_metadata`），等下次 confirm / 静默同步。验签失败 → 现有 `WebhookVerifyFailed`。

`createCheckout` 对 Apple 适配器不可用；`membership.provider` 设成 `apple` 时 checkout 仍按「未配置网页渠道」失败。不要把 admin 的当前 provider 设成 `apple`。

### 类型

`MembershipProvider` 增加 `'apple'`。不加入网页 provider 下拉，不加入 `REGISTERED_PAYMENT_PROVIDERS`（那个列表只表示可 checkout 的渠道）。

## iOS App

### 原生模块

现有 `modules/yohaku`（部署目标 iOS 18）增加：

- `presentSubscriptionStore({ productIds: string[] })` → 弹出 `SubscriptionStoreView`。关闭后：`{ status: 'purchased' | 'restored', signedTransactionInfo: string }` 或 `{ status: 'cancelled' }`。商品加载失败以异常抛回。
- `currentEntitlementJws(productIds: string[])` → 当前有效订阅的 JWS 列表（可能为空），供静默同步。
- 已是会员时，banner 点击调用系统 `showManageSubscriptions`（可放在同一模块）。

不引入 `expo-iap` / RevenueCat。`appAccountToken` 第一期不设（确认接口已有 reader session；通知靠 `originalTransactionId`）。

### 共享 hook

`useMembershipCheckout()`：

- `appleIap.enabled` 为假则不能买。
- 已登录才 `presentSubscriptionStore`。
- `purchased` / `restored` 后 `POST /membership/apple/confirm`，invalidate `membership/status`。
- 用户取消：不 toast。
- confirm 失败：保住 JWS，立即重试一次；仍失败则 toast，Me 聚焦时的静默同步再补。
- 在服务端承认之前，不把本地当成会员，也不重拉付费正文。

Me 页 `useFocusEffect`：已登录则 `currentEntitlementJws` + confirm（重装、通知早到、上次 confirm 失败）。

### 付费墙

替换「在 Safari 中阅读」。`PaywallGate` 不再收文章 `webUrl` 当购买链。

| 状态 | 主按钮 |
| --- | --- |
| 未登录 | 「登录后订阅」→ `/login` |
| 已登录非会员，且 `appleIap.enabled` | 「订阅」→ 系统订阅页 |
| 已登录非会员，但内购未配置 | 不显示购买按钮（只保留锁定说明） |
| 会员 / owner | 不显示整块（现有逻辑） |

买成后继续用 `shouldUnlockPaywalledContent` + `refreshPostBody`。

### Me banner

- 「成为会员」：打开系统订阅页，**不再** `Linking.openURL(getSiteUrl())`。
- `membershipBannerKind` 的 CTA 条件改为 `appleIap.enabled`，不是网页 `plans.enabled`。
- 已是会员：仍显示方案和剩余天数；点击 → 系统管理订阅。
- 未登录：`hidden`（不变）。

### 文案

五份 locale 的 `membership`：付费墙主按钮改为订阅 / 登录后订阅；去掉「在 Safari 中阅读」作为购买 CTA。系统订阅页自己出价格和条款，App 不重复画方案选择。

## 错误处理

| 情况 | 行为 |
| --- | --- |
| 关掉订阅页 | 静默 |
| 商品拉不到 / `appleIap` 未配置 | 入口不出现；present 失败则 toast |
| StoreKit 已扣款，confirm 网络失败 | 客户端重试；Me 静默 confirm 兜底；服务端承认前不解锁正文 |
| 有效 Dodo / manual 会员走 confirm | HTTP 200 + 当前 status，不改行，客户端当成功 |
| `originalTransactionId` 已绑其他 reader | 拒绝 + toast：这个 Apple ID 已经开过会员 |
| webhook 验签失败 | 400 |
| webhook 早于 confirm | 忽略，等静默同步 |
| demo 模式 | confirm / webhook 禁止 |
| Ask to Buy 未完成 | 不写入，等 `Transaction.updates` 完成后再 confirm |

## 上线配置（实现外）

- App Store Connect：订阅组、月/年商品，Product ID 与后台一致。
- App ID 打开 In-App Purchase。
- Server Notifications V2 指向 `POST {apiBase}/membership/webhook/apple`。
- 本地可用 `.storekit` 配方案，不进生产包。
- 系统订阅页出条款；App 已有隐私页。不另做门户。

## 测试

mx-core：假 JWS 开通；重复 confirm 幂等；Dodo 有效会员冲突不改绑；跨账号拒绝；webhook 续费/取消；webhook 早到忽略；验签失败；`plans` 在 Dodo 关闭时仍返回 `appleIap`；demo 禁止 confirm。

mobile：付费墙三种 CTA（登录 / 订阅 / 内购未配置）；banner 只在登录且 `appleIap.enabled` 时为 CTA；已是会员显示时长且可管理；静默 confirm 的调用条件。

## 仓库分工

| 仓库 | 内容 |
| --- | --- |
| `mx-core` | 配置、`apple` 适配器、confirm、plans 的 `appleIap`、admin 字段、测试 |
| `yohaku-oss` / `@yohaku/mobile` | 原生订阅页、confirm 客户端、付费墙 / Me 入口、i18n、测试 |

api-client 如被 web 或 mobile 直接使用，给 confirm 和 `appleIap` 补类型；mobile 若继续自建 `src/api/client.ts`，只改这一份即可。
