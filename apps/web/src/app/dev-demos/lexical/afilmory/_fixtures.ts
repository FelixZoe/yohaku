import type { SerializedEditorState } from 'lexical'

import { afilmoryCollection, afilmoryPhoto, doc } from '../_fixtures/helpers'

const BASE = 'https://innei.afilmory.art'

export interface AfilmoryCase {
  description: string
  group: 'single' | 'list' | 'filter' | 'layout'
  key: string
  label: string
  state: SerializedEditorState
}

export const afilmoryCases: AfilmoryCase[] = [
  {
    group: 'single',
    key: 'single-bare',
    label: 'Single · 裸',
    description: '仅 { id, baseUrl }。EXIF 与缩略 runtime 解。点卡跳详情',
    state: doc(afilmoryPhoto({ id: 'DSCF6094', baseUrl: BASE })),
  },
  {
    group: 'single',
    key: 'single-captioned',
    label: 'Single · 带 caption + alt',
    description: 'author override caption / alt',
    state: doc(
      afilmoryPhoto({
        id: 'DSCF6140',
        baseUrl: BASE,
        caption: '浅草寺之晨，雷门掩于樱光',
        alt: 'Senso-ji temple in morning cherry blossom light',
      }),
    ),
  },

  {
    group: 'list',
    key: 'list-handpicked',
    label: 'List · 手选 6 张',
    description:
      'source.kind = list，items 数组按 author 选定之顺序，afilmory 加新照不入',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '近期心选',
        source: {
          kind: 'list',
          items: [
            { id: 'DSCF6140', w: 6240, h: 4160 },
            { id: 'DSCF6138', w: 4160, h: 6240 },
            { id: 'DSCF6106', w: 4160, h: 6240 },
            { id: 'DSCF6094', w: 6240, h: 4160 },
            { id: 'DSCF6087', w: 6240, h: 4160 },
            { id: 'DSCF6083', w: 4160, h: 6240 },
          ],
        },
      }),
    ),
  },
  {
    group: 'list',
    key: 'list-with-caption',
    label: 'List · 含 title + caption',
    description: '画展名 + 注解。footer 加 caption 一行',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '东京散步',
        caption: '一日穿行浅草、上野，记于此',
        source: {
          kind: 'list',
          items: [
            { id: 'DSCF6140', w: 6240, h: 4160 },
            { id: 'DSCF6138', w: 4160, h: 6240 },
            { id: 'DSCF6106', w: 4160, h: 6240 },
            { id: 'DSCF6094', w: 6240, h: 4160 },
          ],
        },
      }),
    ),
  },

  {
    group: 'filter',
    key: 'filter-tag-union',
    label: 'Filter · tag 并集 #日本',
    description:
      'union mode，仅一 tag 命中即入。"View All ↗" 同步跳 afilmory 之 ?tags=日本',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '日本',
        source: { kind: 'filter', filter: { tags: ['日本'] } },
        limit: 12,
      }),
    ),
  },
  {
    group: 'filter',
    key: 'filter-tag-intersection',
    label: 'Filter · tag 交集 #日本 ∧ #东京',
    description: 'intersection mode，须全包之照方入',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '东京（限日本之东京）',
        source: {
          kind: 'filter',
          filter: { tags: ['日本', '东京'], tagMode: 'intersection' },
        },
        limit: 12,
      }),
    ),
  },
  {
    group: 'filter',
    key: 'filter-camera',
    label: 'Filter · 相机 FUJIFILM X-T5',
    description:
      '按 "Make + Model" 拼接 display name 过滤（与 afilmory 同 contract）',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: 'Fuji X-T5 之作',
        source: { kind: 'filter', filter: { cameras: ['FUJIFILM X-T5'] } },
        limit: 8,
      }),
    ),
  },
  {
    group: 'filter',
    key: 'filter-combined',
    label: 'Filter · 多维叠加 + caption',
    description: 'tag + camera + limit；afilmory 新加合条件之照自动入展',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '日本 · X-T5',
        caption: '动态合集 —— afilmory 上加合条件之新作即自动入此',
        source: {
          kind: 'filter',
          filter: { tags: ['日本'], cameras: ['FUJIFILM X-T5'] },
        },
        limit: 8,
      }),
    ),
  },

  {
    group: 'layout',
    key: 'layout-masonry',
    label: 'Layout · masonry',
    description: '瀑布流（CSS columns），按 photo 之 natural aspect 排',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '瀑布流',
        layout: 'masonry',
        source: { kind: 'filter', filter: { tags: ['日本'] } },
        limit: 12,
      }),
    ),
  },
  {
    group: 'layout',
    key: 'layout-carousel',
    label: 'Layout · carousel',
    description: '水平横滑，每张固定高度 220px，宽随 aspect',
    state: doc(
      afilmoryCollection({
        baseUrl: BASE,
        title: '横滑',
        layout: 'carousel',
        source: {
          kind: 'list',
          items: [
            { id: 'DSCF6140', w: 6240, h: 4160 },
            { id: 'DSCF6138', w: 4160, h: 6240 },
            { id: 'DSCF6106', w: 4160, h: 6240 },
            { id: 'DSCF6094', w: 6240, h: 4160 },
            { id: 'DSCF6087', w: 6240, h: 4160 },
            { id: 'DSCF6083', w: 4160, h: 6240 },
            { id: 'DSCF6041', w: 6240, h: 4160 },
            { id: 'DSCF6030', w: 6240, h: 4160 },
          ],
        },
      }),
    ),
  },
]
