# Presence cluster labels — anonymous readers & “及其他”

**Date:** 2026-04-06  
**Scope:** `apps/web/src/components/modules/activity/Presence.tsx` (expanded hover labels only; timeline dots/avatars unchanged)  
**Locales:** `en` / `zh` / `ja` (`apps/web/src/messages/*/activity.json`)

## Problem

1. **Redundant copy** — For visitors without `reader.name` or `presence.displayName`, `PersonName` falls back to `presence_reader` (“Reader” / “读者”) per identity. Clusters list up to two entries, so multiple anonymous users read as **Reader, Reader, …**.
2. **Concatenation bug** — In English, `presence_and_more` is `and {count} more` with **no** leading separator; it is appended immediately after the last name, producing **Readerand** when the prior token is “Reader”.
3. **Count semantics** — `ClusterNames` passes `identities.length` into `presence_and_more` while `extra` in code is `identities.length - MAX_SHOWN`. For English “and *N* more”, *N* should be the **number of people not listed in the first two slots**, not necessarily the total headcount (see algorithm below). Each locale’s string must match the numeric meaning of `{count}`.

## Definitions

- **Current user** (identity === `sessionId`): display via existing `presence_you` / `presence_me` on the avatar path; label text uses `**presence_you`** where a person label is needed.
- **Named** — `reader?.name` **or** `presence.displayName` after trim is non-empty.
- **Anonymous** — not current and not named (same inputs as today’s fallback to `presence_reader`).

## Behaviour by case

### A. Cluster is **all anonymous** and **does not include the current session**

- **Single identity:** Keep the current short fallback `**presence_reader`** beside `%` (existing single-line look).
- **Two or more identities:** Do **not** list per-person “Reader…” tokens. Show one **aggregate** phrase with correct plural rules, e.g. English “5 readers”, Chinese “5 位读者”, Japanese natural equivalent. Reuse or add dedicated message keys; use `next-intl` plural forms where needed for English/Japanese.

### B. Cluster **includes the current user** and **every other identity is anonymous**

- Show `**presence_you`** once when building the up-to-two explicit names.
- **Do not** insert `presence_reader` for each anonymous peer.
- Suffix: **及（其余）N 人** style (choice **甲**): total **N** = number of **other** identities (all anonymous). Product copy examples:  
  - `zh`: `你及其他 3 人`  
  - `en`: `You and 3 others` (comma rules per locale; must include a separator before the suffix when following other names — see “Formatting”).  
  - `ja`: natural “あなた ほか 3 人” / equivalent consistent with existing tone.

If **only** the current user is in the cluster, no change: still **你** (or aggregate not needed).

### C. **Mixed** — at least one identity is **named** (possibly alongside anonymous and/or current)

Use cluster `identities` order (unchanged: current first when `hasCurrent`, per `buildCluster`).

1. `**qualifyingIdentities`** — filter `identities` preserving order: identity is **current** **or** **named** (anonymous omitted).
2. `**shownIdentities`** — `qualifyingIdentities.slice(0, 2)`.
3. `**shownLabels**` — map each id in `shownIdentities` to: `presence_you` if current, else `reader.name` or trimmed `displayName`.
4. Join `**shownLabels**` with `presence_list_sep`.
5. `**extra` = `identities.length - shownIdentities.length**` (every identity not in the first two *qualifying* slots is counted as “其他”; anonymous identities sandwiched between named ones are included in `extra`).
6. If `**extra > 0*`*, append suffix **甲**: generic “及其他 N 人” / “and N others” / JP equivalent, with `{count} = extra`. Insert an explicit **separator** before the suffix when `shownLabels` is non-empty (see Formatting).
7. If `**extra === 0`**, no suffix.

Examples: `[Alice, anon, Bob]` → `shownIdentities = [Alice, Bob]`, `extra = 1`. `[You, anon, anon, anon]` → `shownIdentities = [You]`, `extra = 3`.

### D. **All anonymous including current user, count ≥ 2**

- Use **case B** pattern (`你及其他 N 人`), not the aggregate “N readers”, so we do not show “Reader” repeatedly.

## Formatting / i18n

- **Separator before suffix:** Whenever `shownLabels` is non-empty and `extra > 0`, insert a locale-appropriate gap: e.g. English `", "` before `and N others`, or embed the comma in the message key. Eliminate **Readerand**-class bugs.
- **Refactor message keys** if needed:  
  - Replace or narrow use of `presence_and_more` so `{count}` always means `**extra`** as defined above.  
  - Add keys for aggregate anonymous (`presence_anonymous_readers` or ICU plural).  
  - Add keys for **甲** suffix (`presence_and_others` with `{count}` = extra) for `en` / `zh` / `ja`.
- **Self-review:** No leftover `TBD`; English/Japanese plurals verified; Chinese **位** and **人** consistent.

## Out of scope

- Changing clustering, socket payloads, or avatar stack (+N badge).  
- Mobile (presence hidden on mobile already).

## Testing notes

- Snapshot or manual: English cluster of 3 anonymous (no current) → no “Reader, Reader”; single anonymous → still “Reader”; mixed Alice + 2 anonymous + You with various orderings; verify no missing space before “and”; verify `extra` matches “others” semantics per locale.

## Acceptance

- No repeated `presence_reader` in multi-user anonymous clusters.  
- No `Readerand`-style glue words.  
- **甲** for mixed and current+anonymous: “及其他 N 人” semantics with **N** = unlisted headcount.  
- Locales coherent for `{count}` in every new/changed string.

