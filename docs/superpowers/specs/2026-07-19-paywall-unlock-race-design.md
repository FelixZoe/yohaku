# Paywall auto-unlock race fix — design

## Problem

After a successful checkout, the user returns to the article page with
`?membership=success`. `MembershipReturnWatcher` polls membership status,
and once active it invalidates queries and calls `router.replace(pathname)`
to strip the query param. That `router.replace` is an RSC navigation: the
server re-renders the page, but the server-side API fetch
(`lib/fetch/fetch.server.ts`) forwards no cookies, so the fresh payload is
the anonymous **locked** version. `ModelDataProvider` (jojoo) syncs its atom
on every `data` prop change, so the locked payload overwrites whatever the
client-side unlocker had fetched. `MembershipContentUnlocker` has a
one-shot `doneRef`, so it never re-fetches — the content stays locked until
a full manual reload.

## Fix (approach A — two small changes)

### 1. `MembershipReturnWatcher.tsx`

Replace `router.replace(pathname)` with
`window.history.replaceState(null, '', pathname)`. This strips the
`membership=success` query without triggering an RSC navigation, removing
the source of the locked-payload overwrite. `useRouter`/`usePathname`
usages that become unused are removed.

### 2. `MembershipContentUnlocker.tsx`

Drop the one-shot `doneRef` semantics. New behavior: whenever
`locked && isMember` holds (and category/slug are known), fetch the post
with `staleTime: 0` and push it into the provider. Keep only an in-flight
guard so concurrent effect runs don't stack requests; on failure the guard
resets so a later render retries. This makes the unlocker self-healing
against any future overwrite source (revalidation, bfcache restore, etc.):
if locked data ever lands in the provider while the user is a member, it
re-unlocks.

## Out of scope

- Forwarding cookies in the server fetch (would make paywalled pages
  per-user dynamic; caching implications too broad for this fix).
- The no-op `invalidateQueries(['post', ...])` in `finish()` stays or goes
  per implementation convenience; it has no observers either way.

## Verification

- Type-check the two changed files.
- Manual flow: locked article → checkout → return with
  `?membership=success` → toast "unlocked" → paid nodes appear without a
  manual reload, and the URL query is stripped.
