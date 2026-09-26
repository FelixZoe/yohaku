'use client'

import {
  AlbumCard,
  BookCard,
  CommitCard,
  DiscussionCard,
  FallbackCard,
  IssueCard,
  LeetcodeCard,
  MovieCard,
  PaperCard,
  PrCard,
  RepoCard,
  SelfCard,
  UserCard,
} from '@yohaku/rich-content/src/lexical/portable/link-card/variants/index.ts'
import type { FC, ReactNode } from 'react'

import { LinkCardSkeleton } from '~/components/ui/link-card'
import type { EnrichmentResult } from '~/models/enrichment'

import { HostShell } from './HostShell'

const AVATAR_INNEI = 'https://avatars.githubusercontent.com/u/41265413?v=4'
const AVATAR_OCTO = 'https://avatars.githubusercontent.com/u/9919?v=4'

const FETCHED_AT = '2026-05-07T00:00:00.000Z'

// ─── Developer fixtures ──────────────────────────────────────────────────────

const repoTypeScript: EnrichmentResult = {
  url: 'https://github.com/Innei/Yohaku',
  category: 'github',
  subtype: 'repo',
  title: 'Innei/Yohaku',
  description:
    '余白 · A typography-first personal blog with a static design contract.',
  fetchedAt: FETCHED_AT,
  attributes: [
    { key: 'language', value: 'TypeScript' },
    { key: 'stars', value: 2480 },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
}

const repoRust: EnrichmentResult = {
  url: 'https://github.com/sample/rtk',
  category: 'github',
  subtype: 'repo',
  title: 'sample/rtk',
  description:
    'Rust Token Killer — a small CLI proxy that filters noisy output.',
  fetchedAt: FETCHED_AT,
  attributes: [
    { key: 'language', value: 'Rust' },
    { key: 'stars', value: 84 },
  ],
  thumbnailImage: { url: AVATAR_OCTO },
}

const repoUnstyled: EnrichmentResult = {
  url: 'https://github.com/sample/no-language',
  category: 'github',
  subtype: 'repo',
  title: 'sample/no-language',
  description: 'A repo without a primary language detected.',
  fetchedAt: FETCHED_AT,
  attributes: [{ key: 'stars', value: 3 }],
}

const makeIssue = (
  state: 'open' | 'closed',
  overrides: Partial<EnrichmentResult> = {},
): EnrichmentResult => ({
  url: 'https://github.com/Innei/Yohaku/issues/124',
  category: 'github',
  subtype: 'issue',
  title:
    state === 'open'
      ? 'Skeleton height should mirror final card to prevent CLS'
      : 'Replace inline OctIcon SVGs with iconify octicon collection',
  fetchedAt: FETCHED_AT,
  publishedAt:
    state === 'open' ? '2026-05-02T09:12:00Z' : '2026-04-18T03:22:00Z',
  attributes: [
    { key: 'repo', value: 'Innei/Yohaku' },
    { key: 'state', value: state },
    { key: 'number', value: state === 'open' ? 124 : 109 },
    { key: 'author', value: 'innei' },
    { key: 'comments', value: state === 'open' ? 4 : 12 },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
  ...overrides,
})

const makePr = (
  state: 'open' | 'merged' | 'closed',
  overrides: Partial<EnrichmentResult> = {},
): EnrichmentResult => ({
  url: 'https://github.com/Innei/Yohaku/pull/231',
  category: 'github',
  subtype: 'pr',
  title:
    state === 'open'
      ? 'feat(link-card): add stateful GhItemCard with octicon glyphs'
      : state === 'merged'
        ? 'refactor(mermaid): switch image zoom from react-photo-view to medium-zoom'
        : 'wip: experiment with another zoom library — superseded by #231',
  fetchedAt: FETCHED_AT,
  publishedAt:
    state === 'open'
      ? '2026-05-05T11:08:00Z'
      : state === 'merged'
        ? '2026-04-29T16:42:00Z'
        : '2026-04-12T08:01:00Z',
  attributes: [
    { key: 'repo', value: 'Innei/Yohaku' },
    { key: 'state', value: state },
    {
      key: 'number',
      value: state === 'open' ? 231 : state === 'merged' ? 218 : 196,
    },
    { key: 'author', value: 'innei' },
    {
      key: 'additions',
      value: state === 'open' ? 142 : state === 'merged' ? 88 : 24,
    },
    {
      key: 'deletions',
      value: state === 'open' ? 36 : state === 'merged' ? 142 : 312,
    },
    {
      key: 'comments',
      value: state === 'open' ? 6 : state === 'merged' ? 2 : 9,
    },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
  ...overrides,
})

const commitFull: EnrichmentResult = {
  url: 'https://github.com/lobehub/lobehub/commit/6e0cd5f299e14b6525e1ff91f277232133caef0f',
  category: 'github',
  subtype: 'commit',
  title: 'feat(spa): bootstrap app initialization',
  description:
    'Wire up the SPA shell so the app boots without a flash of unloaded\nstate. Adds a bootstrap module that resolves user, theme, and locale\nbefore the first paint.',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-05-06T18:22:00Z',
  attributes: [
    { key: 'author', value: 'innei' },
    { key: 'additions', value: 1114 },
    { key: 'deletions', value: 689 },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
}

const commitNoBody: EnrichmentResult = {
  url: 'https://github.com/Innei/Yohaku/commit/abc1234def5678abc1234def5678abc1234def56',
  category: 'github',
  subtype: 'commit',
  title: 'fix(react-scan): default scanner UI to off (#15934)',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-05-04T09:10:00Z',
  attributes: [
    { key: 'author', value: 'innei' },
    { key: 'additions', value: 2 },
    { key: 'deletions', value: 8 },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
}

const commitAddOnly: EnrichmentResult = {
  url: 'https://github.com/Innei/Yohaku/commit/0123abc4567def8901234abc56789def01234abc',
  category: 'github',
  subtype: 'commit',
  title: 'docs: add commit card design rationale to CLAUDE.md',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-04-28T11:00:00Z',
  attributes: [
    { key: 'author', value: 'octocat' },
    { key: 'additions', value: 47 },
    { key: 'deletions', value: 0 },
  ],
  thumbnailImage: { url: AVATAR_OCTO },
}

const commitMinimal: EnrichmentResult = {
  url: 'https://github.com/Innei/Yohaku/commit/feedfacedeadbeeffeedfacedeadbeeffeedface',
  category: 'github',
  subtype: 'commit',
  title: 'chore: bump deps',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-03-10T07:00:00Z',
  attributes: [{ key: 'author', value: 'innei' }],
  thumbnailImage: { url: AVATAR_INNEI },
}

const discussion: EnrichmentResult = {
  url: 'https://github.com/Innei/Yohaku/discussions/77',
  category: 'github',
  subtype: 'discussion',
  title: 'How do you organize design tokens between mockup and React?',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-04-30T13:00:00Z',
  attributes: [
    { key: 'repo', value: 'Innei/Yohaku' },
    { key: 'number', value: 77 },
    { key: 'author', value: 'guest' },
    { key: 'replies', value: 5 },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
}

const userFull: EnrichmentResult = {
  url: 'https://github.com/Innei',
  category: 'github',
  subtype: 'user',
  title: 'Innei',
  description: 'Building things that try to age gracefully.',
  fetchedAt: FETCHED_AT,
  attributes: [
    { key: 'login', value: 'Innei' },
    { key: 'company', value: '@mx-space' },
    { key: 'location', value: 'Hangzhou, CN' },
    { key: 'public_repos', value: 186 },
    { key: 'followers', value: 1820 },
  ],
  thumbnailImage: { url: AVATAR_INNEI },
}

const userMinimal: EnrichmentResult = {
  url: 'https://github.com/octocat',
  category: 'github',
  subtype: 'user',
  title: 'The Octocat',
  fetchedAt: FETCHED_AT,
  attributes: [
    { key: 'login', value: 'octocat' },
    { key: 'public_repos', value: 8 },
    { key: 'followers', value: 14_300 },
  ],
}

// ─── Media fixtures ──────────────────────────────────────────────────────────

const movie: EnrichmentResult = {
  url: 'https://www.themoviedb.org/movie/872585-oppenheimer',
  category: 'media',
  subtype: 'movie',
  title: 'Oppenheimer',
  description: 'The story of the man who built the bomb.',
  fetchedAt: FETCHED_AT,
  publishedAt: '2023-07-21',
  color: '#3b2a1d',
  attributes: [
    { key: 'rating', value: 8.1, format: 'rating' },
    { key: 'genres', value: 'Biography · Drama · History' },
  ],
  thumbnailImage: { url: 'https://picsum.photos/seed/oppenheimer/300/450' },
}

const movieLongDesc: EnrichmentResult = {
  url: 'https://www.themoviedb.org/movie/872585-oppenheimer',
  category: 'media',
  subtype: 'movie',
  title: 'Oppenheimer',
  description:
    'During World War II, theoretical physicist J. Robert Oppenheimer leads the Manhattan Project, racing against Nazi Germany to develop the atomic bomb — only to spend the rest of his life reckoning with what he helped unleash.',
  fetchedAt: FETCHED_AT,
  publishedAt: '2023-07-21',
  color: '#3b2a1d',
  attributes: [
    { key: 'rating', value: 8.1, format: 'rating' },
    { key: 'genres', value: 'Biography · Drama · History' },
  ],
  thumbnailImage: { url: 'https://picsum.photos/seed/oppenheimer/300/450' },
}

const tv: EnrichmentResult = {
  url: 'https://www.themoviedb.org/tv/76479-the-bear',
  category: 'media',
  subtype: 'tv',
  title: 'The Bear',
  description:
    'A young chef from the fine-dining world returns to Chicago to run his late brother’s sandwich shop.',
  fetchedAt: FETCHED_AT,
  publishedAt: '2022-06-23',
  color: '#5c1414',
  attributes: [
    { key: 'rating', value: 8.5, format: 'rating' },
    { key: 'genres', value: 'Drama · Comedy' },
  ],
  thumbnailImage: { url: 'https://picsum.photos/seed/the-bear/300/450' },
}

const book: EnrichmentResult = {
  url: 'https://book.douban.com/subject/26887161',
  category: 'media',
  subtype: 'book',
  title: '一百年，许多人，许多事',
  fetchedAt: FETCHED_AT,
  publishedAt: '2021-09-01',
  color: '#5b4530',
  attributes: [
    { key: 'author', value: '杨苡 口述' },
    { key: 'rating', value: 8.9, format: 'rating' },
  ],
  thumbnailImage: { url: 'https://picsum.photos/seed/yohaku-book/300/420' },
}

const album: EnrichmentResult = {
  url: 'https://music.apple.com/album/sample',
  category: 'media',
  subtype: 'album',
  title: 'In Rainbows',
  fetchedAt: FETCHED_AT,
  publishedAt: '2007-10-10',
  color: '#1f4a48',
  attributes: [{ key: 'artist', value: 'Radiohead' }],
  thumbnailImage: { url: 'https://picsum.photos/seed/in-rainbows/300/300' },
}

const song: EnrichmentResult = {
  url: 'https://music.apple.com/song/sample',
  category: 'media',
  subtype: 'song',
  title: 'Weird Fishes / Arpeggi',
  fetchedAt: FETCHED_AT,
  color: '#1f4a48',
  attributes: [
    { key: 'artist', value: 'Radiohead' },
    { key: 'albumName', value: 'In Rainbows' },
  ],
  thumbnailImage: { url: 'https://picsum.photos/seed/weird-fishes/300/300' },
}

// ─── Academic / Code fixtures ────────────────────────────────────────────────

const paper: EnrichmentResult = {
  url: 'https://arxiv.org/abs/2402.17764',
  category: 'academic',
  title: 'The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits',
  description:
    'Recent research, such as BitNet, is paving the way for a new era of 1-bit Large Language Models (LLMs). In this work, we introduce a 1-bit LLM variant, namely BitNet b1.58, in which every single parameter (or weight) of the LLM is ternary {-1, 0, 1}.',
  fetchedAt: FETCHED_AT,
  publishedAt: '2024-02-27',
  attributes: [
    { key: 'id', value: '2402.17764' },
    { key: 'category', value: 'cs.CL' },
    {
      key: 'authors',
      value:
        'Shuming Ma, Hongyu Wang, Lingxiao Ma, Lei Wang, Wenhui Wang, Shaohan Huang',
    },
  ],
}

const makeLeetcode = (
  difficulty: 'Easy' | 'Medium' | 'Hard',
): EnrichmentResult => ({
  url: `https://leetcode.com/problems/${difficulty.toLowerCase()}-sample`,
  category: 'code',
  title:
    difficulty === 'Easy'
      ? 'Two Sum'
      : difficulty === 'Medium'
        ? 'Longest Substring Without Repeating Characters'
        : 'Median of Two Sorted Arrays',
  fetchedAt: FETCHED_AT,
  attributes: [
    { key: 'difficulty', value: difficulty },
    {
      key: 'number',
      value: difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 3 : 4,
    },
    {
      key: 'ac_rate',
      value:
        difficulty === 'Easy'
          ? '54.2%'
          : difficulty === 'Medium'
            ? '34.8%'
            : '37.1%',
    },
    {
      key: 'likes',
      value:
        difficulty === 'Easy'
          ? 56_300
          : difficulty === 'Medium'
            ? 38_900
            : 27_400,
    },
    {
      key: 'tags',
      value:
        difficulty === 'Easy'
          ? 'Array, Hash Table'
          : difficulty === 'Medium'
            ? 'Hash Table, String, Sliding Window'
            : 'Array, Binary Search, Divide and Conquer',
    },
  ],
})

// ─── Self fixtures ───────────────────────────────────────────────────────────

const selfPostWithCover: EnrichmentResult = {
  url: 'https://innei.in/posts/tech/another-look-at-link-cards',
  category: 'self',
  title: 'Another look at link cards — from runtime to data layer',
  description:
    '既以 enrichment 收纳 link 之元数据，则前端只剩呈现一事。本文论何以将一个看似简单的 card 拆作 7 余 variants，及其代价。',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-04-22T10:00:00Z',
  attributes: [{ key: 'type', value: 'post' }],
  thumbnailImage: { url: 'https://picsum.photos/seed/yohaku-cover/200/200' },
}

const selfPostNoCover: EnrichmentResult = {
  url: 'https://innei.in/posts/notes/quiet-day',
  category: 'self',
  title: '安静的一天',
  description: '没什么特别的事发生。咖啡不错。',
  fetchedAt: FETCHED_AT,
  publishedAt: '2026-05-03T08:00:00Z',
  attributes: [{ key: 'type', value: 'note' }],
}

const selfPostMinimal: EnrichmentResult = {
  url: 'https://innei.in/thinking/2026/05/05',
  category: 'self',
  title: 'On reading rooms',
  fetchedAt: FETCHED_AT,
}

// ─── Fallback / Open Graph fixtures ──────────────────────────────────────────
// `category: 'web'` rows come from the mx-core `open-graph` provider — the
// bottom-of-stack fallback that scrapes OG / Twitter Card / oEmbed metadata
// for any URL no specialized provider claims. The shape mirrors what the
// backend now serves: optional `site` attribute (og:site_name), `subtype`
// from og:type ('article' | 'video' | 'website' | …), theme color, and a
// best-effort image (og:image with favicon fallback).

const fallbackArticle: EnrichmentResult = {
  url: 'https://overreacted.io/the-two-reacts/',
  category: 'web',
  subtype: 'article',
  title: 'The Two Reacts',
  description:
    'A reflection on how Server Components and the existing client model coexist — and where the seam between them lives.',
  fetchedAt: FETCHED_AT,
  publishedAt: '2024-04-21T00:00:00Z',
  color: '#1f6feb',
  attributes: [
    { key: 'site', value: 'overreacted', label: 'Site', format: 'text' },
    { key: 'author', value: 'Dan Abramov', label: 'Author', format: 'text' },
    { key: 'reading_time', value: '12 min read' },
  ],
  thumbnailImage: {
    url: 'https://picsum.photos/seed/two-reacts/1200/630',
    width: 1200,
    height: 630,
  },
}

const fallbackOEmbedVideo: EnrichmentResult = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  category: 'web',
  subtype: 'video',
  title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
  description:
    "The official video for “Never Gonna Give You Up” — supplemented by the page's oEmbed alternate.",
  fetchedAt: FETCHED_AT,
  publishedAt: '2009-10-25T06:57:33Z',
  color: '#ff0033',
  attributes: [
    { key: 'site', value: 'YouTube', label: 'Site', format: 'text' },
    { key: 'author', value: 'Rick Astley', label: 'Author', format: 'text' },
  ],
  thumbnailImage: {
    url: 'https://picsum.photos/seed/yt-cover/1280/720',
    width: 1280,
    height: 720,
  },
}

const fallbackFaviconOnly: EnrichmentResult = {
  url: 'https://blog.cloudflare.com/changelog/',
  category: 'web',
  subtype: 'website',
  title: 'Cloudflare Blog · Changelog',
  description:
    'Page-level OG image absent and no screenshot — the card degrades to a text-only row; the URL-derived favicon anchors the footer.',
  fetchedAt: FETCHED_AT,
  attributes: [
    { key: 'site', value: 'Cloudflare', label: 'Site', format: 'text' },
  ],
  links: [
    { rel: 'apple-touch-icon', url: 'https://www.cloudflare.com/favicon.ico' },
  ],
}

const fallbackBare: EnrichmentResult = {
  url: 'https://example.com/some-very-long-path/that-keeps-going/and-going-here',
  category: 'web',
  title: 'A page that exposed neither OG, Twitter Card, nor a usable <title>',
  fetchedAt: FETCHED_AT,
}

// ─── Layout primitives ───────────────────────────────────────────────────────

const Section: FC<{
  caption: string
  title: string
  description?: string
  children: ReactNode
}> = ({ caption, title, description, children }) => (
  <section className="space-y-5">
    <header className="space-y-1.5 border-b border-border/60 pb-3">
      <div className="text-[0.7rem] font-medium tracking-[0.18em] text-neutral-6 uppercase">
        {caption}
      </div>
      <h2 className="font-serif text-title-24 text-neutral-10">{title}</h2>
      {description && (
        <p className="font-serif text-[0.95rem] leading-relaxed text-neutral-7 italic">
          {description}
        </p>
      )}
    </header>
    <div className="space-y-4">{children}</div>
  </section>
)

const Row: FC<{ label: string; hint?: string; children: ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[0.7rem] tracking-wider text-neutral-7 uppercase">
        {label}
      </span>
      {hint && <span className="text-[0.75rem] text-neutral-6">{hint}</span>}
    </div>
    {children}
  </div>
)

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <HostShell>
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <header className="mb-14 space-y-3">
          <div className="text-[0.7rem] font-medium tracking-[0.18em] text-neutral-6 uppercase">
            link-card · mockup
          </div>
          <h1 className="font-serif text-display-36 leading-tight text-neutral-10">
            Link Card 全形录
          </h1>
          <p className="font-serif text-[1.0625rem] leading-relaxed text-neutral-8 italic">
            Fixtures-only showcase of every variant, every state, and the
            loading skeleton that holds their place. Nothing on this page hits
            the network — all data is local.
          </p>
        </header>

        <div className="space-y-14">
          <Section
            caption="loading"
            description="Size-stable placeholder while /enrichment/resolve is in flight. Mirrors the shell so swap-in is CLS-free."
            title="Skeleton"
          >
            <LinkCardSkeleton />
          </Section>

          <Section
            caption="developer · github"
            description="Language wash + 30% alpha border tint. Star count rendered with octicon-star-16 beside the title."
            title="Repository"
          >
            <Row label="with language + stars">
              <RepoCard data={repoTypeScript} />
            </Row>
            <Row hint="Rust · 84 stars" label="alternate language">
              <RepoCard data={repoRust} />
            </Row>
            <Row label="no language detected">
              <RepoCard data={repoUnstyled} />
            </Row>
          </Section>

          <Section
            caption="developer · github · state flow"
            description="open → closed. Closed uses semantic --color-error rather than the legacy GitHub purple."
            title="Issue"
          >
            <Row label="state · open">
              <IssueCard data={makeIssue('open')} />
            </Row>
            <Row label="state · closed">
              <IssueCard data={makeIssue('closed')} />
            </Row>
          </Section>

          <Section
            caption="developer · github · state flow"
            description="open → merged → closed. Each state owns its glyph and tone."
            title="Pull Request"
          >
            <Row label="state · open">
              <PrCard data={makePr('open')} />
            </Row>
            <Row label="state · merged">
              <PrCard data={makePr('merged')} />
            </Row>
            <Row label="state · closed">
              <PrCard data={makePr('closed')} />
            </Row>
          </Section>

          <Section
            caption="developer · github"
            description="No state pill — just the chat-style icon and a reply count."
            title="Discussion"
          >
            <DiscussionCard data={discussion} />
          </Section>

          <Section
            caption="developer · github"
            description="Short SHA pill in the eyebrow, optional commit-body in mono, and a barely-there +/− proportion bar. The author rides inline in the meta row with a small avatar — no right-side stamp."
            title="Commit"
          >
            <Row hint="multi-line message · large diff" label="full">
              <CommitCard data={commitFull} />
            </Row>
            <Row hint="subject only · small diff" label="no body">
              <CommitCard data={commitNoBody} />
            </Row>
            <Row
              hint="additions only · bar reads all green"
              label="additions only"
            >
              <CommitCard data={commitAddOnly} />
            </Row>
            <Row hint="no diff stats · bar suppressed" label="minimal">
              <CommitCard data={commitMinimal} />
            </Row>
          </Section>

          <Section
            caption="developer · github"
            description="Avatar, bio, and a meta line of repos · followers · location."
            title="User Profile"
          >
            <Row label="full profile">
              <UserCard data={userFull} />
            </Row>
            <Row hint="no avatar, no bio" label="minimal profile">
              <UserCard data={userMinimal} />
            </Row>
          </Section>

          <Section
            caption="media · tmdb / bangumi / douban"
            description="Short blurbs render in the compact, edge-to-edge card with a left poster. Descriptions longer than ~80 characters auto-expand to a right-poster layout with the shell's natural padding restored and no line clamp on the description. Pass `expanded` explicitly to force either layout."
            title="Movie · TV · Book · Music"
          >
            <Row hint="short desc · stays compact" label="movie · compact">
              <MovieCard data={movie} />
            </Row>
            <Row
              hint="long synopsis · auto-expanded"
              label="movie · auto-expand"
            >
              <MovieCard data={movieLongDesc} />
            </Row>
            <Row
              hint="100-char synopsis · auto-expanded"
              label="tv · auto-expand"
            >
              <MovieCard data={tv} />
            </Row>
            <Row hint="author only · short, stays compact" label="book">
              <BookCard data={book} />
            </Row>
            <Row label="album">
              <AlbumCard data={album} />
            </Row>
            <Row hint="《album》 inline + play pill" label="song">
              <AlbumCard data={song} />
            </Row>
          </Section>

          <Section
            caption="academic"
            description="arXiv-shaped header, primary author + co-authors, italic abstract."
            title="Paper"
          >
            <PaperCard data={paper} />
          </Section>

          <Section
            caption="code · leetcode"
            description="Easy / Medium / Hard map to success / warning / error tokens via StatePill."
            title="Difficulty Tones"
          >
            <Row label="difficulty · easy">
              <LeetcodeCard data={makeLeetcode('Easy')} />
            </Row>
            <Row label="difficulty · medium">
              <LeetcodeCard data={makeLeetcode('Medium')} />
            </Row>
            <Row label="difficulty · hard">
              <LeetcodeCard data={makeLeetcode('Hard')} />
            </Row>
          </Section>

          <Section
            caption="self · own posts / notes / thinking"
            description="Mirrors FallbackCard but defaults the right-side stamp to the site owner's avatar. No MetaRow — type/host metadata is intentionally suppressed for own content."
            title="Self"
          >
            <Row label="post · with cover">
              <SelfCard data={selfPostWithCover} />
            </Row>
            <Row
              hint="HostStamp falls back to owner avatar"
              label="note · no cover"
            >
              <SelfCard data={selfPostNoCover} />
            </Row>
            <Row label="thinking · title only">
              <SelfCard data={selfPostMinimal} />
            </Row>
          </Section>

          <Section
            caption="fallback · open graph / oembed"
            description="Last-resort variant for URLs no specialized provider claims. The backend's `open-graph` provider scrapes og:* / twitter:* / <link rel=alternate type=application/json+oembed> and lands the result here under category=web. Title, description, site label, theme color, image, and publishedAt year are surfaced when present; everything else degrades gracefully."
            title="Generic Link"
          >
            <Row
              hint="og:site_name + theme-color + article:published_time"
              label="article · rich OG metadata"
            >
              <FallbackCard data={fallbackArticle} />
            </Row>
            <Row
              hint="og:type=video supplemented by oEmbed alternate"
              label="video · oembed-supplemented"
            >
              <FallbackCard data={fallbackOEmbedVideo} />
            </Row>
            <Row
              hint="no og:image — text-only row, footer favicon"
              label="website · no cover"
            >
              <FallbackCard data={fallbackFaviconOnly} />
            </Row>
            <Row hint="no image — text-only row" label="bare · title only">
              <FallbackCard data={fallbackBare} />
            </Row>
          </Section>
        </div>
      </main>
    </HostShell>
  )
}
