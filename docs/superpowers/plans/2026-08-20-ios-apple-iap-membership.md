# iOS App Store IAP Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in iOS reader buy monthly/yearly membership through StoreKit’s system subscription sheet, and have mx-core verify the transaction so the same reader is entitled in the app and on the web.

**Architecture:** Apple is a write path beside Dodo, not a replacement for `membership.provider`. The app presents `SubscriptionStoreView` via the existing Yohaku native module, then `POST /membership/apple/confirm` with the StoreKit 2 JWS. mx-core verifies with `@apple/app-store-server-library`, upserts `memberships` (`provider = apple`, `providerSubscriptionId = originalTransactionId`), and applies renewals/cancels through the existing `POST /membership/webhook/apple` + `applyEvent` pipeline. iOS never opens Safari to buy.

**Tech Stack:** StoreKit 2 / `SubscriptionStoreView` (iOS 18), Expo module `Yohaku`, TanStack Query, NestJS membership module, `@apple/app-store-server-library`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-ios-apple-iap-membership-design.md`

## Global Constraints

- Two repos: Tasks 1–6 in `/Users/innei/git/innei-repo/mx-core`; Tasks 7–10 in `/Users/innei/git/innei-repo/Yohaku/yohaku-oss` (`apps/mobile`).
- Do not set `membership.provider` to `apple`. Do not call `POST /membership/checkout` from iOS.
- iOS purchase CTAs gate on `plans.appleIap.enabled`, not the Dodo `plans.enabled` flag.
- Confirm for a live Dodo/manual member returns HTTP 200 + current status and does not rewrite the row. Do not throw `MEMBERSHIP_ALREADY_ACTIVE` on confirm.
- One `originalTransactionId` binds to one reader. Cross-account confirm is 409 `MEMBERSHIP_APPLE_ALREADY_BOUND`.
- iOS only. No RevenueCat, no `expo-iap`, no Safari checkout fallback.
- Zero comments / JSDoc unless a hidden constraint.
- Scope lint/typecheck to files you touch.
- New mobile copy in all five locales: `en`, `ja`, `ko`, `zh`, `zh-TW`.
- Each task commits only its own files, in the repo that owns them.

## File map

| File | Responsibility |
| --- | --- |
| `mx-core/apps/core/src/modules/membership/membership.types.ts` | `apple` provider; `resolveAppleIapAvailability` |
| `mx-core/apps/core/src/modules/configs/configs.schema.ts` + `configs.default.ts` | Apple config fields |
| `mx-core/apps/core/src/modules/membership/providers/apple-transaction.ts` | Pure product/notification mapping |
| `mx-core/apps/core/src/modules/membership/providers/apple.provider.ts` | JWS + ASSN V2 verify |
| `mx-core/apps/core/src/modules/membership/membership.service.ts` | `confirmAppleTransaction` |
| `mx-core/apps/core/src/modules/membership/membership.controller.ts` | confirm route; `appleIap` on plans |
| `mx-core/apps/core/src/modules/membership/providers/provider.registry.ts` + `membership.module.ts` | Register `apple` |
| `mx-core/apps/admin/src/features/settings/.../membership*` | Apple fields + webhook URL |
| `mx-core/packages/api-client/models/membership.ts` | `appleIap` + confirm types |
| `yohaku-oss/apps/mobile/src/api/membership.ts` | `appleIap`, `paywallCtaKind` |
| `yohaku-oss/apps/mobile/src/api/client.ts` | typed plans + `membershipConfirmApple` |
| `yohaku-oss/apps/mobile/src/screens/me/confirm-apple.ts` | one-retry confirm |
| `yohaku-oss/apps/mobile/src/screens/me/use-membership-checkout.ts` | present store + confirm + silent sync |
| `yohaku-oss/apps/mobile/modules/yohaku` | StoreKit present / entitlements / manage |
| `yohaku-oss/apps/mobile/src/screens/details/paywall-gate.tsx` | login / subscribe CTAs |
| `yohaku-oss/apps/mobile/src/screens/me/membership-banner.tsx` | IAP + manage subscriptions |

---

### Task 1: Apple IAP availability + config fields

**Repo:** `mx-core`

**Files:**
- Modify: `apps/core/src/modules/membership/membership.types.ts`
- Modify: `apps/core/test/src/modules/membership/membership.types.spec.ts`
- Modify: `apps/core/src/modules/configs/configs.schema.ts` (MembershipSchema, after `environment`)
- Modify: `apps/core/src/modules/configs/configs.default.ts` (`membership` defaults)
- Test: `apps/core/test/src/modules/membership/membership.types.spec.ts`

**Interfaces:**
- Consumes: existing `MembershipSchema` / `resolveMembershipAvailability` (unchanged)
- Produces: `MembershipProvider` includes `'apple'`. `REGISTERED_PAYMENT_PROVIDERS` stays `['dodo']`.

```ts
export function resolveAppleIapAvailability(config: {
  enabled?: boolean
  appleBundleId?: string
  appleKeyId?: string
  appleIssuerId?: string
  applePrivateKey?: string
  appleMonthlyProductId?: string
  appleYearlyProductId?: string
}): { enabled: boolean; monthlyProductId?: string; yearlyProductId?: string }
```

When `enabled` is true and all six Apple strings are non-empty after trim, return `{ enabled: true, monthlyProductId, yearlyProductId }`. Otherwise `{ enabled: false }`.

- [ ] **Step 1: Write the failing tests**

Append to `membership.types.spec.ts`:

```ts
import { resolveAppleIapAvailability } from '~/modules/membership/membership.types'

const appleCredentials = {
  appleBundleId: 'dev.yohaku.app',
  appleKeyId: 'KEYID',
  appleIssuerId: 'ISSUER',
  applePrivateKey: '-----BEGIN PRIVATE KEY-----\\nX\\n-----END PRIVATE KEY-----',
  appleMonthlyProductId: 'yohaku.membership.monthly',
  appleYearlyProductId: 'yohaku.membership.yearly',
}

describe('resolveAppleIapAvailability', () => {
  it('is enabled when the master switch and all Apple fields are set', () => {
    expect(
      resolveAppleIapAvailability({ enabled: true, ...appleCredentials }),
    ).toEqual({
      enabled: true,
      monthlyProductId: 'yohaku.membership.monthly',
      yearlyProductId: 'yohaku.membership.yearly',
    })
  })

  it('is disabled when the master switch is off', () => {
    expect(
      resolveAppleIapAvailability({ enabled: false, ...appleCredentials }),
    ).toEqual({ enabled: false })
  })

  it('is disabled when any Apple field is missing', () => {
    expect(
      resolveAppleIapAvailability({
        enabled: true,
        ...appleCredentials,
        appleKeyId: '',
      }),
    ).toEqual({ enabled: false })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/membership.types.spec.ts`

Expected: FAIL — `resolveAppleIapAvailability` is not exported.

- [ ] **Step 3: Implement types + config**

In `membership.types.ts` add `'apple'` to `MembershipProvider`. Add `resolveAppleIapAvailability` as specified. Do not add `apple` to `REGISTERED_PAYMENT_PROVIDERS`.

In `MembershipSchema` add optional string fields with the same helpers as existing secrets/ids:

- `appleBundleId` — `field.halfGrid(z.string().optional(), 'Apple bundle ID')`
- `appleKeyId` — `field.halfGrid(z.string().optional(), 'Apple key ID')`
- `appleIssuerId` — `z.string().optional()` labeled `Apple issuer ID`
- `applePrivateKey` — `field.password(z.string().optional(), 'Apple .p8 private key')`
- `appleMonthlyProductId` — `field.halfGrid(z.string().optional(), 'Apple monthly product ID')`
- `appleYearlyProductId` — `field.halfGrid(z.string().optional(), 'Apple yearly product ID')`

In `configs.default.ts` set each new field to `''`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/membership.types.spec.ts`

Expected: PASS. Existing `resolveMembershipAvailability` cases still pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/membership/membership.types.ts \
  apps/core/test/src/modules/membership/membership.types.spec.ts \
  apps/core/src/modules/configs/configs.schema.ts \
  apps/core/src/modules/configs/configs.default.ts
git commit -m "$(cat <<'EOF'
feat(membership): add Apple IAP availability and config fields

EOF
)"
```

---

### Task 2: Pure Apple transaction mapping

**Repo:** `mx-core`

**Files:**
- Create: `apps/core/src/modules/membership/providers/apple-transaction.ts`
- Create: `apps/core/test/src/modules/membership/apple-transaction.spec.ts`

**Interfaces:**
- Consumes: `MembershipPlan`, `NormalizedBillingEvent` from `../membership.types` and `./provider.interface`
- Produces:

```ts
export interface AppleDecodedTransaction {
  appAccountToken?: string
  expiresDate: number
  originalTransactionId: string
  productId: string
  transactionId: string
}

export function planFromAppleProductId(
  productId: string,
  products: { monthlyProductId: string; yearlyProductId: string },
): MembershipPlan | null

export function appleActivatedEvent(
  decoded: AppleDecodedTransaction,
  readerId: string,
  plan: MembershipPlan,
): NormalizedBillingEvent

export function appleNotificationEventType(
  notificationType: string,
): NormalizedBillingEvent['type'] | undefined
```

`planFromAppleProductId` returns `'monthly'` / `'yearly'` on exact match, otherwise `null`.

`appleActivatedEvent` returns:

```ts
{
  eventId: decoded.transactionId,
  provider: 'apple',
  type: 'activated',
  customerId: decoded.appAccountToken ?? decoded.originalTransactionId,
  subscriptionId: decoded.originalTransactionId,
  plan,
  currentPeriodEnd: new Date(decoded.expiresDate),
  readerId,
}
```

`appleNotificationEventType` map:

| `notificationType` | result |
| --- | --- |
| `SUBSCRIBED` | `activated` |
| `DID_RENEW` | `renewed` |
| `DID_FAIL_TO_RENEW` | `on_hold` |
| `EXPIRED`, `REFUND`, `REVOKE`, `GRACE_PERIOD_EXPIRED` | `cancelled` |
| `DID_CHANGE_RENEWAL_PREF` | `plan_changed` |
| anything else | `undefined` |

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'

import {
  appleActivatedEvent,
  appleNotificationEventType,
  planFromAppleProductId,
} from '~/modules/membership/providers/apple-transaction'

const products = {
  monthlyProductId: 'yohaku.membership.monthly',
  yearlyProductId: 'yohaku.membership.yearly',
}

describe('planFromAppleProductId', () => {
  it('maps configured product ids', () => {
    expect(planFromAppleProductId('yohaku.membership.monthly', products)).toBe(
      'monthly',
    )
    expect(planFromAppleProductId('yohaku.membership.yearly', products)).toBe(
      'yearly',
    )
  })

  it('returns null for an unknown product', () => {
    expect(planFromAppleProductId('other.sku', products)).toBeNull()
  })
})

describe('appleActivatedEvent', () => {
  it('uses originalTransactionId as the subscription key', () => {
    const event = appleActivatedEvent(
      {
        expiresDate: Date.parse('2026-09-01T00:00:00.000Z'),
        originalTransactionId: 'orig-1',
        productId: 'yohaku.membership.yearly',
        transactionId: 'txn-1',
      },
      'reader-1',
      'yearly',
    )
    expect(event).toMatchObject({
      eventId: 'txn-1',
      provider: 'apple',
      type: 'activated',
      customerId: 'orig-1',
      subscriptionId: 'orig-1',
      plan: 'yearly',
      readerId: 'reader-1',
    })
    expect(event.currentPeriodEnd.toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    )
  })
})

describe('appleNotificationEventType', () => {
  it('maps App Store notification names', () => {
    expect(appleNotificationEventType('DID_RENEW')).toBe('renewed')
    expect(appleNotificationEventType('EXPIRED')).toBe('cancelled')
    expect(appleNotificationEventType('REFUND')).toBe('cancelled')
    expect(appleNotificationEventType('TEST')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/apple-transaction.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apple-transaction.ts`**

Write the three functions exactly as specified. No Apple SDK import in this file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/apple-transaction.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/membership/providers/apple-transaction.ts \
  apps/core/test/src/modules/membership/apple-transaction.spec.ts
git commit -m "$(cat <<'EOF'
feat(membership): map Apple product ids and notification types

EOF
)"
```

---

### Task 3: Apple provider + error codes

**Repo:** `mx-core`

**Files:**
- Modify: `apps/core/src/common/errors/app-error-code.ts`
- Modify: `apps/core/src/common/errors/app-error-definitions.ts`
- Modify: `apps/core/src/common/errors/app-error-payload.ts`
- Create: `apps/core/src/modules/membership/providers/apple.provider.ts`
- Modify: `apps/core/src/modules/membership/providers/provider.registry.ts`
- Modify: `apps/core/src/modules/membership/membership.module.ts`
- Test: `apps/core/test/src/modules/membership/apple.provider.spec.ts`

**Interfaces:**
- Consumes: `PaymentProviderAdapter`, `appleNotificationEventType`, `planFromAppleProductId`, `AppleDecodedTransaction`
- Produces:

```ts
@Injectable()
export class AppleProvider implements PaymentProviderAdapter {
  createCheckout(): Promise<{ checkoutUrl: string }> // throws MEMBERSHIP_PROVIDER_NOT_CONFIGURED
  verifySignedTransaction(signedTransactionInfo: string): Promise<AppleDecodedTransaction>
  verifyAndParseWebhook(rawBody: Buffer | string, headers: Record<string, string>): Promise<BillingWebhookResult>
}
```

Add error codes:

```ts
MEMBERSHIP_APPLE_TRANSACTION_INVALID = 'MEMBERSHIP_APPLE_TRANSACTION_INVALID' // 400, 'Apple transaction could not be verified'
MEMBERSHIP_APPLE_ALREADY_BOUND = 'MEMBERSHIP_APPLE_ALREADY_BOUND' // 409, 'This Apple subscription is already linked to another reader'
```

Wire them in `app-error-definitions.ts` and `app-error-payload.ts` the same way as `MEMBERSHIP_ALREADY_ACTIVE`.

`verifySignedTransaction`: use `@apple/app-store-server-library` `SignedDataVerifier.verifyAndDecodeTransaction`. Try production, then sandbox. On failure throw `MEMBERSHIP_APPLE_TRANSACTION_INVALID`. Map the decoded payload to `AppleDecodedTransaction` (`expiresDate` is milliseconds).

`verifyAndParseWebhook`: parse ASSN V2 (`signedPayload` in JSON body). `verifyAndDecodeNotification`, then decode the nested signed transaction. If `appleNotificationEventType` is `undefined`, return `{ ignored: true, rawType, reason: 'unsupported_event' }`. Look up membership is **not** this class’s job; set `readerId` to `''` and `subscriptionId` to `originalTransactionId`. The webhook controller/service already ignore missing reader via `applyEvent` / a new lookup in Task 5. For this task, if `readerId` cannot be known, return `{ ignored: true, rawType, reason: 'missing_reader_metadata' }` when no `originalTransactionId`.

`createCheckout` always throws `MEMBERSHIP_PROVIDER_NOT_CONFIGURED`.

Register in `PaymentProviderRegistry` as `apple: appleProvider`. Inject `AppleProvider` in `MembershipModule`.

Install `@apple/app-store-server-library` in `apps/core` (the app that runs the provider).

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppErrorCode } from '~/common/errors'
import { AppleProvider } from '~/modules/membership/providers/apple.provider'

const get = vi.fn()

describe('AppleProvider.createCheckout', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('refuses web checkout', async () => {
    const provider = new AppleProvider({ get } as any)
    await expect(
      provider.createCheckout({
        reader: { id: 'reader-1' },
        plan: 'monthly',
      }),
    ).rejects.toMatchObject({
      code: AppErrorCode.MEMBERSHIP_PROVIDER_NOT_CONFIGURED,
    })
  })
})
```

`AppException` exposes `code` — same assertion as `dodo.provider.spec.ts`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/apple.provider.spec.ts`

Expected: FAIL — `AppleProvider` not found.

- [ ] **Step 3: Implement provider, errors, registry**

Add the two error codes. Implement `AppleProvider`. Register it. `pnpm add @apple/app-store-server-library` from `apps/core`.

Verifier construction reads `configsService.get('membership')` each call (same pattern as `DodoProvider.getClient`). Required: `appleBundleId`, `appleKeyId`, `appleIssuerId`, `applePrivateKey`. Missing config → `MEMBERSHIP_APPLE_TRANSACTION_INVALID` on confirm path, `WEBHOOK_SIGNATURE_INVALID` on webhook path.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/apple.provider.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/common/errors/app-error-code.ts \
  apps/core/src/common/errors/app-error-definitions.ts \
  apps/core/src/common/errors/app-error-payload.ts \
  apps/core/src/modules/membership/providers/apple.provider.ts \
  apps/core/src/modules/membership/providers/provider.registry.ts \
  apps/core/src/modules/membership/membership.module.ts \
  apps/core/test/src/modules/membership/apple.provider.spec.ts \
  apps/core/package.json apps/core/pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(membership): verify Apple transactions and register the adapter

EOF
)"
```

(If the lockfile lives at the mx-core root, add that path instead.)

---

### Task 4: `confirmAppleTransaction` on MembershipService

**Repo:** `mx-core`

**Files:**
- Modify: `apps/core/src/modules/membership/membership.service.ts`
- Modify: `apps/core/test/src/modules/membership/membership.service.spec.ts`

**Interfaces:**
- Consumes: `AppleDecodedTransaction`, `planFromAppleProductId`, `appleActivatedEvent`, `applyEvent`, `isLiveProviderSubscription` (already private in the service file)
- Produces:

```ts
async confirmAppleTransaction(input: {
  decoded: AppleDecodedTransaction
  monthlyProductId: string
  readerId: string
  yearlyProductId: string
}): Promise<
  | { status: 'none' }
  | {
      status: MembershipStatus
      plan: MembershipPlan
      provider: MembershipProvider
      currentPeriodEnd: Date
    }
>
```

Algorithm:

1. `plan = planFromAppleProductId(decoded.productId, products)` — if `null`, throw `MEMBERSHIP_APPLE_TRANSACTION_INVALID`.
2. `bySub = findByProviderSubscriptionId(decoded.originalTransactionId)` — if found and `readerId` differs, throw `MEMBERSHIP_APPLE_ALREADY_BOUND`.
3. `byReader = findByReaderId(readerId)`.
4. If `byReader` is a live non-`apple` subscription (`isLiveProviderSubscription` && `provider !== 'apple'`), return that row’s effective status. Do not `applyEvent`.
5. Otherwise `applyEvent` with `appleActivatedEvent(...)`, `rawType: 'apple.confirm'`, `rawPayload: decoded`.
6. If `applyEvent` returns `{ applied: false }` and `byReader?.provider === 'apple'`, `update` that row to the new `originalTransactionId` / plan / `active` / `currentPeriodEnd` (resubscribe after an old Apple id). Then re-read.
7. Return `getByReaderId` mapped with `effectiveMembershipStatus`. If still missing, `{ status: 'none' }`.

- [ ] **Step 1: Write the failing tests**

Add a `describe('confirmAppleTransaction')` in `membership.service.spec.ts` using the existing `createService` / `createMembership` helpers.

```ts
const decoded = {
  expiresDate: now.getTime() + 86_400_000,
  originalTransactionId: 'orig-apple',
  productId: 'yohaku.membership.monthly',
  transactionId: 'txn-apple',
}

const products = {
  monthlyProductId: 'yohaku.membership.monthly',
  yearlyProductId: 'yohaku.membership.yearly',
}

it('creates an apple membership for a new reader', async () => {
  const { service, membershipRepository } = createService()
  membershipRepository.create.mockResolvedValue(
    createMembership({
      provider: 'apple',
      providerSubscriptionId: 'orig-apple',
      readerId: 'reader-1',
    }),
  )

  const result = await service.confirmAppleTransaction({
    decoded,
    readerId: 'reader-1',
    ...products,
  })

  expect(membershipRepository.create).toHaveBeenCalled()
  expect(result).toMatchObject({
    status: 'active',
    plan: 'monthly',
    provider: 'apple',
  })
})

it('returns the existing live Dodo membership without rewriting it', async () => {
  const { service, membershipRepository } = createService()
  const live = createMembership({ provider: 'dodo' })
  membershipRepository.findByReaderId.mockResolvedValue(live)

  const result = await service.confirmAppleTransaction({
    decoded,
    readerId: 'reader-1',
    ...products,
  })

  expect(membershipRepository.create).not.toHaveBeenCalled()
  expect(membershipRepository.update).not.toHaveBeenCalled()
  expect(result).toMatchObject({ provider: 'dodo', status: 'active' })
})

it('rejects when the originalTransactionId is bound to another reader', async () => {
  const { service, membershipRepository } = createService()
  membershipRepository.findByProviderSubscriptionId.mockResolvedValue(
    createMembership({ readerId: 'other-reader', provider: 'apple' }),
  )

  await expect(
    service.confirmAppleTransaction({
      decoded,
      readerId: 'reader-1',
      ...products,
    }),
  ).rejects.toMatchObject({
    code: AppErrorCode.MEMBERSHIP_APPLE_ALREADY_BOUND,
  })
})

it('rejects an unknown product id', async () => {
  const { service } = createService()
  await expect(
    service.confirmAppleTransaction({
      decoded: { ...decoded, productId: 'unknown.sku' },
      readerId: 'reader-1',
      ...products,
    }),
  ).rejects.toMatchObject({
    code: AppErrorCode.MEMBERSHIP_APPLE_TRANSACTION_INVALID,
  })
})
```

For the create test, mock `findByReaderId` to return `null` on the conflict check, then return the created apple row after `applyEvent` (second call). Assert `membershipRepository.create` was called and the result `provider` is `'apple'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/membership.service.spec.ts`

Expected: FAIL — `confirmAppleTransaction` is not a function.

- [ ] **Step 3: Implement `confirmAppleTransaction`**

Add the method to `MembershipService`. Reuse `applyEvent`. Do not change Dodo `applyEvent` behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/membership.service.spec.ts`

Expected: PASS, including existing `applyEvent` cases.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/membership/membership.service.ts \
  apps/core/test/src/modules/membership/membership.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(membership): confirm Apple transactions onto the membership row

EOF
)"
```

---

### Task 5: Confirm route, plans.appleIap, webhook reader bind

**Repo:** `mx-core`

**Files:**
- Modify: `apps/core/src/modules/membership/membership.controller.ts`
- Modify: `apps/core/test/src/modules/membership/membership.controller.e2e-spec.ts`
- Modify: `apps/core/src/modules/membership/providers/apple.provider.ts` only if webhook must resolve `readerId` here (prefer controller/service)

**Interfaces:**
- Consumes: `resolveAppleIapAvailability`, `AppleProvider.verifySignedTransaction`, `MembershipService.confirmAppleTransaction`
- Produces:

`POST /membership/apple/confirm` — `@ReaderAuth()`, body `{ signedTransactionInfo: string }`, demo forbidden.

```
1. resolveAppleIapAvailability — if !enabled throw MEMBERSHIP_PROVIDER_NOT_CONFIGURED
2. decoded = appleProvider.verifySignedTransaction(signedTransactionInfo)
3. return membershipService.confirmAppleTransaction({ decoded, readerId: user.id, monthlyProductId, yearlyProductId })
```

Response shape matches `GET /membership/status` (`currentPeriodEnd` serialized as elsewhere).

`GET /membership/plans` **always** includes `appleIap`:

```ts
const appleIap = resolveAppleIapAvailability(membershipConfig)
if (!availability.enabled) {
  return { enabled: false, plans: [], appleIap }
}
// existing plans mapping...
return { enabled: true, plans, appleIap }
```

When `appleIap.enabled` is false, `appleIap` is `{ enabled: false }` (no product ids). When true, include both product ids.

Webhook: after `verifyAndParseWebhook`, if the event is not ignored and `event.readerId` is empty, `findByProviderSubscriptionId(event.subscriptionId)` and fill `readerId`. If still missing, treat as ignored `missing_reader_metadata` (do not call `applyEvent`).

Register `AppleProvider` in the e2e module metadata the same way `DodoProvider` is provided. Mock `verifySignedTransaction` on the Apple provider for confirm tests.

- [ ] **Step 1: Write the failing e2e tests**

Update the existing “reports disabled with empty plans” expectation to:

```ts
expect(res.json()).toEqual({
  data: { enabled: false, plans: [], appleIap: { enabled: false } },
})
```

Update the enabled plans test to include `appleIap: { enabled: false }` (e2e `membershipConfig` has no Apple fields).

Add:

```ts
describe('POST /membership/apple/confirm', () => {
  it('returns the new apple membership for a signed-in reader', async () => {
    // mock verifySignedTransaction → known decoded
    // inject POST /membership/apple/confirm with x-test-reader
    // expect 200, data.status === 'active', data.provider === 'apple'
  })

  it('returns 401 without a reader session', async () => {
    const res = await proxy.app.inject({
      method: 'POST',
      url: '/membership/apple/confirm',
      payload: { signedTransactionInfo: 'jws' },
    })
    expect(res.statusCode).toBe(401)
  })
})
```

Add a plans test: when Apple fields are filled and `enabled: true`, `appleIap.enabled === true` and product ids match, even if you leave Dodo on.

Follow the file’s existing `x-test-reader` / `createE2EApp` patterns. Snake_case in JSON (`current_period_end`) if the rest of the file asserts that.

- [ ] **Step 2: Run the plans e2e to see the current failure**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/membership.controller.e2e-spec.ts`

Expected: FAIL on plans shape (`appleIap` missing) and confirm 404.

- [ ] **Step 3: Implement controller changes**

Add the confirm handler. Change `plans()`. Bind webhook `readerId` from `originalTransactionId` as specified. Keep `assertNotDemoMode()` on confirm and webhook.

- [ ] **Step 4: Run e2e to verify they pass**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/core && pnpm exec vitest run test/src/modules/membership/membership.controller.e2e-spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/membership/membership.controller.ts \
  apps/core/test/src/modules/membership/membership.controller.e2e-spec.ts
git commit -m "$(cat <<'EOF'
feat(membership): expose Apple confirm and appleIap on plans

EOF
)"
```

---

### Task 6: Admin Apple fields + api-client types

**Repo:** `mx-core`

**Files:**
- Modify: `apps/admin/src/features/settings/utils/membership.ts`
- Modify: `apps/admin/src/features/settings/utils/membership.test.ts`
- Modify: `apps/admin/src/features/settings/components/membership/MembershipConfigEditor.tsx`
- Modify: `apps/core/src/modules/membership/membership.controller.ts` (`GET /membership/config-status` add `applePrivateKeyConfigured: Boolean(membershipConfig.applePrivateKey)`)
- Modify: `packages/api-client/models/membership.ts`
- Modify: `packages/api-client/controllers/membership.ts`
- Modify: `packages/api-client/__tests__/controllers/membership.test.ts` if that file asserts `plans()` shape

**Interfaces:**
- Consumes: `buildMembershipWebhookUrl(apiUrl, provider)` already accepts a provider string
- Produces:

```ts
export interface MembershipAppleIap {
  enabled: boolean
  monthlyProductId?: string
  yearlyProductId?: string
}

export interface MembershipPlansResult {
  enabled: boolean
  plans: MembershipPlanInfo[]
  appleIap: MembershipAppleIap
}

// MembershipController
confirmApple(signedTransactionInfo: string) {
  return this.proxy.apple.confirm.post<MembershipStatusResult>({
    data: { signedTransactionInfo },
  })
}
```

`MembershipProvider` in api-client adds `'apple'`.

Admin: extend `MembershipConfigValue` with the six Apple fields. Show an Apple block (bundle id, key id, issuer, private key, monthly/yearly product ids) and a second webhook URL from `buildMembershipWebhookUrl(API_URL, 'apple')`. Do not add `apple` to the checkout provider `<Select>`.

Add `getAppleIapSetupChecks` that is true only when all six fields are non-empty (or `applePrivateKeyConfigured` from config-status plus the five non-secret fields). Test it in `membership.test.ts`.

- [ ] **Step 1: Write the failing admin + client tests**

```ts
it('builds the Apple webhook URL', () => {
  expect(
    buildMembershipWebhookUrl('https://mx.example.com/api/v3/', 'apple'),
  ).toBe('https://mx.example.com/api/v3/membership/webhook/apple')
})
```

Add `confirmApple` expectation in the api-client controller test mirroring `checkout` (POST path `membership/apple/confirm`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/mx-core/apps/admin && pnpm exec vitest run src/features/settings/utils/membership.test.ts`

Run the api-client test file the repo already uses for `packages/api-client/__tests__/controllers/membership.test.ts`.

Expected: FAIL on new assertions / missing method.

- [ ] **Step 3: Implement admin UI + api-client**

Keep the Dodo guide block. Add a clearly separated Apple section. `config-status` gains `applePrivateKeyConfigured`.

- [ ] **Step 4: Run tests to verify they pass**

Same commands as Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/admin/src/features/settings/utils/membership.ts \
  apps/admin/src/features/settings/utils/membership.test.ts \
  apps/admin/src/features/settings/components/membership/MembershipConfigEditor.tsx \
  apps/core/src/modules/membership/membership.controller.ts \
  packages/api-client/models/membership.ts \
  packages/api-client/controllers/membership.ts \
  packages/api-client/__tests__/controllers/membership.test.ts
git commit -m "$(cat <<'EOF'
feat(membership): surface Apple IAP settings and client confirm

EOF
)"
```

---

### Task 7: Mobile plans types, CTA kinds

**Repo:** `yohaku-oss` (paths under `apps/mobile`)

**Files:**
- Modify: `apps/mobile/src/api/membership.ts`
- Modify: `apps/mobile/src/api/membership.test.ts`
- Modify: `apps/mobile/src/api/client.ts`

**Interfaces:**
- Consumes: existing `membershipBannerKind({ membershipEnabled })` — callers will pass `appleIap.enabled` as that flag
- Produces:

```ts
export interface MembershipAppleIap {
  enabled: boolean
  monthlyProductId?: string
  yearlyProductId?: string
}

export interface MembershipPlansResult {
  appleIap: MembershipAppleIap
  enabled: boolean
  plans: unknown[]
}

export type PaywallCtaKind = 'login' | 'none' | 'subscribe'

export function paywallCtaKind(input: {
  appleIapEnabled: boolean
  loggedIn: boolean
  visible: boolean
}): PaywallCtaKind
```

`paywallCtaKind`: if `!visible` → `'none'`; if `!loggedIn` → `'login'`; if `appleIapEnabled` → `'subscribe'`; else `'none'`.

`api.membershipPlans` return type becomes `MembershipPlansResult`. Add:

```ts
membershipConfirmApple: (signedTransactionInfo: string) =>
  request<MembershipStatusResult>(
    '/membership/apple/confirm',
    undefined,
    { method: 'POST', body: { signedTransactionInfo } },
  ),
```

- [ ] **Step 1: Write the failing tests**

Append to `membership.test.ts`:

```ts
describe('paywallCtaKind', () => {
  it('asks signed-out readers to log in', () => {
    expect(
      paywallCtaKind({
        appleIapEnabled: true,
        loggedIn: false,
        visible: true,
      }),
    ).toBe('login')
  })

  it('offers subscribe when signed in and IAP is configured', () => {
    expect(
      paywallCtaKind({
        appleIapEnabled: true,
        loggedIn: true,
        visible: true,
      }),
    ).toBe('subscribe')
  })

  it('hides the button when IAP is not configured', () => {
    expect(
      paywallCtaKind({
        appleIapEnabled: false,
        loggedIn: true,
        visible: true,
      }),
    ).toBe('none')
  })

  it('hides everything when the gate is not visible', () => {
    expect(
      paywallCtaKind({
        appleIapEnabled: true,
        loggedIn: true,
        visible: false,
      }),
    ).toBe('none')
  })
})
```

Existing `membershipBannerKind` tests stay; they already treat `membershipEnabled: false` as hide CTA. Call sites in later tasks pass `appleIap.enabled`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss/apps/mobile && pnpm exec vitest run src/api/membership.test.ts`

Expected: FAIL — `paywallCtaKind` is not exported.

- [ ] **Step 3: Implement types + client method**

- [ ] **Step 4: Run tests to verify they pass**

Same vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss
git add apps/mobile/src/api/membership.ts \
  apps/mobile/src/api/membership.test.ts \
  apps/mobile/src/api/client.ts
git commit -m "$(cat <<'EOF'
feat(mobile): type Apple IAP plans and paywall CTA kinds

EOF
)"
```

---

### Task 8: Native StoreKit module

**Repo:** `yohaku-oss`

**Files:**
- Create: `apps/mobile/modules/yohaku/ios/Store/MembershipStore.swift`
- Modify: `apps/mobile/modules/yohaku/ios/YohakuModule.swift`
- Modify: `apps/mobile/modules/yohaku/index.ts`

**Interfaces:**
- Consumes: none from JS yet
- Produces: JS API on `YohakuNative`

```ts
presentSubscriptionStore(payload: { productIds: string[] }): Promise<
  | { signedTransactionInfo: string; status: 'purchased' | 'restored' }
  | { status: 'cancelled' }
>
currentEntitlementJws(payload: { productIds: string[] }): Promise<string[]>
showManageSubscriptions(): Promise<void>
```

Swift: present SwiftUI `SubscriptionStoreView(productIDs:)` from the key window. On successful `Transaction` / restore, return `transaction.jsonRepresentation` (JWS string). User dismiss without purchase → `{ status: 'cancelled' }`. Product load failure throws. `currentEntitlementJws` walks `Transaction.currentEntitlements` filtered by `productIds`. `showManageSubscriptions` calls `AppStore.showManageSubscriptions(in:)`.

No JS unit test for Swift. After wiring, TypeScript must compile.

- [ ] **Step 1: Add the JS types to `YohakuNativeModule` in `index.ts`**

Add the three methods to the interface. Implementation will come from the native module; `requireNativeModule` already returns `Yohaku`.

- [ ] **Step 2: Implement Swift + register AsyncFunctions on `YohakuModule`**

Register:

```swift
AsyncFunction("presentSubscriptionStore") { (payload: [String: Any]) -> [String: Any] in
  // present SubscriptionStoreView; return status dict
}.runOnQueue(.main)

AsyncFunction("currentEntitlementJws") { (payload: [String: Any]) -> [String] in
  // Transaction.currentEntitlements
}

AsyncFunction("showManageSubscriptions") {
  // AppStore.showManageSubscriptions
}.runOnQueue(.main)
```

- [ ] **Step 3: Typecheck the module entry**

Run: `cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss/apps/mobile && pnpm exec tsc --noEmit --pretty false`

Expected: no new errors in `modules/yohaku/index.ts`.

- [ ] **Step 4: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss
git add apps/mobile/modules/yohaku/ios/Store/MembershipStore.swift \
  apps/mobile/modules/yohaku/ios/YohakuModule.swift \
  apps/mobile/modules/yohaku/index.ts
git commit -m "$(cat <<'EOF'
feat(mobile): present StoreKit subscription store from Yohaku native

EOF
)"
```

---

### Task 9: Confirm retry + checkout hook + silent restore

**Repo:** `yohaku-oss`

**Files:**
- Create: `apps/mobile/src/screens/me/confirm-apple.ts`
- Create: `apps/mobile/src/screens/me/confirm-apple.test.ts`
- Create: `apps/mobile/src/screens/me/use-membership-checkout.ts`
- Modify: `apps/mobile/src/screens/me/use-membership.ts` only if plans typing needs a helper

**Interfaces:**
- Consumes: `YohakuNative.presentSubscriptionStore`, `YohakuNative.currentEntitlementJws`, `api.membershipConfirmApple`, `useMembershipPlans`
- Produces:

```ts
export async function confirmAppleWithRetry(
  confirm: (signedTransactionInfo: string) => Promise<MembershipStatusResult>,
  signedTransactionInfo: string,
): Promise<MembershipStatusResult> {
  try {
    return await confirm(signedTransactionInfo)
  } catch {
    return await confirm(signedTransactionInfo)
  }
}

export function useMembershipCheckout(): {
  appleIap: MembershipAppleIap | undefined
  present: () => Promise<'cancelled' | 'confirmed'>
  syncEntitlements: () => Promise<void>
}
```

`present`: if `!appleIap?.enabled` or missing product ids, return `'cancelled'`. Call `presentSubscriptionStore({ productIds: [monthly, yearly] })`. On `cancelled`, return `'cancelled'` with no toast. On purchased/restored, `confirmAppleWithRetry(api.membershipConfirmApple, jws)`, then `queryClient.invalidateQueries({ queryKey: ['membership', 'status'] })`. Confirm errors: toast `membership.confirmFailed`. Cross-account 409: toast `membership.appleAlreadyBound` if `ApiError` code matches.

`syncEntitlements`: if not logged in or `!appleIap.enabled`, return. `currentEntitlementJws` then confirm each JWS with `confirmAppleWithRetry`. Swallow errors (silent). Invalidate status on any success.

Do not set local membership optimistic state. Do not refresh post body here (Task 10).

- [ ] **Step 1: Write the failing retry tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { confirmAppleWithRetry } from './confirm-apple'

describe('confirmAppleWithRetry', () => {
  it('returns the first success', async () => {
    const confirm = vi.fn().mockResolvedValue({ status: 'active' })
    await expect(confirmAppleWithRetry(confirm, 'jws')).resolves.toEqual({
      status: 'active',
    })
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('retries once after a failure', async () => {
    const confirm = vi
      .fn()
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValue({ status: 'active' })
    await expect(confirmAppleWithRetry(confirm, 'jws')).resolves.toEqual({
      status: 'active',
    })
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it('throws when both attempts fail', async () => {
    const confirm = vi.fn().mockRejectedValue(new Error('net'))
    await expect(confirmAppleWithRetry(confirm, 'jws')).rejects.toThrow('net')
    expect(confirm).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss/apps/mobile && pnpm exec vitest run src/screens/me/confirm-apple.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `confirmAppleWithRetry` and `useMembershipCheckout`**

- [ ] **Step 4: Run tests to verify they pass**

Same vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss
git add apps/mobile/src/screens/me/confirm-apple.ts \
  apps/mobile/src/screens/me/confirm-apple.test.ts \
  apps/mobile/src/screens/me/use-membership-checkout.ts
git commit -m "$(cat <<'EOF'
feat(mobile): confirm Apple purchases with a single retry

EOF
)"
```

---

### Task 10: Paywall + Me banner + i18n

**Repo:** `yohaku-oss`

**Files:**
- Modify: `apps/mobile/src/screens/details/paywall-gate.tsx`
- Modify: `apps/mobile/src/screens/details/post-detail.tsx` (only if gate props change)
- Modify: `apps/mobile/src/screens/me/membership-banner.tsx`
- Modify: `apps/mobile/src/screens/me/me-screen.tsx` (focus already refetches; call `syncEntitlements` from the banner or Me screen)
- Modify: `apps/mobile/src/i18n/messages/en.ts`
- Modify: `apps/mobile/src/i18n/messages/ja.ts`
- Modify: `apps/mobile/src/i18n/messages/ko.ts`
- Modify: `apps/mobile/src/i18n/messages/zh.ts`
- Modify: `apps/mobile/src/i18n/messages/zh-TW.ts`

**Interfaces:**
- Consumes: `paywallCtaKind`, `useMembershipCheckout`, `useMembershipPlans`, `useSession`, `useRouter`
- Produces: visible paywall/Me behavior from the spec

`PaywallGate` props:

```ts
{
  appleIapEnabled: boolean
  loggedIn: boolean
  visible: boolean
}
```

Drop `webUrl`. Button:

- `'login'` → `router.push('/login')`, label `t('ctaLoginToSubscribe')`
- `'subscribe'` → `present()` from `useMembershipCheckout`, label `t('ctaSubscribe')`
- `'none'` → no button; keep lock title/subtitle if `visible`

After `'subscribe'` returns `'confirmed'`, existing `shouldUnlockPaywalledContent` + `refreshPostBody` in `post-detail.tsx` already runs when `useIsActiveMember()` flips. Do not add Safari.

Me banner CTA: `onPress` → `present()`, not `Linking.openURL(getSiteUrl())`. Pass `membershipEnabled={plans?.appleIap.enabled === true}` into `membershipBannerKind`. Active banner `onPress` → `YohakuNative.showManageSubscriptions()`.

Me focus: keep status/plans refetch; add `void syncEntitlements()` when `session` is set.

i18n `membership` keys (all five files):

| key | zh | en |
| --- | --- | --- |
| `lockedSubtitle` | 订阅后即可在 App 内阅读全文 | Subscribe to finish the article in the app. |
| `ctaSubscribe` | 订阅 | Subscribe |
| `ctaLoginToSubscribe` | 登录后订阅 | Sign in to subscribe |
| `becomeMemberHint` | 通过 App 内购买订阅，支持持续创作 | Subscribe in the app to support the writing |
| `confirmFailed` | 开通失败，请稍后重试 | Couldn’t start your membership. Try again. |
| `appleAlreadyBound` | 这个 Apple ID 已经开过会员 | This Apple ID already has a membership |

Keep `ctaReadInSafari` unused or delete it from all five files (delete if nothing imports it). Translate ja/ko/zh-TW to the same meaning, not English leftovers.

- [ ] **Step 1: Update i18n keys in all five locale files**

- [ ] **Step 2: Wire `PaywallGate` and `post-detail.tsx`**

`post-detail` passes `visible={showPaywallGate}`, `loggedIn={Boolean(session)}`, `appleIapEnabled={plans?.appleIap.enabled === true}`. Use `useMembershipPlans` on the detail screen (or inside the gate).

- [ ] **Step 3: Wire Me banner + silent sync**

- [ ] **Step 4: Run membership tests + lint touched files**

Run:

```
cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss/apps/mobile
pnpm exec vitest run src/api/membership.test.ts src/screens/me/confirm-apple.test.ts
pnpm exec eslint --fix src/screens/details/paywall-gate.tsx src/screens/details/post-detail.tsx src/screens/me/membership-banner.tsx src/screens/me/me-screen.tsx src/api/membership.ts src/i18n/messages/en.ts src/i18n/messages/zh.ts
```

Expected: tests PASS, eslint clean on touched files.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku/yohaku-oss
git add apps/mobile/src/screens/details/paywall-gate.tsx \
  apps/mobile/src/screens/details/post-detail.tsx \
  apps/mobile/src/screens/me/membership-banner.tsx \
  apps/mobile/src/screens/me/me-screen.tsx \
  apps/mobile/src/i18n/messages/en.ts \
  apps/mobile/src/i18n/messages/ja.ts \
  apps/mobile/src/i18n/messages/ko.ts \
  apps/mobile/src/i18n/messages/zh.ts \
  apps/mobile/src/i18n/messages/zh-TW.ts
git commit -m "$(cat <<'EOF'
feat(mobile): open IAP from the paywall and Me membership banner

EOF
)"
```

---

## Manual verification (after Task 10)

Not a coding task. Requires App Store Connect products + sandbox Apple ID + mx-core Apple keys:

1. Sandbox signed-out reader on a premium post: lock card, 「登录后订阅」, no StoreKit.
2. Sign in, non-member, IAP configured: 「订阅」presents system sheet; after buy, status is member and body refreshes in-app.
3. Me banner shows plan + days; tap opens Manage Subscriptions.
4. Dodo member in the app: no subscribe button; confirm of an Apple JWS leaves the Dodo row in place.
5. Airplane mode after a successful StoreKit charge: toast; returning to Me entitles them via silent confirm.
6. `appleIap` unconfigured: lock copy without a buy button; Me banner hidden for non-members.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Apple config fields + `resolveAppleIapAvailability` | 1 |
| Product / notification mapping | 2 |
| JWS verify + ASSN V2 adapter + error codes | 3 |
| Confirm business rules (Dodo live, cross-account, applyEvent) | 4 |
| `POST /membership/apple/confirm`, `plans.appleIap`, webhook bind | 5 |
| Admin fields, webhook URL, api-client | 6 |
| Mobile types + CTA kinds | 7 |
| `SubscriptionStoreView` native API | 8 |
| Retry confirm + silent entitlements | 9 |
| Paywall / Me entry, no Safari buy, i18n | 10 |
| Demo forbidden on confirm/webhook | 5 (existing `assertNotDemoMode`) |
| Ask to Buy unfinished | 8 (`Transaction` only when finished) |

**Out of plan (launch ops, not code):** App Store Connect group/products, App ID IAP capability, Server Notifications V2 URL, `.storekit` local file. Listed in spec “上线配置”.
