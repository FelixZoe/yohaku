# OTA or TestFlight ship — Design

Date: 2026-08-19
Scope: closed `innei-dev/yohaku` trigger + `Innei/yohaku-remote-deploy` ship routing. Protocol Worker on `ota.innei.in` is unchanged.

## Problem

Mobile JS changes currently always dispatch TestFlight. OTA was published once by hand. Native-unchanged commits should ship a JS update; native changes should ship a new binary.

## Decisions

1. **One ship pipeline.** Closed-repo `main` path filters dispatch `trigger-ship`. Remote-deploy decides OTA vs TestFlight.
2. **Decision key = `@expo/fingerprint` @ 0.20.2** (same package `easc` uses). Compare to Actions variable `YOHAKU_IOS_FINGERPRINT` on `yohaku-remote-deploy`. Empty / missing / mismatch / `force_testflight` → TestFlight. Match → OTA.
3. **`runtimeVersion.policy = fingerprint`.** Next TestFlight embeds that hash. Old `1.0.0` binaries keep the last `1.0.0` OTA and do not receive newer JS.
4. **After a successful TestFlight, write the fingerprint variable.** Manual TestFlight does the same.
5. **OTA runs on Ubuntu** with `easc update --channel production` from `Innei/expo-ota`. Secrets: `OTA_SERVER`, `OTA_API_KEY`. Same `EXPO_PUBLIC_*` as TestFlight.
6. **Existing `trigger-testflight` / `testflight.yml` dispatch stays** for an explicit IPA. Ship calls TestFlight via `workflow_call`.

## Out of scope

- Publishing `easc` to npm
- Android
- Changing the protocol Worker
- Fixing `expo export` `'use dom'` (must work before the OTA job can succeed)
