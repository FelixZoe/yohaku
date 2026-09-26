---
name: verifying-yohaku-apns
description: Use when verifying Yohaku push notifications end-to-end through local mx-core, local Push Relay, APNs sandbox, and an iOS Simulator, or when diagnosing TestFlight/production issues such as hidden notification UI, Expo public env drift, relay unknown_app errors, activation failures, BadDeviceToken, entitlements, or missing notification banners.
---

# Verifying Yohaku APNs

This skill has two jobs:

1. Prove the local sandbox boundary:
   `local mx-core → local Push Relay → APNs sandbox → iOS Simulator`
2. Triage production/TestFlight regressions before rebuilding or retriggering CI.

Unit tests, Relay acceptance, or an APNs ID alone are insufficient. Completion requires a real Simulator binding, Relay delivery with `apns_id`, and a visible notification banner.

## Safety

- Preserve unrelated working-tree changes.
- Never print, commit, or persist the `.p8` outside a mode-0600 temp directory.
- Do not truncate shared push tables. Identify this run by a unique event/resource ID.
- Probe ports, container names, Simulator UDID, and database mappings; do not assume defaults.
- A `400:BadDeviceToken` from an intentionally fake/stale row is expected. Judge the real Simulator row separately.

## Prerequisites

- Sibling repos: `Yohaku` and `../mx-core`; core branch contains anonymous push activation.
- Apple Silicon, booted iOS Simulator, Xcode, AXe, `op`, Docker, PostgreSQL/Redis.
- 1Password document: `Apple Developer / Yohaku APNs Sandbox`.
- APNs metadata: app `yohaku`, bundle `in.innei`, team `KAMM5N88X3`, environment `development`.

## Production Facts

- TestFlight / App Store builds use `EXPO_PUBLIC_APNS_ENV=production`.
- The client registers with Push Relay as app id `yohaku` and bundle id `in.innei`.
- Production Relay must include a `yohaku` entry in `PUSH_RELAY_APPS_JSON`; `space` alone is not enough.
- Production mx-core must allow the relay origin through `MX_PUSH_RELAY_ORIGINS` and have encryption enabled.
- Expo only inlines direct `process.env.EXPO_PUBLIC_*` reads. If push config reads from an intermediate `env = process.env` object, the production bundle may silently lose the relay URL and hide the whole notification section.

## Fast Triage

Before opening Xcode or rebuilding anything, classify the symptom:

| Symptom | Most likely cause | First check |
|---|---|---|
| Notification section hidden entirely | `EXPO_PUBLIC_PUSH_RELAY_URL` missing from the built app, or Expo env inlining bug | Inspect `apps/mobile/src/push/config.ts`, `apps/mobile-overlay/expo.json`, and the actual build/bundle |
| Notification section visible, but shows `The app is not configured by this relay` | Production Relay missing `yohaku` in `PUSH_RELAY_APPS_JSON` | Register a dummy installation against production Relay with `app_id: "yohaku"` |
| Activation reaches mx-core but returns 4xx/5xx | Relay origin allowlist or encryption problem | Check `MX_PUSH_RELAY_ORIGINS`, `ENCRYPT_ENABLE`, `MX_ENCRYPT_ENABLE` |
| Relay row exists but delivery says `BadDeviceToken` | Wrong APNs environment, stale install, or stale build on device/simulator | Check environment, reinstall app, compare fresh row only |
| APNs delivered but no banner | App permission, foreground presentation, or notification routing | Check permission state and app-side foreground handling |

## Workflow

### A. Production / TestFlight diagnosis

1. **Confirm what the user actually sees**
   - Hidden section, relay error copy, no iOS prompt, no banner, or APNs-delivered-but-no-UI are different failure classes.
   - Ask for a screenshot if needed; exact copy matters.

2. **Check the built client config path**
   - Read `apps/mobile/src/push/config.ts` and confirm public env values are read via direct `process.env.EXPO_PUBLIC_*` access.
   - Read `apps/mobile-overlay/expo.json` and confirm:
     ```json
     {
       "EXPO_PUBLIC_PUSH_APP_ID": "yohaku",
       "EXPO_PUBLIC_PUSH_RELAY_URL": "https://<production-relay-origin>",
       "EXPO_PUBLIC_APNS_ENV": "production"
     }
     ```
   - If the UI is hidden in a release build, prove whether the relay URL was inlined into the bundle; a green CI log is not enough.

3. **Probe production Relay before blaming the client**
   - `POST /v1/installations` with a dummy 64-hex token and `app_id: "yohaku"`.
   - `201` means the manifest knows Yohaku.
   - `422 {"error":"unknown_app"}` means Relay is missing the `yohaku` app config; fix Railway `PUSH_RELAY_APPS_JSON` first.
   - Do not assume `space` working implies `yohaku` works; each app id is configured independently.

4. **Check production Relay manifest inputs**
   - Required manifest shape:
     ```json
     [{
       "id": "yohaku",
       "bundleId": "in.innei",
       "teamId": "KAMM5N88X3",
       "keys": {
         "production": {
           "keyId": "<APNS key id>",
           "privateKeyPath": "<container path>"
         }
       }
     }]
     ```
   - Never print the private key itself.
   - If Railway already stores `PUSH_RELAY_APNS_PRIVATE_KEY`, make sure the deployed service actually wires that key into the manifest used at startup.

5. **Check mx-core production gate**
   - Confirm `MX_PUSH_RELAY_ORIGINS` contains the exact Relay origin.
   - Confirm encryption is enabled before debugging client retries.

6. **Only retrigger TestFlight after the above is proven**
   - A rebuild cannot fix a missing Relay manifest entry.
   - A Relay fix alone can resolve `unknown_app` without a new mobile binary.

### B. Local sandbox proof

1. **Inspect state**
   - Read existing terminal metadata before starting Metro/core/Relay.
   - Record branch, dirty files, booted UDID, Xcode version, and active ports.
   - Discover the PostgreSQL container/host port. This machine commonly uses `mx-pg-dev` on host `5433`; verify it.

2. **Start Relay**
   - Use `../mx-core/apps/push-relay/scripts/start-local-with-1password.sh`.
   - Its ignored `.env.local` supplies database URL/data key.
   - Confirm logs show migrations complete and `Push Relay listening on http://127.0.0.1:8787`.

3. **Start core**
   - Start `../mx-core` with `ENCRYPT_ENABLE=true MX_ENCRYPT_ENABLE=true`.
   - A 64-character encryption key must already be available; never echo it.
   - Development implicitly allows loopback Relay origins. Confirm `/notifications/push/activate` is mapped.

4. **Prepare mobile**
   - Ignored `apps/mobile/.env.local`:
     ```dotenv
     EXPO_PUBLIC_API_URL=http://127.0.0.1:2333
     EXPO_PUBLIC_PUSH_RELAY_URL=http://127.0.0.1:8787
     EXPO_PUBLIC_PUSH_APP_ID=yohaku
     EXPO_PUBLIC_APNS_ENV=development
     ```
   - Native configuration must include `aps-environment=development` and `UIBackgroundModes` containing `remote-notification`.
   - Rebuild, install the new `Yohaku.app`, and inspect build logs for the entitlement. A stale installed build is not evidence.

5. **Activate anonymously**
   - Restart Metro after changing public env.
   - Launch Yohaku logged out. Confirm app explanation appears before the iOS permission dialog.
   - Accept both; confirm Me shows the notification master switch and topic switches.
   - Core must log `POST /notifications/push/activate 201`.
   - Query both databases without exposing token ciphertext. Require active `yohaku/development` binding and null core `owner_id` / Relay `reader_id`.

6. **Deliver through core**
   - Background or keep the app visible for a foreground banner.
   - Execute `scripts/enqueue-content-push.sh` from this skill.
   - The script inserts one schema-valid, unique content event into core's outbox, waits for core dispatch, and prints core plus Relay delivery status.

7. **Capture proof**
   - Require core outbox `delivered`.
   - Require the matching Relay row `delivered`, empty `last_error`, and non-null `apns_id`.
   - Capture Simulator pixels showing the expected banner and an AX hierarchy/log around the action.
   - If another row says `BadDeviceToken`, verify that the delivered row maps to the fresh Simulator installation; do not call the whole run failed.

## Failure Guide

| Symptom | Check |
|---|---|
| Activate 500 | Core encryption enabled and key length 64 |
| Notification UI hidden | Metro restarted with all `EXPO_PUBLIC_PUSH_*` values, and `loadPushConfig()` uses direct `process.env.EXPO_PUBLIC_*` reads rather than indirect `process.env` object access |
| `The app is not configured by this relay` | Production Relay `PUSH_RELAY_APPS_JSON` includes `id: "yohaku"` with bundle `in.innei` |
| No system prompt/token | Native `aps-environment=development`, fresh build/install |
| Activate rejects Relay | Loopback origin and development core process |
| Relay `BadDeviceToken` | Stale/fake installation versus fresh Simulator binding |
| APNs delivered, no banner | App permission, foreground handler, screenshot timing |

## Cleanup

Stop only services started for the run. Let the Relay trap delete its temp `.p8`. Remove test events using their unique `skill-proof-*` IDs if desired. Do not delete shared volumes, user data, or unrelated bindings.
