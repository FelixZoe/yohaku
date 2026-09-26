# Page Layout

> Authoritative for `apps/web/src/app/` and the layout shell under `apps/web/src/components/layout/`.

## Locale-first routing

All public content lives under `app/[locale]/`. The dashboard SPA at `app/(dashboard)/` is outside this.

```
app/
├── layout.tsx                 server, metadata + viewport only
├── [locale]/
│   ├── layout.tsx             server, providers + <html><body>
│   ├── (home)/page.tsx
│   ├── posts/                 list + (post-detail)/[category]/[slug]/
│   ├── notes/                 list + (note-detail)/
│   ├── (page-detail)/[slug]/  pages
│   ├── thinking/              guestbook
│   └── …
└── (dashboard)/dashboard/[[...catch_all]]/page.tsx
```

When adding a route:
- **Localized public route** → `app/[locale]/<segment>/page.tsx`
- **Hidden / static / API-like** → `app/<segment>/route.ts` or top-level page
- **Admin** → `app/(dashboard)/dashboard/...`

## Three container widths — pick one

| Component | Max-width | Use |
|---|---|---|
| `WiderContainer` | `max-w-5xl` / `2xl:max-w-6xl` | Posts list, thinking |
| `NormalContainer` | `max-w-3xl` / `2xl:max-w-4xl` | Note list, friends, timeline |
| `Paper` / `PaperWithEntrance` | content-driven | Article body (3D stack effect) |

All are `mx-auto` with responsive padding. **Don't invent a fourth width.**

## Page-level color gradient

Every detail page gets a `PageColorGradient` mounted **once**, near the top of the tree:

```tsx
<PageColorGradient seed={`${title}-${category.slug}`} />   // post
<PageColorGradient baseColor={topic.hue ?? cover.accent} /> // note (color from cover image)
<PageColorGradient seed={`${title}-${subtitle}`} />        // page
```

List pages don't mount `PageColorGradient`. The global `AccentColorStyleInjector` is enough.

See [theming.md](./theming.md) for what the gradient produces at runtime.

## Detail page composition recipe

All four detail families share the same skeleton. Reference: `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx`.

```tsx
<>
  <PageColorGradient seed={…} />
  <TocHeadingStrategyProvider>
    <CurrentPostDataProvider data={post}>
      <YohakuPostShell>
        <YohakuMainPaperProvider>
          <BottomToUpTransitionView>
            <YohakuMainPaperWrap>
              <YohakuPostArticleContainer>
                <PostTitle />
                <PostMetaBar />
                <PostNoticeCard />
                <MarkdownSelection>
                  <PostContent />
                </MarkdownSelection>
              </YohakuPostArticleContainer>
            </YohakuMainPaperWrap>
          </BottomToUpTransitionView>

          <LayoutRightSidePortal>
            <PostActionAside />          {/* sticky top-[120px], hidden <xl */}
          </LayoutRightSidePortal>
        </YohakuMainPaperProvider>

        <TocFAB />                       {/* mobile only */}
      </YohakuPostShell>
    </CurrentPostDataProvider>
  </TocHeadingStrategyProvider>

  <BottomToUpSoftScaleTransitionView delay={500}>
    <CommentAreaRootLazy allowComment refId={post.id} />
  </BottomToUpSoftScaleTransitionView>
</>
```

**Why the order matters**:
1. `PageColorGradient` first — its `<style>` injection lands before consumers read `--color-accent`.
2. Strategy/data providers wrap the rendering tree.
3. Main paper wrapped in entrance transition.
4. Right sidebar uses portal, not flex sibling — keeps it out of main column flow.
5. Comments delayed 500 ms to avoid layout shift.

## Note 3-column grid

Reference: `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx`.

```tsx
<div className="grid xl:grid-cols-[1fr_minmax(auto,60rem)_1fr]">
  <NoteLeftSidebar className="hidden xl:block" />
  <YohakuShell>…</YohakuShell>
  <LayoutRightSideProvider className="hidden xl:block" />
</div>
```

Grid collapses below `xl`. Sidebars hide; main column expands. Mobile gets `NoteFooterNavigationMobile` and FABs.

## List page composition

```tsx
<WiderContainer>
  <HeaderHideBg />
  <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
    <main>
      <PostSortBar />
      <PostListMobileActions />
      {posts.map((p, i) => (
        <BottomToUpSoftSpringTransitionView delay={i * 60} lcpOptimization>
          <PostListItem post={p} />
        </BottomToUpSoftSpringTransitionView>
      ))}
      <PostPagination />
    </main>
    <aside className="hidden lg:block">
      <PostListActionAside />
    </aside>
  </div>
</WiderContainer>
```

Stagger items via `index * 60ms` delay. `lcpOptimization` skips first paint to keep LCP image priority.

## Sidebar pattern — portal, not sibling

Sticky sidebars use `LayoutRightSidePortal` / `LayoutRightSideProvider`. The portal target is in the layout; consumers push children from anywhere.

```tsx
<LayoutRightSidePortal>
  <div className="yohaku-fadeable sticky top-[120px]">
    <PostActionAside />
  </div>
</LayoutRightSidePortal>
```

`yohaku-fadeable` makes the sidebar fade when `body[data-yohaku-state='reading']`. Always sticky-positioned, hidden `<xl`. Width `w-[200px]`.

## Server vs client

| File | Strategy |
|---|---|
| `app/layout.tsx` | server — metadata + viewport only |
| `app/[locale]/layout.tsx` | server async — providers, font setup |
| Detail `page.tsx` | server async — use `definePrerenderPage(fetcher)` |
| List `page.tsx` | server async — accepts `searchParams` |
| Interactive components | `'use client'` |
| `PageColorGradient` | server async |
| Dashboard | `force-static` + client SPA |

Default to server. Add `'use client'` only when you actually need it.

## Metadata

Every public page implements `generateMetadata`. OG images via `/og` helper routes. JSON-LD `BreadcrumbList` for any deep route.

## Body data attributes

Use `RootDataAttributeBinder` (`apps/web/src/components/layout/root/RootDataAttributeBinder.tsx`) to centralize `document.body.dataset` writes. Don't sprinkle them around page components.

## Anti-patterns

- ❌ Mounting `<PageColorGradient>` twice on one page.
- ❌ Putting `'use client'` code inside `app/.../layout.tsx`.
- ❌ Wrapping a list page in `Paper` (article-only).
- ❌ Inventing a new max-width.
- ❌ Wiring sidebars as flex siblings instead of via the portal.
- ❌ Dashboard pages without `dynamic = 'force-static'`.

## Source files

- `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx` — post detail reference
- `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx` — note detail reference
- `apps/web/src/app/[locale]/(page-detail)/[slug]/layout.tsx` — page detail reference
- `apps/web/src/components/layout/container/{Wider,Normal,Paper}.tsx`
- `apps/web/src/components/common/PageColorGradient.tsx`
- `apps/web/src/providers/shared/LayoutRightSideProvider.tsx`
- `apps/web/src/components/layout/root/RootDataAttributeBinder.tsx`
