'use client'

import type { Image } from '@mx-space/api-client'
import { useState } from 'react'

import { Gallery } from '~/components/ui/gallery'
import { MarkdownImageRecordProvider } from '~/providers/article/MarkdownImageRecordProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

interface DemoImage {
  accent: string
  footnote?: string
  height: number
  url: string
  width: number
}

const picsum = (id: number, width: number, height: number) =>
  `https://picsum.photos/id/${id}/${width}/${height}`

const scenes: {
  id: string
  label: string
  hint: string
  images: DemoImage[]
}[] = [
  {
    id: 'mixed',
    label: '混合比例 + 部分 caption',
    hint: '16:9 / 竖图 / 方图 / 超宽，只有两张带 footnote',
    images: [
      {
        url: picsum(1015, 1600, 900),
        width: 1600,
        height: 900,
        accent: '#6b7f8f',
        footnote: '16:9 横图，带一行说明',
      },
      {
        url: picsum(1025, 1200, 1600),
        width: 1200,
        height: 1600,
        accent: '#8f7a6b',
      },
      {
        url: picsum(1040, 1200, 1200),
        width: 1200,
        height: 1200,
        accent: '#7b8f6b',
        footnote: '方图',
      },
      {
        url: picsum(1050, 2000, 800),
        width: 2000,
        height: 800,
        accent: '#8f6b7b',
      },
    ],
  },
  {
    id: 'extreme',
    label: '极端比例',
    hint: '超长竖图与超宽横图同排，检验基准高是否取自最扁的那张',
    images: [
      {
        url: picsum(1060, 900, 2400),
        width: 900,
        height: 2400,
        accent: '#6b6f8f',
        footnote: '超长竖图',
      },
      {
        url: picsum(1070, 2400, 700),
        width: 2400,
        height: 700,
        accent: '#8f8a6b',
      },
      {
        url: picsum(1080, 1600, 1000),
        width: 1600,
        height: 1000,
        accent: '#6b8f8a',
      },
    ],
  },
  {
    id: 'no-caption',
    label: '全部无 caption',
    hint: '不应预留说明行的高度',
    images: [
      {
        url: picsum(110, 1600, 900),
        width: 1600,
        height: 900,
        accent: '#7f7f7f',
      },
      {
        url: picsum(120, 1400, 1050),
        width: 1400,
        height: 1050,
        accent: '#6f7f6f',
      },
      {
        url: picsum(130, 1800, 800),
        width: 1800,
        height: 800,
        accent: '#7f6f6f',
      },
    ],
  },
  {
    id: 'no-meta',
    label: '缺尺寸元数据',
    hint: '不注册到 image record，应回退旧行为（不固定高度）',
    images: [
      {
        url: picsum(140, 1600, 900),
        width: 0,
        height: 0,
        accent: '#7f7f7f',
      },
      {
        url: picsum(150, 1200, 1600),
        width: 0,
        height: 0,
        accent: '#6f6f7f',
        footnote: '竖图，无元数据',
      },
    ],
  },
]

const toImageRecord = (images: DemoImage[]): Image[] =>
  images
    .filter((image) => image.width > 0 && image.height > 0)
    .map((image) => ({
      src: image.url,
      width: image.width,
      height: image.height,
      accent: image.accent,
      type: 'image/jpeg',
    }))

export default function GalleryDemoPage() {
  const [sceneId, setSceneId] = useState(scenes[0].id)
  const [containerWidth, setContainerWidth] = useState(720)
  const scene = scenes.find((item) => item.id === sceneId)!

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <h1 className="mb-2 text-2xl font-bold">Gallery</h1>
      <p className="mb-6 text-sm text-neutral-7">
        统一高度以最小缩放高度为基准，caption 行按需预留。
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {scenes.map((item) => (
          <button
            key={item.id}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              item.id === sceneId
                ? 'bg-neutral-9 text-neutral-1'
                : 'bg-neutral-3 text-neutral-9 hover:bg-neutral-4'
            }`}
            onClick={() => setSceneId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="mb-6 flex items-center gap-3 text-sm text-neutral-7">
        容器宽度 {containerWidth}px
        <input
          className="w-64"
          max={960}
          min={320}
          step={10}
          type="range"
          value={containerWidth}
          onChange={(e) => setContainerWidth(+e.target.value)}
        />
      </label>

      <p className="mb-3 text-sm text-neutral-7">{scene.hint}</p>

      <MarkdownImageRecordProvider
        images={toImageRecord(scene.images)}
        key={scene.id}
      >
        <WrappedElementProvider
          className="rounded-xl border border-dashed border-neutral-5 p-4"
          style={{ width: containerWidth }}
        >
          <Gallery
            images={scene.images.map((image) => ({
              url: image.url,
              footnote: image.footnote,
            }))}
          />
        </WrappedElementProvider>
      </MarkdownImageRecordProvider>
    </div>
  )
}
