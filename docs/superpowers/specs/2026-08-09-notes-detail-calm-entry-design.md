# Notes Detail Page — Calm Entry Redesign

## Problem

The notes detail page (`/notes/[...]`) presents readers with excessive visual clutter. The current layout stacks **7 distinct bands above the article content** (cover, title, topic tag, a 3-row MetaBar with ~9 data points, banner caption, AI synopsis) and surrounds the text with **3 peripheral columns** (left sidebar, right TOC, right action rail). The result is a reading experience where the article — the actual content the reader came for — is buried beneath metadata and competing UI elements.

## Goal

Reduce visual noise so that the article is the hero. Apply **progressive disclosure**: essential context appears immediately, secondary information recedes to the periphery, and detail emerges on demand through scroll or interaction.

## Design Approach: Calm Entry / Progressive Disclosure

Every element on the page is assigned to one of three visibility tiers:

| Tier | Meaning | Placement |
|------|---------|-----------|
| **Tier 1 — Core (always visible)** | What the reader needs immediately | Title, date, article body |
| **Tier 2 — Receded (visible but quiet)** | Peripheral awareness, doesn't compete | Topic tag, TOC, reading stats |
| **Tier 3 — On-demand (appears on interaction)** | Useful but not needed upfront | Weather/mood, AI synopsis, actions, CC license, AI badge, translation switcher |

The principle: **Tier 1 defines the first impression.** Tier 2 sits at the visual edges (sides/bottom). Tier 3 is hidden until the reader chooses to engage — via scroll, hover/tooltip, or click-to-expand.

## Staged Disclosure

### Stage 1 — Entry (page load, above the fold)

```
[========= HEAD COVER (full-width, kept) =========]

日常 · 2026年8月9日  ↻ Translated from EN   ← eyebrow (topic + date + translation notice)
Note Title                             ← hero title
▸ AI 摘要                               ← collapsed synopsis chip (on-demand)
────────────────────────                ← subtle separator
Article body begins here...             ← content starts immediately
```

The pre-content stack drops from **7 bands to 1 compact header zone**. The reader reaches the article ~60% faster vertically.

### Stage 2 — Scroll (reader enters the body)

- **TOC** appears in the right rail (only for long articles; already peripheral)
- **Synopsis** stays collapsed — a small "AI 摘要" chip that expands on click (reuses existing Yohaku chip pattern, relocated from above-content to subtitle line)
- **Left sidebar** (timeline + topic info) **fades in** — hidden during first view, appears as the reader scrolls past the header. Navigation context without first-impression distraction.
- **Actions** (like/share/subscribe/donate) remain in the right rail (desktop) / bottom bar (mobile) — already responsive, not duplicated

### Stage 3 — Engagement (reader scrolls to article end)

- **Signature** → **footer meta line** → **comments** — grouped into fewer zones
- **Stats** (reads/likes/realtime) visible at the bottom, understated — not in the header
- **CC license, AI-gen badge, translation switcher** — relocated to a footer tooltip row

## Element-by-Element Decisions

| # | Element | Current | New Design | Rationale |
|---|---------|---------|------------|-----------|
| ① | Head cover | Full-width banner | **Keep as-is** | User decision |
| ② | Title (`NoteTitle`) | Standalone | **Tier 1 — hero** | Core reading context |
| ③ | Topic inline tag (`NoteTopicInlineTag`) | Separate row below title | **Merge into eyebrow** `topic · date` | Eliminates a row |
| ④a | Date | MetaBar UpperRow col 1 | **Eyebrow** (merged with topic) | Tier 1 context |
| ④b | Weather/mood | MetaBar UpperRow col 2 | **Date tooltip** (Tier 3) | Personality, not essential |
| ④c | Stats (reads/likes/realtime) | MetaBar UpperRow col 3 | **Article footer**, understated (Tier 2) | After content, not before |
| ④d | Translation notice | MetaBar standalone row | **Eyebrow** (clickable "translated from X" link) | Important contextual info; already a link to source lang |
| ④e | Language switcher dropdown / AI badge / CC license | MetaBar LowerRow | **Footer tooltip row** (Tier 3) | Secondary metadata; full multi-lang dropdown not needed in header |
| ⑤ | Private caption | Conditional | **Keep** (conditional, rare) | Only when relevant |
| ⑥ | Banner caption (`NoteBannerCaption`) | Conditional | **Keep** (conditional) | Author-set editorial content |
| ⑦ | Synopsis (`NoteSynopsis`) | Above content, expanded block | **Collapsed chip in subtitle line** | Reuses Yohaku chip; doesn't block first screen |
| ⑧ | Article body | — | **Tier 1 — hero** | |
| ⑨ | TOC aside (`NoteTocAside`) | Always visible (desktop) | **Keep** (Tier 2) | Already peripheral |
| ⑩ | Action rail (`NoteActionAsideEmbedded`) | Always visible (xl) | **Keep** | Responsive, not duplicated |
| ⑪ | Left sidebar (`NoteLeftSidebar`) | Always visible (xl) | **Hide on first view, fade in on scroll** | Navigation shouldn't distract initial reading |
| ⑫ | Binder clip (`NoteTopicBinderClip`) | Decorative | **Keep** | Subtle, part of paper aesthetic |
| ⑬ | Signature | Below content | **Keep** | Understated |
| ⑭ | Bottom bar actions (`NoteBottomBarAction`) | Mobile only | **Keep** | Responsive counterpart of ⑩ |
| ⑮ | Bottom topic (`NoteBottomTopic`) | Always visible | **Remove** | Duplicate of topic in eyebrow |
| ⑯ | Footer navigation (`NoteFooterNavigationMobile`) | Mobile | **Keep** | |
| ⑰ | Comments (`CommentAreaRootLazy`) | Below content | **Keep** | |
| ⑱ | TOC FAB (`TocFAB`) | Floating (mobile) | **Keep** | |
| ⑲ | Font adjuster (`NoteFontAdjuster`) | Floating | **Keep** | |
| — | `NoteHeaderDate` / `NoteDateMeta` | Dead code in `pageExtra.tsx` | **Delete** | Never imported anywhere |

## Spatial Layout Changes

### Header Zone Consolidation

Currently 4 separate stacked bands (title / topic tag / 3-row MetaBar / synopsis) → **1 compact zone**: eyebrow (topic · date · translation notice) + hero title + collapsed synopsis chip.

### Left Sidebar Delayed Appearance

The left sidebar (`NoteLeftSidebar`, containing `NoteTimeline` + `NoteTopicInfo`) is currently always visible on `xl` screens. In the new design, it is **hidden during the first view** and **fades in as the reader scrolls past the header into the article body**. This means the first impression is cover + header + content — no left-column distraction.

Implementation approach: the sidebar already uses the `yohaku-fadeable` class for entrance animation. The change adds scroll-based visibility (e.g., an `IntersectionObserver` or scroll-position check that reveals the sidebar once the header zone has scrolled past the viewport top).

### Footer Meta Line

Stats + CC license + AI-gen badge + translation switcher move out of the dense MetaBar into **a single understated footer line** below the article, alongside the Signature. They transition from header noise to footer context.

## Component-Level Impact

### Files Modified

| File | Change |
|------|--------|
| `NoteDetailClient.tsx` → `PageInner` | Restructure header zone: merge topic + date into eyebrow; move synopsis to collapsed chip; remove `NoteBottomTopic` from render |
| `NoteMetaBar.tsx` | Dismantle the 3-row bar: date → eyebrow (consumed by header), weather/mood → date tooltip, stats → footer, LowerRow (AI/CC/lang) → footer tooltip. The component may be split or significantly reduced. |
| `NoteLeftSidebar.tsx` | Add scroll-based delayed visibility (fade in after header scrolls past) |
| `NoteSynopsis.tsx` | Relocate from above-content block to collapsed chip in subtitle area (may just be a placement change in `PageInner`) |
| `pageExtra.tsx` | Delete dead code: `NoteHeaderDate`, `NoteDateMeta` |

### Files Not Modified

- `NoteActionAside.tsx` — action rail and bottom bar stay (responsive, not duplicated)
- `NoteHeadCover.tsx` — cover stays as-is
- `NoteTocAside`, `TocFAB`, `NoteFontAdjuster` — stay
- `NoteBannerCaption`, `NotePrivateCaption` — stay (conditional)
- Routing layer (`detail-page.tsx`, `[...path]/page.tsx`, `layout.tsx`) — no structural changes to routing

### New Components (if needed)

- **NoteEyebrowMeta** — the slim `topic · date · lang` line above the title. May be a new small component or composed inline in `PageInner`.
- **NoteFooterMeta** — the understated stats/CC/AI/lang line below the article. Consolidates what was MetaBar's LowerRow + UpperRow stats.

## Out of Scope

- **Code structure refactoring** of `NoteDetailClient.tsx` provider nesting (file organization, dead `api.tsx`→`.ts` rename, routing dedup). This spec is purely about the reader-facing visual experience. Code cleanup can be a separate effort.
- **Cover image changes** — kept as full-width per user decision.
- **List page** (`/notes`) and **topic/series pages** — not part of this redesign.
- **Mobile-specific layout redesign** beyond what the responsive components already handle.

## Success Criteria

1. Pre-content vertical space reduced by ~60% (7 bands → 1 compact header)
2. No element appears above the content that isn't Tier 1 (title, date, topic) or conditionally rendered (banner, private caption)
3. Left sidebar is invisible on first page load (desktop), appears on scroll
4. MetaBar as a dense 3-row block no longer exists — its contents distributed across eyebrow, tooltips, and footer
5. No redundant elements (bottom topic removed, dead code deleted)
6. All existing features remain accessible (weather/mood via tooltip, stats in footer, synopsis via chip, actions in rail/bar)
