'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { useZoomGroupId, ZoomGroup } from '~/components/ui/image/ZoomGroup'
import { getPhotoZoom } from '~/lib/photo-zoom'

interface ZoomImgProps {
  alt?: string
  height?: number
  src: string
  width?: number
}

function ZoomImg({ src, alt = '', width = 240, height = 160 }: ZoomImgProps) {
  const ref = useRef<HTMLImageElement>(null)
  const groupId = useZoomGroupId()

  useEffect(() => {
    const $img = ref.current
    if (!$img) return
    const zoom = getPhotoZoom()
    if (groupId) {
      $img.dataset.zoomGroup = groupId
    }
    zoom.attach($img)
    return () => {
      zoom.detach($img)
      if (groupId) {
        delete $img.dataset.zoomGroup
      }
    }
  }, [groupId])

  return (
    <img
      alt={alt}
      className="cursor-zoom-in rounded-md object-cover"
      height={height}
      ref={ref}
      src={src}
      style={{ width, height }}
      width={width}
    />
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm text-neutral-7">{description}</p>
      ) : null}
      {children}
    </section>
  )
}

const seed = (key: string, i: number) =>
  `https://picsum.photos/seed/${key}-${i}/800/600`

export default function PhotoViewerDemoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">lumeo demo</h1>
        <p className="text-sm text-neutral-7">
          Verify M1 single-image zoom + M2 album, gestures, thumbnail strip.
          Click an image to open; press Esc, click outside, scroll, or drag
          downwards to close. In an album, use ← →, the on-screen buttons, the
          thumbnail strip, or click any thumbnail to jump.
        </p>
      </header>

      <Section
        description="No group — pure zoom + close (Esc / outside-click / scroll / drag-down)."
        title="Single image"
      >
        <ZoomImg
          height={260}
          src="https://picsum.photos/seed/single/1200/800"
          width={400}
        />
      </Section>

      <Section
        description="Same group — prev/next buttons, keyboard ← →, thumbnail strip with active highlight."
        title="Album of 6"
      >
        <ZoomGroup>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ZoomImg alt={`Image ${i + 1}`} key={i} src={seed('six', i)} />
            ))}
          </div>
        </ZoomGroup>
      </Section>

      <Section
        description="Strip auto-scrolls the active thumbnail into view."
        title="Album of 12 (scrollable strip)"
      >
        <ZoomGroup>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => (
              <ZoomImg
                alt={`Image ${i + 1}`}
                height={120}
                key={i}
                src={seed('twelve', i)}
                width={180}
              />
            ))}
          </div>
        </ZoomGroup>
      </Section>

      <Section
        description="Each ZoomGroup gets its own id — albums never mix."
        title="Two independent albums"
      >
        <div className="grid grid-cols-2 gap-6">
          <ZoomGroup>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <ZoomImg alt={`A${i + 1}`} key={i} src={seed('a', i)} />
              ))}
            </div>
          </ZoomGroup>
          <ZoomGroup>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <ZoomImg alt={`B${i + 1}`} key={i} src={seed('b', i)} />
              ))}
            </div>
          </ZoomGroup>
        </div>
      </Section>
    </div>
  )
}
