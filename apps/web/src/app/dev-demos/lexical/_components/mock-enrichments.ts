import type { EnrichmentMap } from '~/components/ui/link-card/EnrichmentMapContext'

const FETCHED_AT = '2026-05-20T00:00:00.000Z'

export const mockEnrichmentMap: EnrichmentMap = {
  'https://github.com/Innei/Shiro': {
    attributes: [
      { format: 'text', key: 'language', label: 'Lang', value: 'TypeScript' },
      { format: 'number', key: 'stars', label: 'Stars', value: 2480 },
      { format: 'number', key: 'forks', label: 'Forks', value: 180 },
    ],
    category: 'github',
    description:
      '一个 Next.js 个人博客系统，优美而现代。Shiro 是一个 typography-first 的写作空间。',
    fetchedAt: FETCHED_AT,
    thumbnailImage: {
      url: 'https://avatars.githubusercontent.com/u/41265413?v=4',
    },
    subtype: 'repo',
    title: 'Innei/Shiro',
    url: 'https://github.com/Innei/Shiro',
  },
  'https://github.com/Innei/Yohaku': {
    attributes: [
      { format: 'text', key: 'language', label: 'Lang', value: 'TypeScript' },
      { format: 'number', key: 'stars', label: 'Stars', value: 64 },
    ],
    category: 'github',
    description: '余白 · 私有派生之 MX-Space 博客系统，以排版与节奏为先。',
    fetchedAt: FETCHED_AT,
    thumbnailImage: {
      url: 'https://avatars.githubusercontent.com/u/41265413?v=4',
    },
    subtype: 'repo',
    title: 'Innei/Yohaku',
    url: 'https://github.com/Innei/Yohaku',
  },
  'https://github.com/Innei/haklex': {
    attributes: [
      { format: 'text', key: 'language', label: 'Lang', value: 'TypeScript' },
      { format: 'number', key: 'stars', label: 'Stars', value: 12 },
    ],
    category: 'github',
    description: 'haklex · Yohaku 与 Shiro 共用之 Lexical 富文本工具集。',
    fetchedAt: FETCHED_AT,
    thumbnailImage: {
      url: 'https://avatars.githubusercontent.com/u/41265413?v=4',
    },
    subtype: 'repo',
    title: 'Innei/haklex',
    url: 'https://github.com/Innei/haklex',
  },
}
