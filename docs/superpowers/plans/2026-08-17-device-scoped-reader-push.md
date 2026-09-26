# Device-Scoped Reader Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an iOS device to subscribe to Yohaku content push while logged out, associate that same binding with a reader only while logged in, and request notification permission after an explicit first-run explanation.

**Architecture:** Push Relay owns installation-authenticated device state and preferences. mx-core anonymously claims an installation activation ticket into its source, adding the current reader id only when a valid session is present. The mobile app stores the installation credential, manages its relay binding directly, and reclaims it whenever session identity changes.

**Tech Stack:** TypeScript, NestJS, PostgreSQL, Zod, Vitest, Expo Notifications, Expo SecureStore, React Native.

## Global Constraints

- iOS only; do not add Android push configuration.
- Never place reader ids or other PII in APNs payloads.
- Content push works without a login; reply push requires a binding currently associated with the recipient reader.
- An installation credential may manage only bindings owned by that installation.
- Source credentials remain required for event delivery and source-wide operations.
- Notification permission is requested only after the user confirms the in-app explanation.
- A dismissed first-run explanation is not shown automatically again; Me settings remain available.
- Existing Space admin `comment.created` delivery behavior must remain unchanged.

---

### Task 1: Relay device-owned binding API

**Files:**
- Modify: `../mx-core/apps/push-relay/src/types.ts`
- Modify: `../mx-core/apps/push-relay/src/postgres-store.ts`
- Modify: `../mx-core/apps/push-relay/src/relay-service.ts`
- Modify: `../mx-core/apps/push-relay/src/http-server.ts`
- Modify: `../mx-core/apps/push-relay/test/relay-service.spec.ts`
- Modify: `../mx-core/apps/push-relay/test/postgres-store.integration.spec.ts`

**Interfaces:**
- Produces installation-authenticated `GET /v1/bindings/:id`, `PUT /v1/bindings/:id/preferences`, and `DELETE /v1/bindings/:id`.
- Claim remains source-authenticated but upserts the same `(source_id, installation_id)` binding and may replace `reader_id` with `null`.

- [ ] Write failing service tests proving an installation can read/update/revoke its own binding and receives 404 for another installation's binding.
- [ ] Run the relay tests and verify the new tests fail because the store/service interfaces do not support installation ownership.
- [ ] Add store lookup/update/revoke methods constrained by `installation_id`; keep source-auth methods only where mx-core needs source-wide control.
- [ ] Route device binding endpoints through `Installation {id}.{secret}` authentication.
- [ ] Add integration assertions that claim upsert preserves device preferences while replacing/clearing `reader_id`.
- [ ] Run relay unit and Postgres integration tests and verify they pass.

### Task 2: Anonymous mx-core activation with optional reader association

**Files:**
- Modify: `../mx-core/apps/core/src/modules/push/push.controller.ts`
- Modify: `../mx-core/apps/core/src/modules/push/push.service.ts`
- Modify: `../mx-core/apps/core/src/modules/push/push.repository.ts`
- Modify: `../mx-core/apps/core/src/modules/push/push.schema.ts`
- Modify: `../mx-core/apps/core/src/modules/push/push.types.ts`
- Modify: `../mx-core/apps/core/src/modules/push/push.module.ts`
- Modify: `../mx-core/apps/core/src/common/openapi/route-manifest.ts`
- Modify: `../mx-core/apps/core/test/src/modules/push/push.controller.spec.ts`
- Modify: `../mx-core/apps/core/test/src/modules/push/push.service.spec.ts`
- Remove if unused: `../mx-core/apps/core/src/common/decorators/push-auth.decorator.ts`
- Remove if unused: `../mx-core/apps/core/src/common/guards/push-auth.guard.ts`
- Remove if unused: `../mx-core/apps/core/src/database/migrations/0033_push_reader_preferences.sql`

**Interfaces:**
- Consumes relay claim with nullable `reader_id`.
- Produces anonymous `POST /notifications/push/activate`; valid sessions add `reader_id`, absent sessions claim with no reader id.

- [ ] Write failing controller/service tests for anonymous activation, logged-in association, and logged-out reassociation clearing `reader_id`.
- [ ] Run push controller/service tests and verify they fail under the class-level `PushAuth` guard and required reader id.
- [ ] Make only activation public/optional-session; remove reader-scoped status/preferences/deactivation endpoints now owned by Relay.
- [ ] Store source/binding metadata without requiring a reader and retain source credentials for event dispatch.
- [ ] Remove the reader-preferences table/schema and regenerate OpenAPI/migration metadata consistently.
- [ ] Run core push, guard, migration-lint, OpenAPI, and typecheck tests.

### Task 3: Mobile device manager and session reassociation

**Files:**
- Modify: `apps/mobile/src/push/relay-client.ts`
- Modify: `apps/mobile/src/push/manager.ts`
- Modify: `apps/mobile/src/push/runtime.ts`
- Modify: `apps/mobile/src/push/use-push-lifecycle.ts`
- Modify: `apps/mobile/src/push/types.ts`
- Modify: `apps/mobile/src/api/client.ts`
- Modify: `apps/mobile/src/auth/session.ts`
- Test: `apps/mobile/src/push/relay-client.test.ts`
- Test: `apps/mobile/src/push/manager.test.ts`
- Test: `apps/mobile/src/api/client.push.test.ts`

**Interfaces:**
- Consumes installation-authenticated Relay binding status/preferences/deactivation.
- `enablePush()` no longer requires a session.
- `refreshReaderAssociation()` gets a fresh activation ticket and calls mx-core activation whenever session id changes.

- [ ] Write failing tests for logged-out enable, relay-owned preferences/status/deactivate, and login/logout reassociation.
- [ ] Run focused tests and verify failures reflect the old reader-scoped API.
- [ ] Extend Relay client methods and parse binding responses.
- [ ] Refactor manager state restore and mutations to Relay, using mx-core only to claim/associate.
- [ ] Remove sign-out binding deactivation; session lifecycle instead reclaims anonymously after logout.
- [ ] Run focused push/API tests and verify they pass.

### Task 4: First-run explanation and Me controls

**Files:**
- Create: `apps/mobile/src/push/onboarding.ts`
- Create: `apps/mobile/src/push/notification-settings.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/screens/me/me-screen.tsx`
- Modify: `apps/mobile/src/i18n/messages/en.ts`
- Modify: `apps/mobile/src/i18n/messages/zh.ts`
- Modify: `apps/mobile/src/i18n/messages/zh-TW.ts`
- Modify: `apps/mobile/src/i18n/messages/ja.ts`
- Modify: `apps/mobile/src/i18n/messages/ko.ts`
- Test: `apps/mobile/src/push/onboarding.test.ts`
- Test: `apps/mobile/src/i18n/messages.test.ts`

**Interfaces:**
- `shouldOfferPushOnboarding({ configured, authorizationStatus, decision })` returns true only once while permission is undetermined.
- Confirmation persists the decision before calling `enablePush()`; dismissal persists without requesting system permission.

- [ ] Write failing pure tests for first-run decision behavior.
- [ ] Implement SecureStore-backed onboarding decision and a root-mounted native explanation dialog.
- [ ] Add Me main toggle plus four preference toggles, visible whenever relay config exists regardless of session.
- [ ] Add all copy to five locale catalogs.
- [ ] Run onboarding, i18n, and push tests.

### Task 5: Cross-repository verification and PR update

- [ ] Run scoped protocol, relay, core push, and mobile push suites.
- [ ] Run scoped typechecks and migration/OpenAPI checks.
- [ ] Review both branch diffs for PII, auth ownership, anonymous activation abuse, and Space regression.
- [ ] Commit changes in each repository, push both feature branches, and update draft PR descriptions to reflect device scope.
