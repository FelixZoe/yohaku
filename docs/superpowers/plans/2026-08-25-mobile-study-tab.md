# Mobile Study Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Tab 4 into a study root (owner subject) and a nested reader page (guest drawer), and point the tab glyph at the owner.

**Architecture:** Pure visibility/href helpers first. `(me)` becomes `(study)` with `index` + `reader`. Lists, login, desk, locale stay on the root stack. Tab chrome reads `useOwner()`, not `session.image`.

**Tech Stack:** Expo Router NativeTabs / js-tabs, existing Me screen primitives, Vitest, next-intl-style mobile catalogs.

**Spec:** `docs/superpowers/specs/2026-08-25-mobile-study-tab-design.md`

## Global Constraints

- iOS only (`apps/mobile/AGENTS.md`); Expo SDK 57; never `npx expo`
- Zero comments / JSDoc unless a hidden constraint
- Lint/typecheck only files you touch
- i18n: every new key in `en, ja, ko, zh, zh-TW`
- 「书房」never appears in UI or VoiceOver
- Tab icon is always owner avatar; session face never on the tab
- Do not commit unrelated parent WIP (pnpm lock, yohaku-oss, other specs)

## File map

| File | Responsibility |
| --- | --- |
| `apps/mobile/src/screens/study/guest-card.ts` | Card kind, href, reader-hero visibility, tab label |
| `apps/mobile/src/screens/study/guest-card.test.ts` | Spec table tests |
| `apps/mobile/src/i18n/messages/{zh,zh-TW,en,ja,ko}.ts` | `study` namespace |
| `apps/mobile/src/screens/study/study-screen.tsx` | Portrait study |
| `apps/mobile/src/screens/study/reader-screen.tsx` | Reader page (moved from MeScreen) |
| `apps/mobile/src/screens/study/desk-card.tsx` | Live desk paper card |
| `apps/mobile/src/screens/study/guest-card.tsx` | Door UI |
| `apps/mobile/src/app/(tabs)/(study)/` | Routes; delete `(me)/` |
| `apps/mobile/src/app/(tabs)/_layout.tsx` | Owner avatar + `(study)` |
| `apps/mobile/src/components/navigation/paper-tab-bar.tsx` | `(study)` icon + long press |
| `apps/mobile/src/screens/me/me-screen.tsx` | Delete after split |

---

### Task 1: Guest card + tab label helpers

**Files:**
- Create: `apps/mobile/src/screens/study/guest-card.ts`
- Test: `apps/mobile/src/screens/study/guest-card.test.ts`

**Interfaces:**
- Consumes: `SessionUser` from `@/auth/session-store`
- Produces:
  - `export type GuestCardKind = 'signedOut' | 'reader' | 'owner'`
  - `export function guestCardKind(session: SessionUser | null): GuestCardKind`
  - `export function guestCardHref(kind: GuestCardKind): '/login' | '/reader'`
  - `export function showReaderHero(session: SessionUser | null): boolean`
  - `export function tabAccessibilityLabel(owner: { name: string; siteHost: string } | null, fallback: string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import type { SessionUser } from '@/auth/session-store'

import {
  guestCardHref,
  guestCardKind,
  showReaderHero,
  tabAccessibilityLabel,
} from './guest-card'

const reader: SessionUser = {
  id: '1',
  name: '阿崔',
  email: null,
  image: 'https://example.com/r.png',
  handle: 'cuix',
  role: 'reader',
  provider: 'github',
}

const owner: SessionUser = { ...reader, role: 'owner', name: 'Innei' }

describe('guest card', () => {
  it('routes signed-out to login and others to reader', () => {
    expect(guestCardKind(null)).toBe('signedOut')
    expect(guestCardHref('signedOut')).toBe('/login')
    expect(guestCardKind(reader)).toBe('reader')
    expect(guestCardHref('reader')).toBe('/reader')
    expect(guestCardKind(owner)).toBe('owner')
    expect(guestCardHref('owner')).toBe('/reader')
  })

  it('hides the reader portrait for the owner', () => {
    expect(showReaderHero(null)).toBe(true)
    expect(showReaderHero(reader)).toBe(true)
    expect(showReaderHero(owner)).toBe(false)
  })
})

describe('tabAccessibilityLabel', () => {
  it('prefers owner name, then host, then fallback', () => {
    expect(tabAccessibilityLabel({ name: 'Innei', siteHost: 'innei.in' }, '余白')).toBe('Innei')
    expect(tabAccessibilityLabel({ name: '', siteHost: 'innei.in' }, '余白')).toBe('innei.in')
    expect(tabAccessibilityLabel(null, '余白')).toBe('余白')
  })
})
```

- [ ] **Step 2:** `cd apps/mobile && pnpm exec vitest run src/screens/study/guest-card.test.ts` — FAIL (module missing)

- [ ] **Step 3: Implement**

```ts
import type { SessionUser } from '@/auth/session-store'

export type GuestCardKind = 'signedOut' | 'reader' | 'owner'

export function guestCardKind(session: SessionUser | null): GuestCardKind {
  if (!session) return 'signedOut'
  if (session.role === 'owner') return 'owner'
  return 'reader'
}

export function guestCardHref(kind: GuestCardKind): '/login' | '/reader' {
  return kind === 'signedOut' ? '/login' : '/reader'
}

export function showReaderHero(session: SessionUser | null): boolean {
  return session?.role !== 'owner'
}

export function tabAccessibilityLabel(
  owner: { name: string; siteHost: string } | null,
  fallback: string,
): string {
  const name = owner?.name.trim() ?? ''
  if (name) return name
  const host = owner?.siteHost.trim() ?? ''
  if (host) return host
  return fallback
}
```

- [ ] **Step 4:** re-run vitest — PASS

- [ ] **Step 5:** Do not commit unless the user asks

---

### Task 2: i18n `study` namespace

**Files:** Modify all five `apps/mobile/src/i18n/messages/{zh,zh-TW,en,ja,ko}.ts`

Add after `me`:

```ts
study: {
  me: '我',
  account: '账号',
  tabFallback: '余白',
},
```

English: Me / Account / Yohaku  
zh-TW: 我 / 帳號 / 余白  
ja: 自分 / アカウント / 余白  
ko: 나 / 계정 / 여백  

Leave `tabs.me` in catalogs; stop using it for the fourth tab.

- [ ] Add zh first, run `pnpm exec vitest run src/i18n/messages.test.ts` — FAIL other locales
- [ ] Fill the other four
- [ ] Re-run — PASS

---

### Task 3: Study + reader screens and routes

**Files:**
- Create: `screens/study/study-screen.tsx`, `desk-card.tsx`, `guest-card-view.tsx`, `reader-screen.tsx`
- Create: `app/(tabs)/(study)/_layout.tsx`, `index.tsx`, `reader.tsx`
- Delete: `app/(tabs)/(me)/`, `screens/me/me-screen.tsx`
- Move ambience import to study; keep membership / activity-stats / login on reader

**Study stack (top → bottom):** owner hero (serif name + `displaySite(siteHost)`), `DeskCard` (hide when `!snapshot.visible`), `MembershipBanner`, blog `GroupedList` row if `owner.webUrl`, `GuestCardView`, ambience wash/grain.

**GuestCardView:** `kind === 'owner'` → label `t('account')`, no second avatar. Else placeholder or `session.image` + `t('me')` + reader name. `onPress` → `router.push(guestCardHref(kind))`.

**Reader:** copy MeScreen minus DeskLine, MembershipBanner, blog row, ambience. If `showReaderHero(session)` render existing ProfileHero (drop owner stamp — owner never sees this hero). Else `AppText` `largeTitleSans` `study.account`. Then ActivityStats, general, push, account, `__DEV__` gallery.

**Routes:** `(study)/_layout.tsx` same Stack options as current me layout. `index` → StudyScreen. `reader` → ReaderScreen + `headerBackVisible: true`.

- [ ] Implement
- [ ] `cd apps/mobile && pnpm exec eslint` on touched screens/routes
- [ ] `pnpm exec vitest run src/screens/study/guest-card.test.ts src/i18n/messages.test.ts`

---

### Task 4: Tab chrome

**Files:**
- Modify: `app/(tabs)/_layout.tsx` — `useOwner()`, `tabAvatar(owner?.avatarUrl)`, `name="(study)"`, `accessibilityLabel={tabAccessibilityLabel(owner, tStudy('tabFallback'))}`
- Modify: `paper-tab-bar.tsx` — treat `(study)` like today’s `(me)`

- [ ] Implement
- [ ] eslint touched files

## Self-review vs spec

| Spec | Task |
| --- | --- |
| Guest card href table | 1, 3 |
| Owner skips reader hero | 1, 3 |
| Tab label = owner name | 1, 4 |
| Tab icon = owner avatar | 4 |
| `(study)/index` + `reader` | 3 |
| Login then stay on study | 3 (push `/login` only) |
| Desk card / membership / blog on study | 3 |
| Activity + settings on reader | 3 |
| No 「书房」in UI | 2, 3 |
| 08-15 activity/compliance unchanged | honored |
