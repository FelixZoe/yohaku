'use client'

import type { Zoom } from 'lumeo'
import mediumZoom from 'lumeo'
import { useEffect, useRef } from 'react'

import { Divider } from '~/components/ui/divider'
import { isVideoExt } from '~/lib/mine-type'

import { Video } from '../../ui/markdown/renderers/video'

let sharedZoom: Zoom | null = null

function getZoom(): Zoom {
  if (sharedZoom) return sharedZoom
  sharedZoom = mediumZoom(undefined, {
    background: 'rgb(0 0 0 / 0.85)',
    margin: 24,
  })
  return sharedZoom
}

export function YohakuImage({ src, alt }: { src?: string; alt?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const caption = alt?.replace(/^[!¡]/, '')

  useEffect(() => {
    const $img = ref.current
    if (!$img) return
    const zoom = getZoom()
    zoom.attach($img)
    return () => {
      zoom.detach($img)
    }
  }, [src])

  if (!src) return null

  const ext = src.split('.').pop()?.toLowerCase() ?? ''
  if (isVideoExt(ext)) {
    return (
      <div className="flex flex-col items-center">
        <Video playsInline autoPlay={false} src={src} />
        {caption && (
          <p className="mt-1 flex flex-col items-center justify-center text-copy-13">
            <Divider className="w-[80px] opacity-80" />
            <span className="opacity-90">{caption}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <figure className="my-4 flex flex-col items-center">
      <img
        alt={caption ?? ''}
        className="max-w-full cursor-zoom-in rounded-md"
        loading="lazy"
        ref={ref}
        src={src}
      />
      {caption && (
        <figcaption className="mt-1 flex flex-col items-center justify-center text-copy-13 text-neutral-7">
          <Divider className="w-[80px] opacity-80" />
          <span className="opacity-90">{caption}</span>
        </figcaption>
      )}
    </figure>
  )
}
