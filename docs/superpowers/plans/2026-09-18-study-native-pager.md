# Study Native Pager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, with checkpoints). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the RN horizontal Study pager with native `YohakuPager` so page 1 is viewport-height, and give page 2 the same Dynamic Island avatar as page 1 without two compositors fighting.

**Architecture:** `YohakuPager` is an ExpoView wrapping a paging `UIScrollView` whose `contentSize.height` equals `bounds.height`. Each RN child fills one page. `SettingsAvatar` gains `active`; only the selected page mounts the window compositor. JS helpers resolve the account avatar URI.

**Tech Stack:** Expo Modules (Fabric), UIKit `UIScrollView`, React Native, vitest. Work in `yohaku-oss`. No new npm packages.

**Spec:** `docs/superpowers/specs/2026-09-17-study-pager-native-design.md`

---

### Task 1: Account avatar URI helper

**Files:**
- Modify: `yohaku-oss/apps/mobile/src/screens/study/guest-card.ts`
- Modify: `yohaku-oss/apps/mobile/src/screens/study/guest-card.test.ts`

- [ ] **Step 1:** Add failing tests for `accountAvatarUri` in `guest-card.test.ts`. Keep `tabAccessibilityLabel` tests. Remove the `showReaderHero` suite (function stays until Task 4 so `reader-screen` still compiles).

- [ ] **Step 2:** Implement `accountAvatarUri(session, owner)` → `session?.image` then `owner?.avatarUrl` then `null`.

- [ ] **Step 3:** Run `pnpm --filter @yohaku/mobile test src/screens/study/guest-card.test.ts`. Expect pass.

- [ ] **Step 4:** Commit in `yohaku-oss`: `feat(mobile): resolve account avatar from session then owner`

**Checkpoint:** stop for review.

---

### Task 2: SettingsAvatar `active`

**Files:**
- Modify: `yohaku-oss/apps/mobile/modules/yohaku/index.ts` (`SettingsAvatarProps.active?: boolean`)
- Modify: `yohaku-oss/apps/mobile/modules/yohaku/ios/YohakuModule.swift` (Prop `active`)
- Modify: `yohaku-oss/apps/mobile/modules/yohaku/ios/Settings/SettingsAvatarView.swift`

- [ ] **Step 1:** Add `active` prop, default `true`.
- [ ] **Step 2:** `active == false` → `detachCompositor()`, no island covers, avatar stays in-slot.
- [ ] **Step 3:** `active == true` → attach compositor and `updateForCurrentScrollPosition()`.
- [ ] **Step 4:** `attachToAncestorScrollView` skips `isPagingEnabled` ancestors; uses nearest non-paging `UIScrollView`.
- [ ] **Step 5:** Commit: `feat(mobile): gate SettingsAvatar island compositor with active`

**Checkpoint:** stop for review.

---

### Task 3: Native YohakuPager

**Files:**
- Create: `yohaku-oss/apps/mobile/modules/yohaku/ios/Pager/YohakuPagerView.swift`
- Modify: `yohaku-oss/apps/mobile/modules/yohaku/ios/YohakuModule.swift`
- Modify: `yohaku-oss/apps/mobile/modules/yohaku/index.ts`

- [ ] **Step 1:** `YohakuPagerView`: paging `UIScrollView`, `bounces = false`, no horizontal indicator.
- [ ] **Step 2:** `mountChildComponentView` / `unmountChildComponentView` put children in the scroll view. `layoutSubviews` sets each child frame to `(i * width, 0, width, height)` and `contentSize = (n * width, height)` — height is `bounds.height`.
- [ ] **Step 3:** Events `onPageScroll` (`progress = offset.x / width`, clamped `0...n-1`) and `onPageSelected` (`page` on settle). Prop `page` is controlled (`setContentOffset`).
- [ ] **Step 4:** Width 0 → skip layout. Out-of-range `page` → clamp.
- [ ] **Step 5:** Export `YohakuPager` from `@modules/yohaku`.
- [ ] **Step 6:** Commit: `feat(mobile): add native YohakuPager with locked page height`

**Checkpoint:** stop for review.

---

### Task 4: Wire Study + Reader screens

**Files:**
- Modify: `yohaku-oss/apps/mobile/src/screens/study/study-screen.tsx`
- Modify: `yohaku-oss/apps/mobile/src/screens/study/reader-screen.tsx`
- Modify: `yohaku-oss/apps/mobile/src/screens/study/guest-card.ts` (delete `showReaderHero`)
- Modify: `yohaku-oss/apps/mobile/src/screens/study/guest-card.test.ts` if any leftover import

- [ ] **Step 1:** `StudyScreen` uses `YohakuPager` instead of horizontal `Animated.ScrollView`. Pages `flex: 1`. Keep `PageIndicator` + `accessibilityElementsHidden`.
- [ ] **Step 2:** Pass `active={activePage === 0}` into owner `SettingsAvatar`; `active={activePage === 1}` into reader avatar.
- [ ] **Step 3:** Always render `ProfileHero`. Avatar URI from `accountAvatarUri`. Drop the `largeTitleSans`「账户」owner fallback.
- [ ] **Step 4:** Delete `showReaderHero`.
- [ ] **Step 5:** Run `pnpm --filter @yohaku/mobile test src/screens/study/guest-card.test.ts` and lint the touched TS files.
- [ ] **Step 6:** Commit: `feat(mobile): page Study with native pager and dual island avatars`

**Checkpoint:** stop for review. Device verify first page is not stretched, both pages collapse into the island, only the current page owns the island.
