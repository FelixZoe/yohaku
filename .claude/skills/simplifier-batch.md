---
name: simplifier-batch
description: Use when the user wants to do a code simplification / refactor pass — "用 code-simplifier 扫", "简化代码", "refactor 重复 / DRY 一下", "scan codebase for simplifications". Drives a multi-phase scan → tier-by-tier patch → codex review pipeline using `code-simplifier` and `codex:codex-rescue` agents.
---

# Code Simplifier Batch

End-to-end recipe for refining an existing codebase: find bugs, dedupe duplicated patterns, remove indirection, modernize. Pairs naturally with `knip-cleanup` (run that first to clear pure dead code; this skill handles the harder semantic simplifications).

## When this skill applies

- User says any of: "扫 codebase / 简化", "code-simplifier 扫一遍", "DRY", "找重复", "simplify pass", "refactor cleanup"
- After a `knip-cleanup` pass surfaces remaining duplication
- Before a major release as a polish step

## Phase 0 — Scoping

`code-simplifier` agent **defaults to recently modified files only**. For a full-codebase pass, **explicitly say so in the prompt** ("扫 apps/web/src 全域") and tell it the LOC ceiling.

Decide upfront what to **exclude**:
- Generated code / vendored shims / .css
- Framework picks (Next, Jotai, etc.) — don't accept "rewrite to RSC" suggestions in this skill
- i18n message resources (typically ~hundreds of files of static data)
- Design system / public API packages with stable contracts

Send code-simplifier with `run_in_background: true` (scans take 5-15 min for 50k+ LOC). Tell it to **write a markdown report to a project-local path** (`tmp-simplify-report.md`) — the agent's transcript is too long to put inline. Make sure `.gitignore` covers `tmp-*` (or add it preemptively).

## Phase 1 — Triage the report

The report comes back as **High / Medium / Low** confidence buckets. Read all of High and skim Medium. Categorize each item by **risk × surface area**:

| Tier | Risk | Surface | Examples |
|------|------|---------|----------|
| **真 bug** | low | tiny | typo, XOR vs exponent, off-by-one, dangling import |
| **速做** | low | 1-2 files | drop dead helper, inline single-call hook, type a `pageParam: any`, switch import source |
| **中等小项** | medium | 1-3 files | fix a `useCallback([])` lock, collapse double-init effect, simplify nested conditions |
| **中等大项** | medium | 4+ files, structural | extract shared component / factory across mirror modules, consolidate write mutations |

Show the user a **table** with counts per tier and let them pick which tiers to do (e.g. "速做 + 必修", "全做 + codex review"). Don't bulk-execute without explicit consent.

## Phase 2 — Real bugs first (one commit)

Apply each `真 bug` fix manually (small enough to not warrant codex). One commit per logical bug — no batching real bugs with refactors.

Commit message: `fix(<scope>): <concise problem statement>` plus a body explaining why the bug existed (root cause, not just the symptom). Future blame readers benefit.

## Phase 3 — Quick wins batch (delegate to codex, single commit)

Hand the full list of 速做 items to `codex:codex-rescue` in **one prompt** with explicit per-item file path + line + intent. Don't say "based on the report do all the quick wins" — copy each item's specifics. Codex sandbox can't read /tmp, so always use project-local paths.

Tell codex:
- Don't commit (you'll commit after review)
- After all items, run `apps/web/node_modules/.bin/tsc --noEmit` (the `pnpm exec` path may fail on sandboxed network) and report any new errors vs baseline
- Report each item as done / partial / skipped with reason

After codex returns:
1. **Run typecheck yourself** — codex's typecheck environment is unreliable
2. `git status --short` to see actual changes; codex sometimes pulls in caller-side changes (e.g. `import` updates after a default→named export switch). Verify each is reasonable.
3. Look for **concat artifacts** — codex occasionally writes `}export const X` or `atom(false)export const Y` because its line-stitching collapsed a blank line. Quick check:
   ```bash
   rg -l "}\)export\b|}export\b|^}export\b|;export const" apps/web/src
   ```
4. Skim diff for unexpected files; if codex went outside the requested scope, ask what each change does before committing.

Single commit: `refactor(cleanup): simplifier quick-wins batch (N items)` with bullet list of each item.

## Phase 4 — Medium batch (delegate to codex, single commit)

Same pattern as Phase 3 but for medium-risk items. Be explicit about behavior-changing items — flag them in the prompt and ask codex to highlight risk in its return message.

Common medium-batch traps:

- **`useCallback([], )` selector lock**: the fix (drop `useCallback`) introduces a new problem if callers pass inline arrows — every render creates a new selectAtom subscription. **Right fix**: add a `deps` parameter to the hook so callers can opt-in to stability:
  ```ts
  export const useViewport = <T>(
    selector: (v: ViewportValue) => T,
    deps: React.DependencyList = [],
  ): T => {
    const selectedAtom = useMemo(() => selectAtom(viewportAtom, selector), deps)
    return useAtomValue(selectedAtom)
  }
  ```
  Inline-pure callers pass nothing; closure-capturing callers pass `[someDep]`.

- **Removing `@ts-ignore`**: ensure the proper generic actually compiles — codex sometimes uses `as` to silence ts where a generic refactor was needed. Spot-check.

- **Provider composer collapse**: `ProviderComposer` makes sense for 5+ providers; for 2-3, JSX nesting is clearer. Don't rip out the central `ProviderComposer` from `providers/root/index.tsx`.

Commit: `refactor(cleanup): simplifier medium-batch (N items)`.

## Phase 5 — Mirror-group refactors (one commit per group)

Mirror groups are the highest-LOC win in any monorepo with parallel domains (Note↔Post, Order↔Quote, etc.). They look like 95%-identical components / hooks / handlers split across two namespaces.

For each mirror group, give codex a focused prompt:

- **Page-level mirror** (`pageExtra.tsx` x2): factor a shared component that takes a prop instead of reading from a domain-specific selector. Don't try to make a generic factory parametrized by selector — types get ugly. Just lift the data dependency to the call site.
- **Mutation factory** (TanStack Query create/update mutations): `createWriteMutationFactory({ apiNamespace, readonlyKeys, toastCreate, toastUpdate })`. Accept that API typing will need a `Record<string, unknown>` cast or generic — don't fight TS into a corner.
- **Socket / event handler factory**: `createUpdateHandler({ getCurrent, setData, sanitize? })`. The `sanitize` optional handles per-domain quirks (e.g. post needs `delete next.category`, note doesn't).
- **Action hook** (Like, Share, Bookmark): `useLikeAction(id, count)`, `useShareAction({ getModel, buildUrl })`. Note vs Post variants are usually 90% identical — extract to a single hook.

**One commit per group** — easier to bisect if a refactor breaks something. Suggested split (Yohaku reference):

| Commit | Group |
|--------|-------|
| `refactor(modules): extract shared MarkdownImageRecordProvider` | page-level component |
| `refactor(socket): unify note/post update handler via factory` | socket handler |
| `refactor(queries): factor create/update mutations for note and post` | mutation factory |
| `refactor(modules): share like/share action hooks across note and post` | action hooks |

Be ready: **net LOC may go up slightly** (factories carry boilerplate), but that's fine — single source of truth is the goal, not LOC golf.

## Phase 6 — Codex review

After all batches commit, dispatch `codex:codex-rescue` to review **the whole range** at once:

```
git log --oneline <first-commit-of-batch>^..HEAD
```

Tell codex:

- Findings-first format (per AGENTS.md), minimal narrative
- Categories: Critical / Major / Minor / OK / Verdict
- Write report to `tmp-review-report.md` (project-local; gitignored via `tmp-*`)
- Focus areas (mirror this list in the prompt):
  1. **Type casts hiding defects** — `as Record<string, unknown>` or `as` after factory extraction
  2. **Default value drift** — anything that quietly changed `??` fallback (e.g. `text ?? ''` vs the prior `text` direct-pass)
  3. **Selector reference stability** — hooks that take callbacks; assert they handle inline-arrow callers
  4. **Sanitize/toast paths in factories** — confirm equivalence with pre-factory code per branch
  5. **Off-by-one / boundary** — particularly any `<` vs `<=` / `> 0` vs truthy
  6. **Lost callers** — codex's quick-wins phase sometimes misses caller files

Codex returns a verdict: **go / fix-then-go / no-go**.

## Phase 7 — Apply review fixes

Single commit: `fix(simplifier): address codex review findings` with bullet per finding (`M1 (review): ...`, `m1 (review): ...`).

Don't open a second review unless the fixes were extensive. The first review is the gate; trust the second-pass author for trivial follow-ups.

## Phase 8 — Open the PR

Branch from current HEAD (don't reset main; let the user handle that post-merge):

```bash
git checkout -b chore/simplifier-cleanup
git push -u origin chore/simplifier-cleanup
gh pr create --base main --head chore/simplifier-cleanup \
  --title "chore: code simplifier batch (N items)" --body "$(cat <<'EOF'
## Summary
- knip-cleanup skill / bug fix / quick wins / medium batch / mirror dedupe / review fixes (one bullet per commit category)

## Test plan
- [x] tsc clean
- [x] codex review fix-then-go → addressed
- [ ] manual smoke: <touched user flows>
EOF
)"
```

PR body should one-line each commit category and call out specific user flows to smoke-test (e.g. "note/post like + share" if those hooks were unified).

## Phase 9 — Cleanup tmp artifacts

After PR opens, remove the analysis reports:

```bash
rm tmp-simplify-report.md tmp-review-report.md
```

`.gitignore` already covers `tmp-*`, no commit needed.

## Critical Rules

1. **Real bugs first, isolated commit**. Never bury a bug fix inside a refactor commit.
2. **One commit per logical group** for mirror-group refactors. Bisecting needs surgical reverts.
3. **Codex sandbox can't write `/tmp`**. Always use `<repo>/tmp-*.md` paths. Add `tmp-*` to `.gitignore` early.
4. **Verify typecheck yourself after every codex pass** — don't trust codex's report alone (its `tsc` environment is unreliable).
5. **Spot-check codex's concat artifacts** with `rg "}\)export\b|}export\b"` etc. before committing.
6. **Net LOC can go up** in mirror-group dedupe; that's expected and not a failure mode.
7. **Don't reset main** to push the batch — branch off, push the branch, open the PR, let main update on merge.
8. **Code-simplifier defaults to recent files only** — explicitly request full-codebase scope when you want it.
9. **Don't accept architecture-rewrite suggestions** from code-simplifier (e.g. "migrate to RSC", "switch from Jotai"). Stay in scope: dedupe, dead removal, type tightening, idiom modernization within the existing stack.

## Yohaku Reference Run

8 commits, ~225 LOC duplication consolidated, 5 new shared modules, 1 real bug:

| Commit | Phase | Content |
|---|---|---|
| `78700559` | 2 | XOR → exponentiation in NoteHideIfSecret |
| `acf61781` | 3 | 14 quick-win simplifications |
| `50133a15` | 4 | 7 medium-risk simplifications |
| `776e7850` | 5 | MarkdownImageRecordProvider extraction |
| `cd49ce29` | 5 | Socket update handler factory |
| `f8d22198` | 5 | Mutation factory for note/post |
| `a0fbac28` | 5 | useLikeAction / useShareAction shared hooks |
| `791bb30d` | 7 | Review-flagged selectAtom stability + share text fallback |

Ratio yardstick: if your scan returns >40% Low-confidence items, the agent's risk calibration is probably miscoded for your codebase — re-prompt with sharper exclusions before triaging.
