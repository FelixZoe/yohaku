---
name: bump-haklex
description: Use when upgrading @haklex/* packages across Shiroi, admin-vue3, and mx-core repos. Triggers on "bump haklex", "update haklex version", or "haklex 发布了 x.x.x 版本".
---

# Bump @haklex Packages

Update `@haklex/*` dependencies across three repos, install, commit, and push.

## Repos and Packages

| Repo | Path | Packages |
|------|------|----------|
| Shiroi (web) | `apps/web/package.json` | rich-editor, rich-kit-shiro, rich-static-renderer |
| admin-vue3 | `package.json` | rich-diff, rich-editor, rich-editor-ui, rich-kit-shiro, rich-plugin-toolbar, rich-style-token |
| mx-core | `apps/core/package.json` | rich-headless |

## Steps

1. **Read version** from `haklex/rich-editor/package.json` 的 `version` 字段 — 此即最新版本
2. **Grep** `@haklex/` in all three repos' `package.json` to confirm current versions
3. **Edit** each `package.json` — bump all `@haklex/*` to latest version
4. **pnpm install** in all three repos (parallel)
5. **Commit & push** admin-vue3 and mx-core with message `chore(deps): bump @haklex packages to {version}`
6. Shiroi 不自动 commit — 留给用户随其他改动一并提交

## Repo Paths

- Shiroi: `/Users/innei/git/innei-repo/Shiroi`
- admin-vue3: `/Users/innei/git/innei-repo/admin-vue3`
- mx-core: `/Users/innei/git/innei-repo/mx-core`
