---
name: knip-cleanup
description: Use when the user wants to clean dead code via knip — "用 knip 清死代码", "清 unused", "remove unused exports/files/deps", "knip cleanup". Drives a multi-phase, commit-per-phase cleanup with codex assistance for large export batches.
---

# Knip Dead Code Cleanup

End-to-end flow for hunting dead files / unused deps / unused exports across a Next.js + pnpm monorepo with knip.

## Phase 0 — Verify knip config matches the repo

knip configs copied from other projects often point at stale workspaces (e.g. `haklex/*` in a repo without it). **Always inspect first**:

```bash
cat knip.json
cat pnpm-workspace.yaml
ls -la haklex yohaku-oss 2>&1   # confirm paths exist or not
```

If config drifts from real layout, rewrite. Yohaku reference shape:

```json
{
  "workspaces": {
    ".": { "entry": ["eslint.config.mjs", "taze.config.js"], "project": ["*.{ts,mjs,js}"] },
    "apps/web": {
      "entry": [
        "src/app/**/{page,layout,template,loading,error,not-found,route,default,sitemap,robots,opengraph-image,twitter-image,icon,apple-icon,manifest}.{ts,tsx}",
        "src/middleware.ts",
        "src/instrumentation.ts",
        "next.config.mjs",
        "vitest.config.ts",
        "src/workers/**/*.ts",
        "src/**/*.test.{ts,tsx}"
      ],
      "project": ["src/**/*.{ts,tsx,js,jsx}"],
      "ignore": ["public/**/*", "src/**/*.css", "src/types/api.ts"],
      "next": true
    }
  },
  "ignoreDependencies": ["typescript", "prettier"],
  "ignoreBinaries": ["pm2"]
}
```

Run `pnpm exec knip --no-progress | head` once to confirm sane output before any deletion.

## Phase A — Deps

Lowest blast radius. Run `pnpm exec knip --no-progress` then crosscheck each reported unused dep:

| Trap | Verify |
|------|--------|
| CSS `@import 'pkg'` | `rg "@import.*pkg" apps/web/src/styles` |
| Tailwind plugin `@plugin "pkg"` | same as above |
| Dynamic import `import('pkg')` | `rg "import\\('pkg'\\)" apps/web/src` |
| Tailwind icon classes (`i-mingcute-*`) | `rg "i-mingcute" apps/web/src \| head` |
| Next.js runtime (sharp, pm2 in scripts) | check `package.json` scripts + Next/Vercel docs |
| postcss plugin chain | `cat apps/web/postcss.config.cjs` |

For confirmed-dead deps:

```bash
cd apps/web && pnpm remove dep1 dep2 ... devDep1 devDep2
```

For confirmed false-positives, append to `knip.json` `ignoreDependencies`.

Commit: `chore(cleanup): remove N knip-detected unused dependencies`

## Phase B — Files

Run knip again. For each unused file, **grep its symbol(s) in the pre-cleanup tree** to be safe:

```bash
git grep -n "SymbolName" HEAD -- 'apps/web/src/**'
```

Validate before delete (these grep patterns catch most non-obvious uses):

- `from '~/lib/foo'` / `from './foo'` (path imports)
- `dynamic(() => import('...'))` / `lazy(() => import('...'))`
- JSX usage `<SymbolName>` (component identifiers)
- Object/Record literal references (e.g. `{ ...fooHandlers }`)
- Next.js convention names: `page`, `layout`, `template`, `loading`, `error`, `not-found`, `route`, `default`, `sitemap`, `robots`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon`, `manifest`, `middleware`, `instrumentation` — **never delete files matching these names** even if knip claims unused

Group survivors into categories before bulk delete (icons, lib helpers, modules, hooks, ui orphans, route-internal helpers). Show the user a **table** before mass deletion:

```
| Group | Count | Examples |
|-------|-------|----------|
| Icons | 13    | calendar, coffee, ... |
| ...   |       |                        |
```

Bulk delete only after explicit `y` from user. Use the persisted dead-files list:

```bash
pnpm exec knip --no-progress 2>&1 | awk '/^Unused files/,/^Unused (dependencies|devDep)/' \
  | grep -v "^Unused " | awk '{print $1}' | sort > /tmp/dead-files.txt
bash -c 'grep -v "^\.prettierrc" /tmp/dead-files.txt | while IFS= read -r f; do rm -v "$f"; done'
```

After delete:
1. `rmdir` any now-empty directories (use `ls` to confirm before rmdir)
2. **Re-grep barrel re-exports** that point at deleted files — knip won't catch dangling `export * from './deleted'` until next scan, but build will fail. Example bug:
   ```
   events/index.ts: export * from './refetch'  ← refetch.ts was deleted
   ```
   Always run `rg "export \* from '\./(deleted-file-stem)'" apps/web/src` for each deleted file.
3. `pnpm exec tsc --noEmit` in the workspace
4. Re-run knip to surface chain reactions

Commit: `chore(cleanup): remove N knip-detected dead files`

## Phase C — Exports (the heavy one)

After A+B, knip still reports `Unused exports / types / enum members`. **These are NOT all dead.** Knip misses:

- Record / object literal references in same file (typical pattern: socket handlers exported then aggregated into a `*Handlers` Record)
- Barrel re-exports (`export * from`) consumed elsewhere
- Dynamic imports / `next/dynamic`
- JSX component name usage when knip can't trace
- Enum members consumed via string-value comparison

**Delegate to codex** for full classification (don't do this manually for >50 items):

1. Snapshot knip report: `pnpm exec knip --no-progress > /tmp/knip-c-batch.txt`
2. Add `tmp-knip-analysis.md` to `.gitignore` temporarily
3. Spawn `codex:codex-rescue` agent with **explicit instructions**:
   - Output path: `<repo>/tmp-knip-analysis.md` (NOT `/tmp/` — codex sandbox is read-only there)
   - Use `rg` (faster than grep)
   - Classify each export into:
     - **A** (delete entire decl): no references anywhere
     - **B** (drop `export` keyword, keep symbol): only consumed within same file (Record literals, sibling functions)
     - **C** (false positive, leave): real consumers exist; document each location

### Phase C-A — Delete A-class entirely

Delegate again to codex:codex-rescue for the patch. Instruct:
- Delete entire `export const/function/class/interface/type/enum` block per A-class entry
- Don't touch imports (they'll cascade in next knip run)
- If a file ends up with only imports left, delete the whole file
- Run typecheck after

**Common bug**: codex sometimes concatenates remaining declarations onto the same line after deletion (e.g. `const x = atom(false)export const y = ...`). After codex returns, run:

```bash
rg -l "}\)export\b|}export\b|^}export\b|;export const" apps/web/src
```

and inspect any hits manually. Also pull each codex-touched file and read line-by-line if scope is small.

Run typecheck. Verify no new errors versus baseline (Yohaku has 1 known `tsconfig.json` deprecation warning — ignore).

Commit: `chore(cleanup): drop N knip-detected unused exports`

### Phase C-B — Strip `export` keyword from B-class

Same delegation pattern. Codex transforms:
- `export const X = ...` → `const X = ...`
- `export function X(...)` → `function X(...)`
- `export class/type/interface/enum X` → drop `export`

**Skipped items**: codex usually punts on `export { X, Y }` list-form re-exports (10ish items). Spawn **a second codex pass** for those — it'll either remove the entry from the list or delete the whole `export { }` line if list goes empty. Categorize each as informe A (re-export from external) or B (file-end aggregation list).

Commits:
- `refactor(cleanup): drop export keyword on N module-private symbols`
- `refactor(cleanup): drop M unused re-exports from export lists`

### Phase C-C — Leave C-class alone

Don't touch them; document in commit body if relevant.

## Phase Z — Finalize knip config

After A+B+C, knip should report only:
- 1 unused file (`.prettierrc.mjs` — prettier auto-loads, harmless)
- 0 unused deps / devDeps / unlisted
- N C-class exports (real false positives codex confirmed)

Tighten config to silence remaining noise:
- Add real-but-undetected deps (CSS-imported, dynamic-loaded) to `ignoreDependencies`
- Add `ignoreExportsUsedInFile: true` ONLY if you want to permanently mute B-class — usually NO, because future B-class won't be visible

Cleanup:
1. `rm tmp-knip-analysis.md`
2. Revert the temporary `.gitignore` line for it

Final commit: `chore(cleanup): finalize knip config and drop orphans`

## Critical Rules

1. **One phase, one commit.** Never batch A + B + C deletions into a single commit. Reverts must be surgical.
2. **Re-grep barrel re-exports after every file deletion.** This is the #1 silent breakage source (see Yohaku commit `3eef95f6` hotfix).
3. **Verify typecheck before each commit.** Use `pnpm exec tsc --noEmit` in the workspace, not from monorepo root unless you scope it.
4. **Show the user a categorized table before mass deletion.** Never bulk delete >5 files without explicit confirmation.
5. **Codex sandbox can't write `/tmp/`.** Always use a project-local path (e.g. `tmp-knip-analysis.md`) for codex output, gitignored.
6. **Trust but verify codex.** It miscounts (returned A=100/B=144/C=42 first pass, A=77/B=107/C=102 second pass for the same input). Always re-run knip after codex patches and read the diff.
7. **Never delete Next.js convention-named files** (page/layout/route/middleware/etc.) even when knip flags them.

## Yohaku Reference Run

Six commits, ~5400 lines of dead code removed:

| Commit | Phase | Content |
|---|---|---|
| `10bc6277` | A+B base | 73 files, 13 deps, knip config rewrite |
| `023a6cbb` | C-A | 77 unused exports |
| `a9284ef9` | C-B main | 97 export-keyword strips |
| `efc12ac4` | C-B follow | 10 re-export list trims |
| `3eef95f6` | hotfix | Dangling barrel re-export |
| `6a80d1c1` | Z | Knip config finalize + 1 orphan css |

Use this as a yardstick: if your cleanup yields wildly different ratios (e.g. >50% C-class), the knip config probably isn't catching real consumers — fix entry/project patterns before deleting anything.
