'use client'

import type { Zoom } from 'lumeo'
import mediumZoom from 'lumeo'

let zoom: Zoom | null = null

export const getPhotoZoom = (): Zoom => {
  if (zoom) {
    return zoom
  }
  zoom = mediumZoom(undefined, {})
  return zoom
}
