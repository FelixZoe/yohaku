'use client'

import { ImagePlaceholder } from '~/components/ui/image/ImagePlaceholder'
import type { EnrichmentImage } from '~/models/enrichment'

import { pickHoverSource } from './media-source'

interface Props {
  alt: string
  captureImage?: EnrichmentImage
  previewImage?: EnrichmentImage
  thumbnailImage?: EnrichmentImage
}

export function WideOgMedia({
  captureImage,
  previewImage,
  thumbnailImage,
  alt,
}: Props): React.ReactElement | null {
  const source = pickHoverSource(captureImage, previewImage, thumbnailImage)
  if (!source) return null

  const { width, height } = source
  const rawRatio = width && height ? width / height : 16 / 9
  const safeRatio = rawRatio < 1 ? 16 / 9 : Math.min(rawRatio, 3)

  return (
    <div
      className="relative max-h-[280px] w-full overflow-hidden bg-neutral-2"
      style={{ aspectRatio: safeRatio }}
    >
      {source.thumbhash && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
        >
          <ImagePlaceholder
            className="size-full object-cover"
            thumbhash={source.thumbhash}
          />
        </div>
      )}
      <img
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        loading="lazy"
        src={source.url}
      />
    </div>
  )
}
