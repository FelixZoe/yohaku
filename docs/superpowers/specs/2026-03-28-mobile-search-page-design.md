# Mobile Search Page Design

## Problem

Search is currently presented as a modal overlay on all devices. On mobile, this is suboptimal — a full page provides better UX with proper navigation history (back button), more screen estate, and native-feeling interaction.

## Decision

**Approach B: Independent search page for `/search` route, desktop modal unchanged.**

- `/[locale]/search/` becomes a real search page (not a redirect)
- Mobile entry points navigate to `/search`; desktop entry points still open the modal
- Visiting `/search` directly (any device) stays on the page — no redirect

## Search Page Layout

- **Sticky header**: back button (router.back) + search input, fixed top
- **Results list**: scrollable, same data structure (`SearchListType`) and API (`apiClient.search.searchAll`) as modal
- **URL query param**: `?q=keyword` auto-fills input and triggers search on mount
- **States**: empty (placeholder text), loading (spinner), no results, results list
- Items: title with keyword highlight, snippet with highlight, subtitle (category/type), tap navigates to content

## Entry Point Changes

### Mobile (navigate to `/search`)

| Entry | File | Change |
|---|---|---|
| SearchFAB | `components/modules/shared/SearchFAB.tsx` | `onClick` → `router.push('/search')` |
| SearchMobileActionButton | `components/modules/post/PostListActions.tsx` | `onClick` → navigate to `/search` |
| TimelineSearchButton | `app/[locale]/timeline/page.tsx` | Add mobile check: navigate on mobile, openSearchPanel on desktop |

### Desktop (unchanged)

| Entry | Behavior |
|---|---|
| Cmd+K / Ctrl+K hotkey | Opens modal (no change) |
| SearchAsideActionButton | Opens modal (no change) |

## File Changes

| File | Change |
|---|---|
| `app/[locale]/search/page.tsx` | Server component wrapper for SearchPageClient |
| `app/[locale]/search/SearchPageClient.tsx` | Rewrite: full-page search UI with sticky header, input, results |
| `components/modules/shared/SearchFAB.tsx` | SearchFAB onClick → navigate; `openSearchPanel`/`openSearchPanelWithKeyword` exports unchanged |
| `components/modules/post/PostListActions.tsx` | SearchMobileActionButton → navigate to `/search` |
| `app/[locale]/timeline/page.tsx` | TimelineSearchButton: mobile → navigate, desktop → modal |

## Non-Goals

- No change to desktop modal UI or behavior
- No shared/extracted component between modal and page (intentionally independent)
- No change to Google JSON-LD search action (already points to `/search?q=`)
