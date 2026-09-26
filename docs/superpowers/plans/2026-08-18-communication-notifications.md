# Communication Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver localized, deep-linkable Yohaku content notifications and avatar-backed Communication Notifications for comment replies.

**Architecture:** mx-core emits a strict public notification projection through the shared push protocol. Push Relay converts that projection to APNs localization keys. The Expo app generates a native Notification Service Extension that upgrades only reply notifications to `INSendMessageIntent`; post/note/thinking notifications remain regular alerts.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS, APNs HTTP/2, Expo SDK 57, Swift, UserNotifications, Intents, `@bacons/apple-targets`, GitHub Actions.

## Global Constraints

- Do not send comment text, email, reader IDs, or private article bodies to APNs.
- Do not enqueue a content notification when no explicit summary exists.
- Use Communication Notifications only for comment replies.
- Keep content notifications as standard one-icon notifications.
- Accept only internal absolute paths beginning with `/` and HTTPS avatar URLs.
- Keep APNs payloads below 4 KB.
- Do not commit provisioning profiles, certificates, or API keys.
- Do not commit changes unless the user explicitly asks.

---

### Task 1: Public Push Projection

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/packages/push-protocol/src/protocol.ts`
- Modify: `/Users/innei/git/innei-repo/mx-core/packages/push-protocol/test/protocol.spec.ts`

**Interfaces:**
- Produces content data `{ resource_id, resource_type, display_title, summary, target_path }`.
- Produces reply data `{ resource_id, resource_type, recipient_reader_id, sender_id, sender_name, sender_avatar_url?, target_title, target_path }`.

- [ ] Add failing schema tests for bounded titles/summaries, HTTPS avatars, and safe internal paths.
- [ ] Run `pnpm --filter @mx-space/push-protocol test` and confirm the new cases fail.
- [ ] Add strict Zod fields and reject schemes, protocol-relative paths, query-only paths, fragments, and oversized copy.
- [ ] Re-run the focused protocol tests and confirm they pass.

### Task 2: mx-core Event Enrichment

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/core/src/modules/push/push.service.ts`
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/core/src/modules/push/push.module.ts`
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/core/test/src/modules/push/push.service.spec.ts`

**Interfaces:**
- Consumes the Task 1 event types.
- Produces public paths matching mobile routes: `/posts/:category/:slug`, `/notes/:nid`, `/thinking/:id`, and `/comments/:refId`.

- [ ] Add failing tests proving content without a summary is skipped and content with a summary has title/path metadata.
- [ ] Add failing tests proving replies include sender display name/avatar and target title/path without reply text.
- [ ] Run `pnpm --filter @mx-space/core exec vitest run test/src/modules/push/push.service.spec.ts`.
- [ ] Resolve public content and sender identity from repositories/services, normalize the fields, and enqueue only complete projections.
- [ ] Re-run the focused core test.

### Task 3: Localized APNs Payloads

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/push-relay/src/apns-provider.ts`
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/push-relay/test/relay-service.spec.ts`

**Interfaces:**
- Content alerts use `title-loc-key`, `subtitle-loc-key`, `loc-key`, and localization arguments.
- Reply alerts set `mutable-content: 1` and carry sender metadata for the extension.

- [ ] Add failing tests for localized standard content payloads and mutable reply payloads.
- [ ] Verify recipient reader IDs never reach APNs and content payloads do not contain avatar fields.
- [ ] Run `pnpm --filter @mx-space/push-relay test`.
- [ ] Implement the minimal APNs projection and re-run the focused tests.

### Task 4: iOS Localization, Routing, and Service Extension

**Files:**
- Modify: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/app.json`
- Modify: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/package.json`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/targets/notification-service/expo-target.config.js`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/targets/notification-service/NotificationService.swift`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/assets/notifications/Localizable.xcstrings`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/plugins/with-notification-localizations.cjs`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/src/push/notification-routing.ts`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/src/push/notification-routing.test.ts`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/src/push/use-notification-routing.ts`
- Modify: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/src/app/_layout.tsx`

**Interfaces:**
- The extension bundle ID is `in.innei.notification-service`.
- The extension reads `event_type`, `sender_id`, `sender_name`, `sender_avatar_url`, and `target_path`.
- Routing accepts only the known post, note, thinking, and comment route shapes.

- [ ] Add failing route parser tests for allowed and hostile payloads.
- [ ] Add five-locale string-catalog entries and a config plugin that embeds the catalog in the main app.
- [ ] Add `@bacons/apple-targets`, generate the notification-service target, link `UserNotifications` and `Intents`, and add `INSendMessageIntent` to `NSUserActivityTypes`.
- [ ] Implement an exactly-once Swift completion path: validate HTTPS avatar URL, download with size/status/MIME limits, create `INPerson`, donate an incoming `INSendMessageIntent`, call `updating(from:)`, and fall back to original content.
- [ ] Route cold-start and foreground notification responses through Expo Router.
- [ ] Run `pnpm --filter @yohaku/mobile test` and `pnpm --filter @yohaku/mobile exec tsc --noEmit`.
- [ ] Run `npx expo prebuild --platform ios --clean --no-install` and inspect both target entitlements/build settings.

### Task 5: Provisioning and TestFlight CI

**Files:**
- Modify: `Innei/yohaku-remote-deploy:.github/workflows/testflight.yml`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/scripts/manual-signing.mjs`
- Create: `/Users/innei/git/innei-repo/Yohaku/apps/mobile/scripts/apply-manual-signing.mjs`
- Secret: `IOS_APPSTORE_PROFILE`
- Secret: `IOS_NOTIFICATION_SERVICE_PROFILE`

**Interfaces:**
- Main profile must contain `com.apple.developer.usernotifications.communication = true` and `aps-environment = production`.
- Extension profile must match `KAMM5N88X3.in.innei.notification-service`.
- `xcodebuild` accepts only one `PROVISIONING_PROFILE_SPECIFIER`, and `@bacons/apple-targets` hardcodes automatic signing for its target, so signing is patched into the generated project after prebuild via `YOHAKU_APP_PROFILE_NAME` / `YOHAKU_EXTENSION_PROFILE_NAME`.

- [x] Update `IOS_APPSTORE_PROFILE` from `/Users/innei/Downloads/Yohaku (3).mobileprovision`.
- [x] Create the explicit extension App ID and App Store provisioning profile in Apple Developer (`Yohaku Notification Service` → `KAMM5N88X3.in.innei.notification-service`).
- [x] Add the extension profile as `IOS_NOTIFICATION_SERVICE_PROFILE`.
- [x] Patch per-target manual signing after prebuild with a tested script instead of command-line build settings.
- [x] Update CI to validate/install both profiles, export both bundle IDs, and verify the embedded extension plus signed entitlements.
- [x] Validate the workflow with `actionlint` (shellcheck enabled) without exposing secret values.

### Task 6: Verification

**Files:**
- Follow: `/Users/innei/git/innei-repo/Yohaku/.cursor/skills/verifying-yohaku-apns/SKILL.md`

- [ ] Run scoped protocol/core/relay/mobile tests.
- [ ] Build the generated Xcode workspace for a simulator.
- [ ] Push a localized regular content notification and verify it opens its target.
- [ ] Push a comment reply and verify the extension upgrades it while avatar failure still delivers the original alert.
- [ ] Run the local core → Relay → APNs sandbox chain and record delivery IDs without recording credentials.
