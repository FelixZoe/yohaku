import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl'

import {
  addPoiLayers,
  addRouteLayers,
  addStopLayers,
  type LayerColors,
  POIS_LABEL_LAYER,
  type RouteSegment,
  setPoisData,
  setRouteSegmentsData,
  setStopsData,
} from './map-block-layers'
import {
  buildDistanceTable,
  flattenRouteSegments,
  resolveTimelinePhase,
  resolveVideoCameraBounds,
  sliceRouteAtDistance,
  stopsBeforeDistance,
  type TimelinePhase,
  type TrackVideoExportOptions,
  type VideoCameraBounds,
} from './map-block-video-timeline'
import type { MapPoi, MapTrackStop } from './types'

const EXPORT_WIDTH = 1920
const EXPORT_HEIGHT = 1080
const EXPORT_FPS = 30
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'
const TILE_IDLE_TIMEOUT_MS = 15_000
const EXPORT_PADDING = 96

export const DEFAULT_EXPORT_OPTIONS: TrackVideoExportOptions = {
  cameraMode: 'auto-follow',
  durationSec: 6,
  labelMode: 'stops-and-pois',
  themeMode: 'current',
}

export type ExportPhase = 'preparing' | 'rendering' | 'finalizing'
export type { TrackVideoExportOptions }

export function nearestCoordIdx(
  coords: Array<[number, number]>,
  point: { lat: number; lon: number },
) {
  let best = 0
  let dmin = Infinity
  for (let i = 0; i < coords.length; i++) {
    const dx = coords[i]![0] - point.lon
    const dy = coords[i]![1] - point.lat
    const d = dx * dx + dy * dy
    if (d < dmin) {
      dmin = d
      best = i
    }
  }
  return best
}

export function boundsFromCoords(coords: Array<[number, number]>) {
  let [minLon, minLat] = coords[0]!
  let [maxLon, maxLat] = coords[0]!
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

export function unionBounds(
  coords: Array<[number, number]>,
  pois: MapPoi[],
): [[number, number], [number, number]] | null {
  const all: Array<[number, number]> = [...coords]
  for (const poi of pois) {
    if (Number.isFinite(poi.lat) && Number.isFinite(poi.lon)) {
      all.push([poi.lon, poi.lat])
    }
  }
  if (all.length === 0) return null
  return boundsFromCoords(all)
}

export async function exportTrackToMp4({
  colors,
  isDark,
  onPhase,
  onProgress,
  options = DEFAULT_EXPORT_OPTIONS,
  pois,
  routeSegments,
  signal,
  stops,
}: {
  colors: LayerColors
  isDark: boolean
  onPhase: (status: ExportPhase) => void
  onProgress: (progress: number) => void
  options?: TrackVideoExportOptions
  pois: MapPoi[]
  routeSegments: RouteSegment[]
  signal?: AbortSignal
  stops: MapTrackStop[]
}) {
  if (typeof window === 'undefined' || !('VideoEncoder' in window)) {
    throw new Error(
      'Browser does not support WebCodecs (needs Chrome 94+ or Safari 16.4+)',
    )
  }

  const resolvedOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options }
  const renderDark =
    resolvedOptions.themeMode === 'current'
      ? isDark
      : resolvedOptions.themeMode === 'dark'

  throwIfAborted(signal)
  onPhase('preparing')
  onProgress(0)
  const coordinates = flattenRouteSegments(routeSegments)

  const host = document.createElement('div')
  Object.assign(host.style, {
    height: `${EXPORT_HEIGHT}px`,
    left: '-100000px',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: `${EXPORT_WIDTH}px`,
  })
  document.body.append(host)

  let exportMap: MapLibreMap | null = null
  try {
    const maplibre = await import('maplibre-gl')
    const mediabunny = await import('mediabunny')

    exportMap = new maplibre.Map({
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      container: host,
      fadeDuration: 0,
      interactive: false,
      pixelRatio: 1,
      style: renderDark ? DARK_STYLE : LIGHT_STYLE,
    })

    await waitForIdle(exportMap, signal)
    const bounds = unionBounds(coordinates, pois)
    if (bounds) {
      exportMap.fitBounds(bounds as LngLatBoundsLike, {
        animate: false,
        maxZoom: 16,
        padding: EXPORT_PADDING,
      })
    }
    await waitForIdle(exportMap, signal)

    addRouteLayers(exportMap, colors)
    addStopLayers(exportMap, colors)
    if (pois.length > 0) {
      addPoiLayers(exportMap, colors)
      setPoisData(exportMap, pois)
    }
    if (
      resolvedOptions.labelMode === 'minimal' &&
      exportMap.getLayer(POIS_LABEL_LAYER)
    ) {
      exportMap.setLayoutProperty(POIS_LABEL_LAYER, 'visibility', 'none')
    }

    const canvas = exportMap.getCanvas()
    const target = new mediabunny.BufferTarget()
    const output = new mediabunny.Output({
      format: new mediabunny.Mp4OutputFormat({ fastStart: 'in-memory' }),
      target,
    })
    const videoSource = new mediabunny.CanvasSource(canvas, {
      bitrate: mediabunny.QUALITY_HIGH,
      codec: 'avc',
    })
    output.addVideoTrack(videoSource, { frameRate: EXPORT_FPS })
    await output.start()

    onPhase('rendering')
    onProgress(0.1)

    const distanceTable = buildDistanceTable(routeSegments)
    const totalFrames = resolvedOptions.durationSec * EXPORT_FPS
    const frameDuration = 1 / EXPORT_FPS
    let lastFollowBounds: [[number, number], [number, number]] | null = null

    for (let frame = 0; frame < totalFrames; frame++) {
      throwIfAborted(signal)
      const phase = resolveTimelinePhase(
        frame / EXPORT_FPS,
        resolvedOptions.durationSec,
      )
      const revealDistance = phase.revealProgress * distanceTable.totalDistance
      const route = sliceRouteAtDistance(
        routeSegments,
        revealDistance,
        distanceTable,
      )
      const visibleStops = stopsBeforeDistance(
        stops,
        routeSegments,
        revealDistance,
      )
      const camera = resolveVideoCameraBounds({
        cameraMode: resolvedOptions.cameraMode,
        coords: routeSegments,
        distanceTable,
        phase,
        pois,
        revealDistance,
        stops,
      })

      if (camera.kind === 'follow') lastFollowBounds = camera.bounds
      setExportCamera(exportMap, camera, phase, lastFollowBounds)
      setRouteSegmentsData(exportMap, route)
      setStopsData(exportMap, visibleStops)

      await waitForFrameReady(exportMap, signal)
      await videoSource.add(frame * frameDuration, frameDuration)
      onProgress(0.1 + ((frame + 1) / totalFrames) * 0.8)
    }

    throwIfAborted(signal)
    const finalPhase: TimelinePhase = {
      kind: 'hold',
      localProgress: 1,
      revealProgress: 1,
    }
    const finalCamera = resolveVideoCameraBounds({
      cameraMode: 'overview',
      coords: routeSegments,
      distanceTable,
      phase: finalPhase,
      pois,
      revealDistance: distanceTable.totalDistance,
      stops,
    })
    setExportCamera(exportMap, finalCamera, finalPhase, lastFollowBounds)
    setRouteSegmentsData(exportMap, routeSegments)
    setStopsData(exportMap, stops)
    await waitForFrameReady(exportMap, signal)

    onPhase('finalizing')
    onProgress(0.9)
    await output.finalize()
    onProgress(1)

    const buffer = target.buffer
    if (!buffer) throw new Error('Empty output buffer')
    return new Blob([buffer], { type: 'video/mp4' })
  } finally {
    exportMap?.remove()
    host.remove()
  }
}

function setExportCamera(
  map: MapLibreMap,
  camera: VideoCameraBounds,
  phase: TimelinePhase,
  lastFollowBounds: [[number, number], [number, number]] | null,
) {
  const bounds =
    phase.kind === 'return' && lastFollowBounds
      ? interpolateBounds(
          lastFollowBounds,
          camera.bounds,
          easeOutCubic(phase.localProgress),
        )
      : camera.bounds

  map.fitBounds(bounds as LngLatBoundsLike, {
    animate: false,
    maxZoom: 16,
    padding: EXPORT_PADDING,
  })
}

function interpolateBounds(
  from: [[number, number], [number, number]],
  to: [[number, number], [number, number]],
  progress: number,
): [[number, number], [number, number]] {
  return [
    [
      from[0][0] + (to[0][0] - from[0][0]) * progress,
      from[0][1] + (to[0][1] - from[0][1]) * progress,
    ],
    [
      from[1][0] + (to[1][0] - from[1][0]) * progress,
      from[1][1] + (to[1][1] - from[1][1]) * progress,
    ],
  ]
}

async function waitForFrameReady(map: MapLibreMap, signal?: AbortSignal) {
  if (!map.loaded() || !map.areTilesLoaded()) {
    await waitForIdle(map, signal)
  }
  await waitForRender(map, signal)
}

function waitForIdle(map: MapLibreMap, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal)

    let timeout: ReturnType<typeof setTimeout> | null = null
    const cleanup = () => {
      if (timeout) clearTimeout(timeout)
      map.off('idle', onIdle)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(abortError())
    }
    const onIdle = () => {
      cleanup()
      resolve()
    }

    if (map.loaded() && map.areTilesLoaded()) {
      resolve()
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for map tiles before export'))
    }, TILE_IDLE_TIMEOUT_MS)
    map.once('idle', onIdle)
  })
}

function waitForRender(map: MapLibreMap, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal)

    const cleanup = () => {
      map.off('render', onRender)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(abortError())
    }
    const onRender = () => {
      cleanup()
      resolve()
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    map.once('render', onRender)
    map.triggerRepaint()
  })
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError()
}

function abortError() {
  return new DOMException('Export cancelled', 'AbortError')
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3
}
