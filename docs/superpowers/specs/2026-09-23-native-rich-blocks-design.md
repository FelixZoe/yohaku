# Native Rich Blocks — Round 1

**Date:** 2026-09-23
**Author:** Innei
**Status:** Draft
**Scope:** `yohaku-oss/apps/mobile` (`src/rich/blocks`, `modules/yohaku/ios`)
**Builds on:** native article body renderer (`feat/native-rich-body`, b32430d)
**UI:** https://claude.ai/artifact/8VYNMSkEEDGftWbM435fNT
**Revised:** 2026-09-23 — §4.1 tweet and §4.3 afilmory redesigned after
Round 1 shipped (canvas row "Round 2").

## 1. Problem

The native body renderer draws every block through `blockRegistry`. Types
without an entry fall back to `UnsupportedBlock` ("此内容暂不支持原生显示").
In the latest 100 posts + notes (34 Lexical docs) that fallback hits 33
nodes: `embed` 14 (13 tweet, 1 github-file), `map` 7, `gallery` 3,
`afilmory` 3, `video` 1, `poll` 1, `stock` 1.

## 2. Goal

Every one of those nodes renders natively. Success = zero fallback cards on
current content. Types with no current use (katex-block, code-snippet,
grid-container, footnote-section, dynamic, other embed sources) keep the
fallback.

## 3. Shared rules

- Each block is a JS component registered in `blockRegistry`; JS owns data
  fetching and layout. Native views only where a system framework draws
  (MapKit, AVKit, Swift Charts).
- Remote data goes through TanStack Query, keyed per block input.
- Loading: the block reserves its final height (known ratio or fixed height)
  so the body does not jump. Skeleton = flat `neutral[2]` shapes, no shimmer.
- Failure (fetch error, bad node data): render `UnsupportedBlock`.
- Visuals follow the UI canvas: `Paper` cards (radius 18), `neutral`/`accent`
  tokens, tap targets ≥ 44pt. Card text is sans (body face) — no serif
  inside cards; mono only for data lines (EXIF, counts, code).

## 4. Blocks

### 4.1 embed / tweet — `tweet-block.tsx`
- Id = last numeric path segment of `node.url`.
- Data: `GET https://cdn.syndication.twimg.com/tweet-result?id=<id>&token=<t>`
  (the endpoint `react-tweet` uses; token derived from the id the same way).
- Parser (`tweet.ts`, own code — `react-tweet` is web-only):
  - `media[]` from `mediaDetails`: `photo` | `video` | `animated_gif`, size
    from `original_info`, image = `media_url_https`. Video/GIF source =
    second-highest-bitrate `video/mp4` variant (react-tweet's
    `getMp4Video` rule), poster = `media_url_https`.
  - `quoted` = same parse of `quoted_tweet`, one level only.
  - `replyTo` = `in_reply_to_screen_name` + `in_reply_to_status_id_str`.
  - `likes` = `favorite_count`, `replies` = `conversation_count`,
    `verified` = `user.is_blue_verified`.
- Card (`Paper`, padding 16, gap 12), top to bottom:
  1. Header: avatar 40, name + verified seal, @handle; official X logo
     top-right (bundled `x-logo.svg` from the X brand kit, drawn with
     `expo-image` + `tintColor` `neutral[9]`, 16pt; never the letter "X").
  2. Reply line when `replyTo`: "回复 @x" → parent status on X.
  3. Text: links/mentions/hashtags in accent, as before.
  4. Media: 1 item → full card width, ratio clamped 4:5–16:9.
     2–4 items → `MediaCarousel` (below). Photo tap → viewer over the
     tweet's photos at that index.
  5. Quoted box (`neutral[1]` fill, radius 12, padding 12): avatar 20,
     name + seal, @handle; text ≤ 3 lines; 56pt thumb of its first media.
     Tap → quoted status on X.
  6. Footer: `M月D日 HH:mm · ♥ n · 💬 n` (counts formatted 1.2K / 1.2M)
     left, "在 X 上查看" → `onLinkPress(url)` right.
- Video / GIF tile = `YohakuVideo` with the mp4 `src`. New optional
  native props: `poster` (URL; skips first-frame extraction) and `loop`
  (GIFs: muted, looping).
- `MediaCarousel` (`media-carousel.tsx`, shared with §4.3): horizontal
  row, fixed height 260pt; tile width = 260 × aspect, capped at 85% of
  the card width so the next tile peeks; bleeds to the card edges; snaps
  per tile; `1/N` counter pill top-right updates on scroll.
- Loading skeleton unchanged. Tombstone / 404 / error → fallback.

### 4.2 embed / github-file — `github-file-block.tsx`
- Parse `owner/repo/ref/path` from the URL (same rules as
  `rich-content/src/lexical/portable/github-file.ts`).
- Data: `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}` as text.
- Header (file name, repo path, ref pill; tap → GitHub) + existing
  `CodeBlock` body; collapsed to 12 lines with "展开全部 · N 行".

`EmbedBlock` dispatches on `node.source` (URL fallback for github-file);
other sources → fallback.

### 4.3 gallery + afilmory

**gallery** — `image-grid-block.tsx`, unchanged:
- `node.images` → `{ src, width?, height?, thumbhash?, alt? }[]`.
- 1 image: full width at its ratio (portrait capped at 4:5).
  2: two columns. ≥3: first full width, rest two columns, max 5 tiles,
  last tile shows "+N".
- Tap → existing `RemoteImage` viewer over all images (originals).
- Captions (alts joined by " · ") under the grid.

**afilmory** — dispatch like web: `source.kind === 'list'` with exactly
one item → Polaroid; anything else (list ≥ 2, `filter`) → Album. Pure
helpers (EXIF line, source summary, filter href, masonry columns, URL
resolve) move from `image-grid.ts` to `afilmory.ts`.

Polaroid — `afilmory-polaroid.tsx`:
- Frame and height come from the node before any fetch: `items[0].w/h`
  (portrait capped at 4:5), `items[0].hash` thumbhash painted at once —
  no skeleton.
- Data: `GET {baseUrl}/api/manifest/photos/:id`.
- Frame: paper fill, radius 6, padding 10 / 10 / 0, soft shadow.
- Under the photo: caption = `node.caption ?? photo.description` in
  sans 15; one mono line `Model · focal · ƒ/x · 1/xs · ISO x` +
  `AFILMORY ↗` (≥ 44pt) → `{baseUrl}/photos/:id`.
- Photo tap → viewer (original).
- Fetch error: keep frame, thumbhash, caption; mono line shows the id.
  Only a malformed node → fallback.

Album — `afilmory-album.tsx`:
- Data: `list` → `GET /api/manifest/photos?ids=…` capped at
  `limit ?? 24`; `filter` → `POST /api/manifest/photos/search` (body as
  web's `toRequestBody`) with `limit ?? 12`.
- Frame: `Paper`; header = `node.title` + mono summary (web's
  `summarizeSource`: count, tags, cameras, lenses, dates) left;
  AFILMORY mark + "全部 ↗" right (list → `baseUrl`, filter →
  `buildFilterHref`).
- Body: `grid` / `masonry` → two-column masonry (each photo to the
  shorter column), gap 4, max 6 tiles, "+N" on the last.
  `carousel` → `MediaCarousel` (§4.1).
- Tile tap → viewer over all loaded photos. `node.caption` under the
  frame.
- Loading: list reserves masonry heights from item `w/h` with
  thumbhashes; filter shows 6 fixed-height bones.
- Fetch error / empty result → fallback.

### 4.4 video — `video-block.tsx` + `Video/YohakuVideoView.swift`
- Native view: `AVPlayerLayer`, poster = first frame, centred play button,
  duration pill, full-screen button → `AVPlayerViewController`.
- Tap play → plays inline, muted-off, system controls; pauses when the view
  leaves the window.
- Height from the asset's natural size once loaded; 16:9 reserved before.

### 4.5 map — `map-block.tsx` + `Map/YohakuTrackMapView.swift`
- JS fetches the track JSON (`node.track.url`), passes
  `segments ?? [points]` as `[[lat, lon]]` arrays to the native view.
- Native: non-interactive `MKMapView` (muted standard style), one
  `MKPolyline` per segment in accent, start/end dots, fit to bounds with
  padding. Tap → full-screen interactive map sheet.
- Caption row: title, `distanceMeters` (km) · duration
  (`endTimeMs - startTimeMs` when both present), expand button.
- `legs` chips are out of scope; all legs draw together.

### 4.6 stock — `stock-block.tsx` + `Chart/YohakuKlineView.swift`
- Data: `GET /serverless/built-in/stock_bars?symbol&interval&from&to`
  via `api` client → `{ meta, bars[] }`.
- JS computes EMA series from `node.ema`; native view gets bars + EMA
  arrays + colours. Swift Charts: `RuleMark` wick + `RectangleMark` body,
  `LineMark` per EMA, volume `BarMark` strip.
- Up = green (`semantic.success`), down = red (`semantic.error`).
- Header: symbol, name · exchange, last close, change % vs first open.
- Only `variant: 'kline'`; other variants → fallback.

### 4.7 poll — `poll-block.tsx`
- Data: `GET /polls/:id` → `PollState`; vote `POST /polls/:id/vote`
  `{ optionIds }` → `PollState`. Session cookie identifies readers; the
  server dedupes anonymous votes.
- Before vote (`canVote && !userVote`): sunken option rows; tap votes
  (single choice; multi-select only if the node says so, with a submit
  button). Optimistic update, rollback + toast on error.
- After vote / closed: rows show a fill bar and `%`, the chosen row is
  outlined in accent with a check.
- Header: "投票 · N 人参与", question in sans semibold.

## 5. Out of scope

Map legs chips, other embed sources, gallery masonry/carousel layouts
(afilmory handles its own, §4.3), threads beyond one reply line, stock
snapshot variant, dark-mode canvas mockups (blocks still follow the palette
at runtime).

## 6. Testing

- Unit (vitest): tweet id + token, github-file URL parse, afilmory and
  gallery normalisation + grid layout rows, track → segments, EMA,
  poll percentage + optimistic reducer.
- Unit, round 2: tweet parse fixtures (3 photos, quoted, reply, video mp4
  variant pick, GIF), count format, carousel tile widths + 85% cap;
  afilmory EXIF line, source summary, filter href, masonry column
  assignment.
- Manual: dev-demos rich-document lab with a fixture per block; the Tokyo
  trip note (map / gallery / afilmory / video / tweets) and the poll post on
  the simulator.
