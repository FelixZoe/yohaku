# Module Composition

> Authoritative for `apps/web/src/components/modules/`. Modules are compositions of `ui/` primitives + domain data. Generic primitives belong in `ui/`.

## Module map

```
modules/
├── post/         post list, cards, meta bar, sort, pagination, copyright, pin, outdate
├── note/         note timeline, sidebar, main container, font adjuster, banner
├── page/         page title, paginator, equipment view
├── comment/      comment area, thread, form, reactions
├── home/         hero, second screen, timeline, windsock
├── thinking/     post box, item, infinite scroll
├── dashboard/    dashboard-specific primitives
├── category/     archive view
├── activity/     presence, room provider
├── translation/  translation notice card
├── say/          guestbook items
├── subscribe/    RSS / newsletter
├── toc/          heading strategy, FAB, aside
├── timeline/     unified post+note timeline
├── ai/           AI-powered modules
├── peek/         hover preview
├── yohaku/       layout state (paper, drawer, flash)
└── shared/       cross-domain (AccentColorStyleInjector, presence)
```

When undecided between two folders, prefer where the **data type** lives. `PostInTimeline` → `timeline/`. `PostListItem` → `post/`.

## Data flow — providers + queries

Each domain has three pieces:

1. **Query keys + hooks** — `apps/web/src/queries/keys/<domain>.ts` + `~/queries/hooks/<domain>.ts`
2. **Context provider** — `apps/web/src/providers/<domain>/Current<Domain>DataProvider.tsx`
3. **Module components** — read from the provider via `useCurrent<Domain>Data()` hook

```tsx
// In page.tsx
<CurrentPostDataProvider data={post}>
  <PostTitle />
  <PostMetaBar />
</CurrentPostDataProvider>

// Inside PostMetaBar.tsx
const post = useCurrentPostData()
```

**Don't prop-drill the domain object through 5 components.** Wrap in a provider.

## List-detail symmetry

Matching list and detail components share **layout IDs** for shared-element transitions.

```tsx
// In list
<m.div layoutId={`note-${note.id}`}><NoteTimelineItem note={note} /></m.div>
// In detail
<m.h1 layoutId={`note-${note.id}`}>{note.title}</m.h1>
```

Namespace with domain prefix (`note-`, `post-`, `say-`).

## Common module patterns

### List item (PostListItem, NoteTimelineItem, ThinkingItem)

- ≤ 80 lines. Wraps in `<Link>` for navigation + hover preview.
- Metadata strip: date, category, tags, counts.
- Hover: subtle bg shift (`hover:bg-neutral-2`), no shadow.
- Wrapped in `<BottomToUpSoftSpringTransitionView delay={i * 60}>` by parent.

Reference: `apps/web/src/components/modules/post/PostListItem.tsx`.

### Sort / filter bar (PostSortBar, NoteListPagination)

- Client (`'use client'`). Reads `searchParams` via `useSearchParams()`, writes via `router.push()`.
- Uses `<DropdownMenu>` + `<Tag>`. Mobile collapses into drawer trigger.

### Action aside (PostActionAside)

- In `<LayoutRightSidePortal>`. Sticky `top-[120px]`, `w-[200px]`, hidden `<xl`.
- Wears `yohaku-fadeable` class. Composes: TOC, share, like/bookmark, related posts.

Reference: `apps/web/src/components/modules/post/PostActionAside.tsx`.

### Comment integration

Mount **delayed** to avoid layout shift:

```tsx
<BottomToUpSoftScaleTransitionView delay={500}>
  <RoomProvider roomName={buildRoomName(refId)}>
    <CommentAreaRootLazy allowComment refId={refId} />
  </RoomProvider>
</BottomToUpSoftScaleTransitionView>
```

`buildRoomName(id)` produces `article-${id}`. See `apps/web/src/components/modules/activity/utils.ts`.

### TOC integration

```tsx
<TocHeadingStrategyProvider>
  <article><PostContent /></article>
  <LayoutRightSidePortal>
    <TocAside />             {/* sticky, fadeable */}
  </LayoutRightSidePortal>
  <TocFAB />                {/* mobile only */}
</TocHeadingStrategyProvider>
```

Heading extraction strategy is per-domain (markdown vs lexical). See `modules/toc/TocHeadingStrategyProvider.tsx`.

### Translation notice

If a post has translations, mount `<PostNoticeCard>` between meta bar and content. Auto-hides when empty.

### Activity / presence

`<RoomProvider roomName>` from `modules/activity/` opens a Socket.IO room. Children read presence count and emit events.

## Server vs client — modules

| Component type | Strategy |
|---|---|
| List/detail pure rendering | Server (when data flows from props) |
| Interactive sort/filter | `'use client'` |
| Hover preview | `'use client'` |
| Comment area | Lazy + client |
| TOC observer | `'use client'` |
| Real-time presence | `'use client'` |

## Adding a new domain module

Checklist:

1. Create `modules/<domain>/` with `index.ts` barrel.
2. Add query keys in `apps/web/src/queries/keys/<domain>.ts`.
3. Add data provider if pages need shared context.
4. Build list item, meta bar, title, content as needed.
5. Use `ui/` primitives, `clsxm`, `tailwind-variants`.
6. Wire comments via `CommentAreaRootLazy` if applicable.
7. Mount TOC via `TocHeadingStrategyProvider` if articles have headings.
8. Add `<PageColorGradient seed={…}>` to detail page.

## Anti-patterns

- ❌ Domain-specific logic in `ui/` → ✅ keep in `modules/<domain>/`
- ❌ Prop-drilling 5 levels deep → ✅ `<CurrentXDataProvider>`
- ❌ Reinventing `<RelativeTime>`, `<Tag>`, `<Avatar>` → ✅ reuse `ui/`
- ❌ Comment area mounted inline (no delay) → ✅ wrap with 500 ms delay
- ❌ `layoutId` collision → ✅ namespace by domain
- ❌ Module file > 500 lines → ✅ split into folder
- ❌ Duplicating room naming or query keys → ✅ import from shared location
- ❌ Wiring socket listeners directly → ✅ wrap in `<RoomProvider>`

## Source files

- `apps/web/src/components/modules/post/PostListItem.tsx` — list item reference
- `apps/web/src/components/modules/post/PostActionAside.tsx` — action aside reference
- `apps/web/src/components/modules/note/NoteTimelineItem.tsx` — `layoutId` pattern
- `apps/web/src/components/modules/comment/` — comment area
- `apps/web/src/components/modules/toc/` — TOC integration
- `apps/web/src/components/modules/activity/utils.ts` — `buildRoomName`
- `apps/web/src/providers/post/CurrentPostDataProvider.tsx` — provider pattern
- `apps/web/src/queries/keys/` — query key conventions
