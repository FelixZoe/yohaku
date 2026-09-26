# Notes I18n And Terminology Cleanup Design

## Goal

Extract remaining user-visible hardcoded strings from the notes route and its directly rendered UI, align terminology with existing locale messages, and leave a terminology document that can be reused for later project-wide cleanup.

## Scope

- `apps/web/src/app/[locale]/notes/**`
- Notes-specific UI under `apps/web/src/components/modules/note/**`
- Shared UI directly rendered by notes pages when it contains user-visible strings:
  - `apps/web/src/components/modules/shared/NothingFound.tsx`
  - `apps/web/src/components/modules/shared/SummarySwitcher.tsx`
  - `apps/web/src/components/modules/shared/GoToAdminEditingButton.tsx`
  - `apps/web/src/components/modules/translation/TranslationLanguageSwitcher.tsx`

## Terminology Policy

- Use existing stable terms in `messages/*/common.json` as the canonical source when possible.
- Canonical mappings for this cleanup:
  - `手记` / `Notes` / `手記`
  - `专栏` / `Series` / `コラム`
  - `文章` / `Article` or `Post` / `記事`
- Prefer correcting displayed copy before renaming existing keys.
- If an existing key name is misleading enough to keep causing future misuse, add a clearer key and migrate the current call sites.

## Implementation Plan

1. Audit notes route and directly rendered components for user-visible hardcoded strings.
2. Reuse existing message keys where the meaning already matches.
3. Add missing keys to the narrowest suitable namespace.
4. Normalize notes-related copy that still refers to articles when the subject is a note.
5. Add a terminology document with recommended terms and historical aliases to avoid.

## Verification

- Search notes-related source files for remaining hardcoded visible strings.
- Run a targeted test or lint/typecheck command if available without widening scope unnecessarily.
- Summarize keys added, terminology changes made, and residual gaps.
