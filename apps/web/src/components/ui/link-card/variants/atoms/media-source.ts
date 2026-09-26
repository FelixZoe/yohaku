import type { EnrichmentImage } from '~/models/enrichment'

export interface MediaSource {
  height?: number
  thumbhash?: string
  url: string
  width?: number
}

export function imageToSource(
  image: EnrichmentImage | undefined,
): MediaSource | null {
  if (!image?.url) return null
  return {
    url: image.url,
    width: image.width,
    height: image.height,
    thumbhash: image.thumbhash,
  }
}

export function pickHoverSource(
  captureImage: EnrichmentImage | undefined,
  previewImage: EnrichmentImage | undefined,
  thumbnailImage: EnrichmentImage | undefined,
): MediaSource | null {
  return (
    imageToSource(captureImage) ??
    imageToSource(previewImage) ??
    imageToSource(thumbnailImage)
  )
}
