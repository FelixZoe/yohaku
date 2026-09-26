---
name: release-api-client
description: Use when needing to publish a new version of @mx-space/api-client to npm — typically after editing api-client types in mx-core and before bumping the dep in Yohaku/admin-vue3. Triggers on "bump api-client", "release api-client", "publish api-client", "把 api-client 发到 npm", "发个 api-client", "需要新版 api-client".
---

# Release `@mx-space/api-client`

End-to-end automation of the api-client publish flow. After this skill runs, the new version is on npm registry and the bump commit is pushed to mx-core's `master`.

## Repo & tool

- **Repo:** `/Users/innei/git/innei-repo/mx-core`
- **Branch:** `master` (not `main`)
- **Package dir:** `packages/api-client`
- **Tool:** `bump` (Innei's CLI, `~/Library/pnpm/bump`); config is inline in `packages/api-client/package.json` under the `bump` field
- **What `bump <type>` does:** runs `before` hooks (`git pull --rebase` → `pnpm i` → `npm run package`) → bumps version in package.json → makes commit `chore(release): bump @mx-space/api-client to v<NEW>` → runs `after` hooks (`npm publish --access=public`) → pushes the commit (default `doGitPush: true`)
- **Auth:** `npm whoami` should print `innei`. If it doesn't, the user must `npm login` first.

## Pre-flight (run all in parallel)

```bash
# 1. on master?
git -C /Users/innei/git/innei-repo/mx-core branch --show-current
# Expected: master

# 2. Working tree clean? (api-client source must already be committed)
git -C /Users/innei/git/innei-repo/mx-core status --short
# Expected: empty output

# 3. npm authenticated?
npm whoami
# Expected: innei

# 4. Current version
node -p "require('/Users/innei/git/innei-repo/mx-core/packages/api-client/package.json').version"

# 5. Latest published version
npm view @mx-space/api-client version
```

**Abort** if:
- Branch isn't `master` → tell user, ask if they want to switch
- Working tree dirty → tell user the changes need to be committed first; do **not** offer to commit on the user's behalf — those source changes are the actual reason for the bump and may need a real commit message
- `npm whoami` errors → ask user to `npm login`
- Local version != latest published → unusual; surface to user (it means a previous bump committed but failed to publish, or a version was bumped without publishing). Skip the bump and recover via "Recovery — local commit but unpublished" below.

## Picking the bump type

Match the change shape:

| Change kind | Type | Example |
| --- | --- | --- |
| Type-only widening (added optional fields, expanded `Pick<>`) | `patch` | adding `tagsSum?` to `CategoryWithChildrenModel` |
| New endpoint, new method on a controller, new exported type | `minor` | adding `getCategoryTagsSum` |
| Removed/renamed exports, breaking type narrowing, dropped fields | `major` | renaming `CategoryWithChildrenModel.children` |
| Mixed — new endpoint + extended types | `minor` | (the typical case for a feature release) |

If unsure, ask the user. Default to `patch` for purely additive type changes; `minor` for any new method or new exported type.

## Run bump

```bash
cd /Users/innei/git/innei-repo/mx-core/packages/api-client
bump <patch|minor|major>
```

Read the output stream. The expected ordering is:

1. `git pull --rebase` (no-op if up to date)
2. `pnpm i`
3. `npm run package` (builds dist/)
4. Version bump in package.json
5. `git commit -m "chore(release): bump @mx-space/api-client to v<NEW>"`
6. `npm publish --access=public`
7. `git push`

**On success**, capture the new version from the commit message or the `npm publish` output line `+ @mx-space/api-client@<NEW>`. Report it back to the user / caller.

## Failure modes & recovery

### A) `pnpm i` or `npm run package` fails

The bump aborts before any commit. Diagnose the build error from the output. Common causes:
- Type error in `packages/api-client/` — fix and re-run `bump`
- Stale `dist/` from a previous abandoned run — `rm -rf dist && pnpm run package` to confirm a clean build before retrying

No cleanup needed. Just fix and re-run.

### B) `npm publish` fails with `EOTP` / `E2FA` (one-time password required)

The version commit and push already happened. Recover with:

```bash
cd /Users/innei/git/innei-repo/mx-core/packages/api-client
# Ask user for OTP from their authenticator
npm publish --access=public --otp=<6-digit-otp>
```

Then verify:

```bash
npm view @mx-space/api-client version
```

Should match the new local version.

### C) `npm publish` fails with `EPUBLISHCONFLICT` (version already exists on registry)

Means a previous run published but the local commit/push failed earlier. Verify:

```bash
npm view @mx-space/api-client version
node -p "require('/Users/innei/git/innei-repo/mx-core/packages/api-client/package.json').version"
```

If they match — already done. Just push the commit if not pushed:

```bash
git -C /Users/innei/git/innei-repo/mx-core push origin master
```

### D) `git push` fails (rejected, non-fast-forward)

```bash
git -C /Users/innei/git/innei-repo/mx-core pull --rebase origin master
git -C /Users/innei/git/innei-repo/mx-core push origin master
```

### E) Recovery — local commit but unpublished

Symptom: pre-flight shows local version > latest npm published version.

```bash
cd /Users/innei/git/innei-repo/mx-core/packages/api-client
npm publish --access=public            # add --otp=<x> if 2FA
git -C /Users/innei/git/innei-repo/mx-core push origin master
```

Do **not** create a new bump commit in this case — the version bump commit already exists.

### F) `before` hook `git pull --rebase` fails (conflicts on master)

Surface to user — implies upstream conflicts on master that need manual resolution. Don't try to auto-resolve.

## Post-checks

After success, confirm the new version is on the registry (often takes 5–30 seconds to propagate):

```bash
npm view @mx-space/api-client version
```

If it doesn't match the local version yet, wait 10s and retry once. If still stale after 60s, registry propagation is unusual — surface to user.

## Reporting back

When done, report:
- Old version → new version
- Bump type used
- Commit SHA of the bump (`git -C /Users/innei/git/innei-repo/mx-core log -1 --oneline`)
- Confirmation that `npm view` shows the new version

If invoked as part of a longer plan (e.g., from `superpowers:executing-plans` or `subagent-driven-development`), the calling agent can now proceed to bump the consumer's `package.json` (e.g., `Yohaku/apps/web/package.json`) to the new version.

## Out of scope

- The skill does not bump consumer `package.json` files (Yohaku, admin-vue3) — that's the caller's responsibility, since version-pin policy varies (`^`, exact, `workspace:*`).
- The skill does not generate a CHANGELOG — `bump`'s default `shouldGenerateChangeLog: false` is left as-is.
- The skill does not create a git tag — `tag: false` in package.json's bump config is intentional.
