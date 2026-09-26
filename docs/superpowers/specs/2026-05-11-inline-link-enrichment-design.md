# Inline Link OG Enrichment — Hover Popover & Wide-Image Cards

> 2026-05-11 · scope: `apps/web` (frontend only) · status: design

## Background

Today the link enrichment pipeline only resolves a URL when it appears as one of two structured forms:

1. An explicit `link-card` Lexical node (author-marked cardification).
2. A single-link paragraph (`autolink` / `link` as the sole child of a paragraph — mirrors markdown's "URL on its own line" promotion rule).

Both are extracted server-side by `UrlExtractorService.extractFromLexical` (`mx-core/apps/core/src/modules/enrichment/url-extractor.service.ts:38-70`) and pre-hydrated into the Next.js page payload as an `EnrichmentMap`, which `ArticleLinkCard` reads synchronously via `EnrichmentMapContext`. No client-side fetch path exists.

A regular inline `<a>` inside body text — the third and most common form — never participates. It renders as a bare anchor with a favicon (`LexicalContent.tsx:113-138`). Readers get no preview of where the link goes.

Additionally, the existing block-level `FallbackCard` (`apps/web/src/components/ui/link-card/variants/FallbackCard.tsx:99-104`) renders the Open Graph image as a tiny `size-14` (56×56) `object-cover` thumbnail — disrespecting the OG image's natural aspect ratio. OG images are almost always wide (1.91:1 by spec recommendation) and contain layout that gets destroyed at 56×56 square crop.

## Goals

1. **Inline link hover preview**: hovering an external inline `<a>` triggers a popover showing OG title, description, and image — fetched lazily on hover, never SSR-hydrated.
2. **Wide OG image rendering**: both the new hover popover and the existing `FallbackCard` display OG images full-width at their natural aspect ratio (with reasonable bounds).
3. **Lazy server-side caching**: the first hover that reaches the backend caches the result in DB + Redis; subsequent hovers — and future SSR resolutions for the same URL (e.g. if the link is later promoted to a `link-card`) — hit the warm cache.

## Non-Goals

- **Backend URL extraction changes.** `UrlExtractorService` is not modified. Inline links remain absent from the SSR-hydrated `EnrichmentMap`. The on-demand `/enrichment/resolve` endpoint already exists and provides everything needed.
- **Mobile hover UX.** Hover popovers are disabled on mobile. Inline links remain bare anchors that navigate on tap. No long-press, no two-tap preview.
- **Same-origin inline links.** Internal links (post / note / thinking) already have `PeekModal`. Adding OG preview on top would conflict and bloat. Same-origin: skipped.
- **Non-http(s) schemes.** `mailto:`, `tel:`, `ftp:`, fragment-only (`#section`): skipped.
- **`PosterCard` layout.** Movie / book / album posters keep their existing horizontal layout. The wide-OG change targets the generic web/article fallback only.
- **Retry / failure feedback.** Resolve failures, 204 responses, and network timeouts are silent. No toast, no "couldn't load preview" affordance. The link simply behaves as it does today.

## Data Flow

```
Hover enters inline <a href="…">
   │
   ├─→ React Query asks for key ['enrichment', url]
   │     │
   │     ├─→ initialData hit (SSR-hydrated EnrichmentMap contains this URL,
   │     │     e.g. same URL also appears as a block-link in the same article)
   │     │     → return synchronously, no fetch
   │     │
   │     └─→ initialData miss
   │           → GET /enrichment/resolve?url=…
   │             │
   │             ├─→ 200 + EnrichmentResult → cache, rerender
   │             ├─→ 204 (provider returned nothing) → data = null → silent
   │             ├─→ network error / timeout → silent (retry: false)
   │             └─→ first resolve writes DB + Redis; next call any source hits warm cache
   │
   ├─→ Data arrives while still hovering → popover shows
   └─→ Data arrives after leaving → popover stays closed
         (in-flight request is NOT cancelled — let it complete to warm the cache)
```

## Section 1 · No Backend Changes

`/enrichment/resolve?url=` (`mx-core/apps/core/src/modules/enrichment/enrichment.controller.ts:26`) already does the right thing: checks Redis → checks DB → on miss invokes the open-graph provider chain → writes DB (7-day TTL) + Redis (600s TTL) → returns `EnrichmentResult` or 204.

The user's original ask included "scrape OG for inline link nodes," but the agreed approach is **lazy, hover-triggered** rather than eager at publish time. Reasoning: a long post can contain dozens of inline links; eager extraction would bloat the page payload and trigger many speculative scrapes for URLs no reader ever hovers. Lazy resolution lets the natural reading pattern shape the cache.

This means **`UrlExtractorService.extractFromLexical` is not modified**. Inline links continue to fall out of the SSR enrichment map. The frontend handles them entirely on demand.

## Section 2 · `useInlineLinkEnrichment` Hook & `InlineLinkAnchor`

### Eligibility helper

New file: `apps/web/src/lib/link-eligibility.ts`

```ts
export function isExternalHttpUrl(href: string, currentHost: string): boolean
```

Returns `true` only when:
- `new URL(href)` parses successfully
- `protocol` is `http:` or `https:`
- `host !== currentHost` (compared lowercase)

Returns `false` for: relative paths, `mailto:`, `tel:`, fragment-only (`#foo`), and same-origin URLs. `currentHost` defaults to `window.location.host` at call site (client-only; the wrapping `<a>` is rendered client-side via the Lexical override).

### React Query hook

New file: `apps/web/src/queries/hooks/use-inline-link-enrichment.ts`

```ts
export function useInlineLinkEnrichment(url: string, enabled: boolean) {
  const ssrPrehydrated = useLinkCardEnrichment(url) // existing EnrichmentMapContext reader

  return useQuery({
    queryKey: ['enrichment', url],
    queryFn: () => resolveEnrichmentFromUrl(url).then((r) => r?.enrichment ?? null),
    enabled: enabled && url.length > 0,
    initialData: ssrPrehydrated ?? undefined,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
```

Key behaviors:
- `enabled` gates on parent-controlled hover state. The hook only fires after `mouseenter`.
- `initialData` cross-pollinates with block-link SSR hydration: if the same URL appears as a block-link earlier in the same article, the inline-link popover renders instantly with zero fetch.
- `staleTime: Infinity` because the backend has its own 7-day TTL and revalidation policy — the client doesn't need to second-guess.
- `retry: false` enforces the "silent failure" UX contract.

The fetch wrapper already exists: `apps/web/src/app/[locale]/thinking/resolve-metadata.ts` defines `resolveEnrichmentFromUrl(url)`, which calls `$fetch<EnrichmentResult>(API_URL + '/enrichment/resolve', { params: { url } })`, swallows errors as `null`, and rejects results lacking a `category` field. Two callsites now need it (thinking metadata + this hook), so as part of this work the helper is **moved** to `apps/web/src/lib/enrichment/resolve.ts` and both callsites import from there. Hook output `data` may be `null`, `undefined`, or the result — all three render paths are handled (`null`/`undefined` → no popover).

### `InlineLinkAnchor` component

New file: `apps/web/src/components/ui/link-card/InlineLinkAnchor.tsx`

```tsx
export function InlineLinkAnchor({ href, children, className, rel, target }: {
  href: string
  children: React.ReactNode
  className?: string
  rel?: string
  target?: string
}) {
  const isMobile = useIsMobile()
  const eligible = useMemo(
    () => typeof window !== 'undefined' && isExternalHttpUrl(href, window.location.host),
    [href],
  )
  const [hovered, setHovered] = useState(false)
  const anchorRef = useRef<HTMLAnchorElement>(null)

  const { data } = useInlineLinkEnrichment(href, hovered && eligible)

  const bareAnchor = (
    <a className={className} href={href} ref={anchorRef} rel={rel} target={target}>
      {children}
    </a>
  )

  if (isMobile || !eligible) return bareAnchor

  return (
    <FloatPopover
      anchorEl={anchorRef.current}
      open={hovered && !!data}
      placement="top"
      offset={8}
      onMouseEnterTrigger={() => setHovered(true)}
      onMouseLeaveTrigger={() => setHovered(false)}
      triggerElement={bareAnchor}
    >
      {data ? <HoverLinkCard data={data} /> : null}
    </FloatPopover>
  )
}
```

**State machine invariants:**

| Mouse state | Query state | Popover state |
|---|---|---|
| not hovering | idle / disabled | closed |
| hovering, request in flight | fetching | closed |
| hovering, request resolved with data | success | **open** |
| hovering, request resolved with null/204 | success(null) | closed |
| left anchor before request finished | still fetching (NOT cancelled) | closed |
| left anchor after request finished | cached | closed |

The "left before finished, request continues" branch is deliberate: completing the request warms the backend cache, so the *next* hover on the same URL — by this reader or any other — is instant. Cancelling would waste the network round-trip.

**FloatPopover API note**: `FloatPopover` (`apps/web/src/components/ui/float-popover/FloatPopover.tsx`) currently exposes a hover-driven trigger with internal open state. If it does not support an externally controlled `open` prop in its current form, the implementation will add one (small, non-breaking — internal state becomes optional fallback). Verify before writing implementation code.

### Wiring into `LexicalContent`

Modify `apps/web/src/components/ui/rich-content/LexicalContent.tsx:113-138`. The current `link` and `autolink` overrides call `renderLinkWithFavicon`, which returns a bare `<a>`. Refactor: keep `renderLinkWithFavicon` building the inner content (`<Favicon /> {children}`), but wrap the `<a>` in `<InlineLinkAnchor>`:

```tsx
link: (node, key, children, defaultRenderer) => {
  const n = node as { url?: string; rel?: string | null; target?: string | null }
  if (!n.url) return defaultRenderer()
  return (
    <InlineLinkAnchor
      className={linkClassName}
      href={n.url}
      key={key}
      rel={n.rel || 'noopener'}
      target={n.target || '_blank'}
    >
      <Favicon href={n.url} />
      {children}
    </InlineLinkAnchor>
  )
},
// autolink: same shape, rel/target hardcoded as today
```

Visually nothing changes for the bare anchor — `linkClassName` and `<Favicon>` remain. The wrapping component only adds hover behavior.

## Section 3 · Wide OG Image Cards — `WideOgMedia`, `HoverLinkCard`, `FallbackCard`

### Shared atom: `WideOgMedia`

New file: `apps/web/src/components/ui/link-card/variants/atoms/WideOgMedia.tsx`

```tsx
export function WideOgMedia({ image, alt }: {
  image: EnrichmentImage | undefined
  alt: string
}) {
  if (!image?.url) return null

  const { width, height, blurhash } = image
  const rawRatio = width && height ? width / height : 16 / 9
  // Defensive aspect-ratio bounds:
  //   < 1   → portrait OG (rare; usually misdetected site logo) → fall back to 16/9
  //   > 3   → ultra-wide banner → cap at 3/1 + max-h to prevent vertical dominance
  const safeRatio = rawRatio < 1 ? 16 / 9 : Math.min(rawRatio, 3)

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-2 max-h-[280px]"
      style={{ aspectRatio: safeRatio }}
    >
      {blurhash && <BlurhashBackdrop hash={blurhash} />}
      <img
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        loading="lazy"
        src={image.url}
      />
    </div>
  )
}
```

- `aspectRatio` CSS property gives the container its natural shape — image rendered `object-cover` to fill any rounding mismatch.
- `max-h-[280px]` is a hard cap so a 4096×100 banner doesn't force a 700px-tall card.
- `bg-neutral-2` is the placeholder color in the gap before image load (and the only visible fill if the image 404s).
- `blurhash` is rendered behind the `<img>` if `EnrichmentImage.blurhash` is provided. The existing `BlurhashBackdrop` (or whatever the project's blurhash renderer is named) is reused; if no such component exists today, this spec also adds it as a lightweight wrapper around `react-blurhash`.

### `HoverLinkCard`

New file: `apps/web/src/components/ui/link-card/HoverLinkCard.tsx`

```tsx
export function HoverLinkCard({ data }: { data: EnrichmentResult }) {
  return (
    <a
      className="block w-[360px] max-w-[400px] overflow-hidden rounded-xl
                 bg-white dark:bg-[var(--surface-paper)]
                 shadow-lg ring-1 ring-neutral-3/50"
      href={data.url}
      rel="noopener"
      target="_blank"
    >
      <WideOgMedia alt={data.image?.alt ?? data.title} image={data.image} />
      <div className="p-3">
        <div className="line-clamp-2 text-copy-15 font-medium text-neutral-10">
          {data.title}
        </div>
        {data.description && (
          <div className="mt-1 line-clamp-3 text-copy-13 text-neutral-7">
            {data.description}
          </div>
        )}
        <MetaRow className="mt-2">
          {/* favicon · host · subtype · year — same pieces FallbackCard renders */}
        </MetaRow>
      </div>
    </a>
  )
}
```

- Width: `360px` baseline, `max-w-[400px]` upper bound. Tall content (no image, long description) grows downward, never sideways.
- Entire card is the anchor: hovering the popover and clicking anywhere navigates.
- Animation: `FloatPopover`'s built-in `getPopoverAnimationConfig` (fade + small translateY, 150ms). No additional motion configured here.

### `FallbackCard` refactor

Modify `apps/web/src/components/ui/link-card/variants/FallbackCard.tsx`.

Current shape (`FallbackCard.tsx:67-109`):
```
<LinkCardShell>
  <div flex-1>title / description / MetaRow</div>
  <img size-14 object-cover />     ← problem: 56×56 crop disrespects OG aspect
</LinkCardShell>
```

New shape:
```
<LinkCardShell vertical>
  <WideOgMedia image={data.image} alt={…} />   ← top, full width, natural ratio
  <div flex-1>title / description / MetaRow</div>
</LinkCardShell>
```

`LinkCardShell` continues to host accent-color injection (`--color-accent` from OG `theme-color`) and external-link semantics. Its internal layout becomes vertical (`flex-col`) when `image` is present, falling back to today's text-only layout when `image` is undefined.

Outer width constraint (`max-w-[36rem]`) and surrounding `not-prose` wrapper (in `BlockLinkRenderer`) are untouched.

### PosterCard untouched

`isPosterEnrichment(result)` keeps routing movie / book / album results to `PosterCard`. Those are *portrait* posters with a different visual language. The wide-OG change is specific to the web / article fallback path.

## File Inventory

**New files:**
- `apps/web/src/lib/link-eligibility.ts`
- `apps/web/src/lib/enrichment/resolve.ts` — extracted `resolveEnrichmentFromUrl` (shared by thinking metadata + new hook)
- `apps/web/src/queries/hooks/use-inline-link-enrichment.ts`
- `apps/web/src/components/ui/link-card/InlineLinkAnchor.tsx`
- `apps/web/src/components/ui/link-card/HoverLinkCard.tsx`
- `apps/web/src/components/ui/link-card/variants/atoms/WideOgMedia.tsx`

**Modified files:**
- `apps/web/src/components/ui/rich-content/LexicalContent.tsx` — `link`/`autolink` overrides wrap in `InlineLinkAnchor`
- `apps/web/src/components/ui/link-card/variants/FallbackCard.tsx` — horizontal → vertical layout using `WideOgMedia`
- `apps/web/src/components/ui/link-card/variants/FallbackCard.test.tsx` — DOM assertions updated
- `apps/web/src/components/ui/link-card/index.ts` — export `InlineLinkAnchor`, `HoverLinkCard`
- `apps/web/src/app/[locale]/thinking/resolve-metadata.ts` — re-exports from the new shared module (path stays valid for existing callers)

**Backend:** zero changes.

## Testing

- `link-eligibility.test.ts` — table-driven: http/https external true, mailto/tel/fragment/same-origin/relative false
- `useInlineLinkEnrichment.test.ts` — initialData from SSR map short-circuits fetch; disabled state suppresses fetch; retry=false on error
- `InlineLinkAnchor.test.tsx`:
  - mouseEnter fires query, mouseLeave keeps in-flight request alive but closes popover
  - data arriving after mouseLeave does NOT open popover
  - mobile viewport renders bare anchor with no popover
  - same-origin / mailto / fragment render bare anchor with no popover
- `WideOgMedia.test.tsx` — aspect ratio derived from width/height; portrait OG falls back to 16/9; ultra-wide capped at 3/1; absent image renders nothing
- `FallbackCard.test.tsx` — updated to assert vertical layout with `WideOgMedia` at top and text below; absent-image branch keeps the existing text-only behavior
- `HoverLinkCard.test.tsx` — renders title, description, host meta; root element is `<a href={data.url}>`

## Performance & Caching

- React Query `gcTime: 30min` keeps recently-hovered URLs warm across page navigations within a session.
- Backend's existing Redis (600s) + DB (7d) layers absorb repeated hovers across sessions.
- A reader skimming a 30-link long post would, in the worst case, trigger 30 resolves over the session — but only for URLs they actually hover, and each is cached on first arrival.
- `staleTime: Infinity` means once a URL is hydrated client-side, subsequent hovers in the same session never re-fetch.

## Open Questions Resolved

- **Scope of inline-link extraction**: lazy hover-triggered, not eager publish-time.
- **Eligible link kinds**: external http(s) only.
- **Hover delay**: none — network latency itself debounces misfires; popover only opens when (data arrived) ∧ (still hovering).
- **Mobile**: disabled entirely.
- **Failure UX**: silent.
- **Visual layout**: new `HoverLinkCard` for popover + refactor `FallbackCard` to match (both use the shared `WideOgMedia` atom).
- **State management**: React Query + `EnrichmentMapContext` initialData bridge (option A from the brainstorm).
