'use client'

import type { PreparedText, PreparedTextWithSegments } from '@chenglou/pretext'
import {
  clearCache,
  layout,
  prepare,
  prepareWithSegments,
  walkLineRanges,
} from '@chenglou/pretext'
import { useCallback, useEffect, useRef, useState } from 'react'

interface PretextCache {
  font: string
  prepared: PreparedText
  text: string
}

interface PretextSegmentsCache {
  font: string
  prepared: PreparedTextWithSegments
  text: string
}

export function usePretextLayout() {
  const cacheRef = useRef<PretextCache | null>(null)
  const segmentsCacheRef = useRef<PretextSegmentsCache | null>(null)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      cacheRef.current = null
      segmentsCacheRef.current = null
      clearCache()
      setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const getPrepared = useCallback(
    (text: string, font: string) => {
      void fontsReady
      const cache = cacheRef.current
      if (cache && cache.text === text && cache.font === font) {
        return cache.prepared
      }
      const prepared = prepare(text, font)
      cacheRef.current = { text, font, prepared }
      return prepared
    },
    [fontsReady],
  )

  const getPreparedWithSegments = useCallback(
    (text: string, font: string) => {
      void fontsReady
      const cache = segmentsCacheRef.current
      if (cache && cache.text === text && cache.font === font) {
        return cache.prepared
      }
      const prepared = prepareWithSegments(text, font)
      segmentsCacheRef.current = { text, font, prepared }
      return prepared
    },
    [fontsReady],
  )

  const measureLayout = useCallback(
    (text: string, font: string, maxWidth: number, lineHeight: number) => {
      if (!text) return { height: lineHeight, lineCount: 1 }
      const prepared = getPrepared(text, font)
      return layout(prepared, maxWidth, lineHeight)
    },
    [getPrepared],
  )

  const measureTextWidth = useCallback(
    (text: string, font: string): number => {
      if (!text) return 0
      const prepared = getPreparedWithSegments(text, font)
      let maxWidth = 0
      walkLineRanges(prepared, Number.MAX_SAFE_INTEGER, (line) => {
        if (line.width > maxWidth) maxWidth = line.width
      })
      return maxWidth
    },
    [getPreparedWithSegments],
  )

  return {
    measureLayout,
    measureTextWidth,
    getPrepared,
    getPreparedWithSegments,
  }
}
