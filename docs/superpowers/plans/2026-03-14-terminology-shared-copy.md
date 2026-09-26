# Shared Terminology Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize shared public-facing terminology outside the notes module so global copy uses one consistent mapping across locales.

**Architecture:** Treat shared locale files as the canonical source of terms, then update direct consumers that still hardcode conflicting labels. Keep changes incremental: public/shared copy first, then page-specific follow-up passes can inherit the new baseline.

**Tech Stack:** Next.js, React, next-intl, TypeScript, ripgrep

---

## Chunk 1: Shared Message Baseline

### Task 1: Audit shared terminology usage

**Files:**
- Modify: `docs/i18n/terminology.md`
- Inspect: `apps/web/src/messages/{zh,en,ja}/common.json`
- Inspect: `apps/web/src/messages/{zh,en,ja}/{translation,subscribe,activity,gateway}.json`

- [ ] **Step 1: Re-read the terminology document and target message files**

Run: `rg -n '文稿|文章|手记|专栏|Posts|Article|Notes|Series|記事|手記|コラム' apps/web/src/messages -g '*.json'`
Expected: Find current cross-locale terminology drift.

- [ ] **Step 2: Define canonical wording per key group**

Document which keys describe sections (`posts`, `notes`, `topics`) versus content items (`article`, `note`).

- [ ] **Step 3: Update shared locale values**

Adjust only the displayed values in shared message files so section names use canonical section terms and item names use canonical item terms.

- [ ] **Step 4: Re-scan shared messages**

Run: `rg -n 'Article List|View all articles|文章列表|すべての記事を見る' apps/web/src/messages -g '*.json'`
Expected: Remaining matches are either intentional item-level copy or known follow-up cases.

## Chunk 2: Direct Public Consumers

### Task 2: Remove hardcoded conflicting labels in direct consumers

**Files:**
- Modify: `apps/web/src/components/layout/header/config.ts`
- Modify: `apps/web/src/app/[locale]/(note-topic)/notes/series/page.tsx`
- Modify: `apps/web/src/app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/layout.tsx`
- Modify: other directly user-visible files found in the scan

- [ ] **Step 1: Identify direct consumers that still hardcode section labels**

Run: `rg -n '专栏|文稿|手记' apps/web/src/app apps/web/src/components -g '*.tsx' -g '*.ts'`
Expected: Small list of user-visible hardcoded labels.

- [ ] **Step 2: Replace hardcoded labels with message keys**

Prefer existing `common` or feature namespaces. Add new keys only if a concept does not fit an existing namespace.

- [ ] **Step 3: Verify labels now resolve through i18n**

Run: `rg -n '>[[:space:]]*(专栏|文稿|手记)[[:space:]]*<' apps/web/src/app apps/web/src/components -g '*.tsx'`
Expected: No remaining direct visible hardcoded labels in the targeted public layer.

## Chunk 3: Verification

### Task 3: Validate the public shared-copy pass

**Files:**
- Verify: targeted files from chunks 1-2

- [ ] **Step 1: Run targeted terminology scans**

Run: `rg -n 'Article List|View all articles|Recent Notes|文章列表|専欄|コラム|手記|文稿' apps/web/src/messages apps/web/src/app apps/web/src/components -g '*.json' -g '*.tsx' -g '*.ts'`
Expected: Remaining matches should align with canonical usage or be deferred to later batches.

- [ ] **Step 2: Run TypeScript validation**

Run: `pnpm -C apps/web exec tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 3: Summarize residual follow-up**

List any remaining terminology drift in page-specific or dashboard-only code for the next batch.
