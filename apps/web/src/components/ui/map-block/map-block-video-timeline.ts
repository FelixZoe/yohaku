import type { RouteCoordinate, RouteSegment } from './map-block-layers'
import type { MapPoi, MapTrackStop } from './types'

export type TrackVideoCameraMode = 'auto-follow' | 'overview'
export type TrackVideoDurationSec = 4 | 6 | 10
export type TrackVideoLabelMode = 'minimal' | 'stops-and-pois'
export type TrackVideoThemeMode = 'current' | 'light' | 'dark'

export interface TrackVideoExportOptions {
  cameraMode: TrackVideoCameraMode
  durationSec: TrackVideoDurationSec
  labelMode: TrackVideoLabelMode
  themeMode: TrackVideoThemeMode
}

export interface SegmentDistanceTable {
  cumulative: number[]
  endDistance: number
  segment: RouteSegment
  startDistance: number
}

export interface DistanceTable {
  segments: SegmentDistanceTable[]
  totalDistance: number
}

export type TimelinePhase =
  | { kind: 'establish'; localProgress: number; revealProgress: 0 }
  | { kind: 'reveal'; localProgress: number; revealProgress: number }
  | { kind: 'return'; localProgress: number; revealProgress: 1 }
  | { kind: 'hold'; localProgress: number; revealProgress: 1 }

export interface VideoCameraBounds {
  bounds: [[number, number], [number, number]]
  kind: 'follow' | 'overview'
}

interface ResolveVideoCameraBoundsInput {
  cameraMode: TrackVideoCameraMode
  coords: RouteSegment | RouteSegment[]
  distanceTable: DistanceTable
  phase: TimelinePhase
  pois: MapPoi[]
  revealDistance: number
  stops: MapTrackStop[]
}

const EARTH_RADIUS_METERS = 6_371_000
const MIN_FOLLOW_WINDOW_METERS = 3_000
const MAX_FOLLOW_WINDOW_METERS = 120_000
const FOLLOW_WINDOW_RATIO = 0.12
const FOLLOW_WINDOW_BACKWARD_RATIO = 0.45
const FOLLOW_WINDOW_FORWARD_RATIO = 0.55

export function toRouteSegments(
  input: RouteSegment | RouteSegment[],
): RouteSegment[] {
  if (input.length === 0) return []

  const first = input[0]
  if (isRouteCoordinate(first)) {
    return [(input as RouteSegment).filter(isRouteCoordinate)]
  }

  return (input as RouteSegment[]).map((segment) =>
    segment.filter(isRouteCoordinate),
  )
}

export function flattenRouteSegments(
  segments: RouteSegment | RouteSegment[],
): RouteSegment {
  return toRouteSegments(segments).flat()
}

export function buildDistanceTable(
  route: RouteSegment | RouteSegment[],
): DistanceTable {
  const segments = toRouteSegments(route)
  let totalDistance = 0
  const tables: SegmentDistanceTable[] = []

  for (const segment of segments) {
    if (segment.length < 2) continue

    const cumulative = [totalDistance]
    const startDistance = totalDistance
    for (let i = 1; i < segment.length; i++) {
      totalDistance += distanceMeters(segment[i - 1]!, segment[i]!)
      cumulative.push(totalDistance)
    }

    tables.push({
      cumulative,
      endDistance: totalDistance,
      segment,
      startDistance,
    })
  }

  return { segments: tables, totalDistance }
}

export function totalDistanceOf(route: RouteSegment | RouteSegment[]): number {
  return buildDistanceTable(route).totalDistance
}

export function sliceRouteAtDistance(
  route: RouteSegment | RouteSegment[],
  distance: number,
  distanceTable = buildDistanceTable(route),
): RouteSegment[] {
  if (distance <= 0) return []
  if (distance >= distanceTable.totalDistance) return toRouteSegments(route)

  const result: RouteSegment[] = []
  for (const segmentTable of distanceTable.segments) {
    if (distance <= segmentTable.startDistance) break
    if (distance >= segmentTable.endDistance) {
      result.push(segmentTable.segment)
      continue
    }

    const partial = sliceSegmentAtDistance(segmentTable, distance)
    if (partial.length > 0) result.push(partial)
    break
  }

  return result
}

export function stopsBeforeDistance(
  stops: MapTrackStop[],
  route: RouteSegment | RouteSegment[],
  distance: number,
): MapTrackStop[] {
  const table = buildDistanceTable(route)

  return stops.filter(
    (stop) => nearestRouteDistance(table, [stop.lon, stop.lat]) <= distance,
  )
}

export function resolveTimelinePhase(
  timeSec: number,
  durationSec: TrackVideoDurationSec,
): TimelinePhase {
  const establishSec = clamp(durationSec * 0.1, 0.4, 0.8)
  const returnSec = clamp(durationSec * 0.1333333333, 0.6, 1.2)
  const holdSec = clamp(durationSec * 0.1, 0.4, 1)
  const revealSec = Math.max(
    0.1,
    durationSec - establishSec - returnSec - holdSec,
  )

  const safeTime = clamp(timeSec, 0, durationSec)
  const revealStart = establishSec
  const returnStart = establishSec + revealSec
  const holdStart = returnStart + returnSec

  if (safeTime < revealStart) {
    return {
      kind: 'establish',
      localProgress: progressBetween(safeTime, 0, establishSec),
      revealProgress: 0,
    }
  }

  if (safeTime < returnStart) {
    const localProgress = progressBetween(safeTime, revealStart, returnStart)
    return {
      kind: 'reveal',
      localProgress,
      revealProgress: easeOutCubic(localProgress),
    }
  }

  if (safeTime < holdStart) {
    return {
      kind: 'return',
      localProgress: progressBetween(safeTime, returnStart, holdStart),
      revealProgress: 1,
    }
  }

  return {
    kind: 'hold',
    localProgress: progressBetween(safeTime, holdStart, durationSec),
    revealProgress: 1,
  }
}

export function resolveVideoCameraBounds({
  cameraMode,
  coords,
  distanceTable,
  phase,
  pois,
  revealDistance,
  stops,
}: ResolveVideoCameraBoundsInput): VideoCameraBounds {
  const segments = toRouteSegments(coords)
  if (cameraMode === 'overview' || phase.kind !== 'reveal') {
    return {
      bounds: fullOverviewBounds(segments, stops, pois),
      kind: 'overview',
    }
  }

  const activeSegment = activeSegmentAtDistance(distanceTable, revealDistance)
  if (!activeSegment) {
    return {
      bounds: fullOverviewBounds(segments, stops, pois),
      kind: 'overview',
    }
  }

  const windowDistance = clamp(
    distanceTable.totalDistance * FOLLOW_WINDOW_RATIO,
    MIN_FOLLOW_WINDOW_METERS,
    MAX_FOLLOW_WINDOW_METERS,
  )
  const startDistance = Math.max(
    activeSegment.startDistance,
    revealDistance - windowDistance * FOLLOW_WINDOW_BACKWARD_RATIO,
  )
  const endDistance = Math.min(
    activeSegment.endDistance,
    revealDistance + windowDistance * FOLLOW_WINDOW_FORWARD_RATIO,
  )
  const windowCoords = segmentWindowAtDistance(
    activeSegment,
    startDistance,
    endDistance,
  )

  return {
    bounds: boundsFromCoords(
      windowCoords.length > 0 ? windowCoords : activeSegment.segment,
    ),
    kind: 'follow',
  }
}

function fullOverviewBounds(
  segments: RouteSegment[],
  stops: MapTrackStop[],
  pois: MapPoi[],
): [[number, number], [number, number]] {
  const all: RouteSegment = flattenRouteSegments(segments)

  for (const stop of stops) {
    if (Number.isFinite(stop.lat) && Number.isFinite(stop.lon)) {
      all.push([stop.lon, stop.lat])
    }
  }

  for (const poi of pois) {
    if (Number.isFinite(poi.lat) && Number.isFinite(poi.lon)) {
      all.push([poi.lon, poi.lat])
    }
  }

  return boundsFromCoords(all)
}

function sliceSegmentAtDistance(
  segmentTable: SegmentDistanceTable,
  distance: number,
): RouteSegment {
  const { cumulative, segment } = segmentTable
  if (distance <= segmentTable.startDistance) return []
  if (distance >= segmentTable.endDistance) return segment

  const segmentIndex = findSegmentIndex(cumulative, distance)
  const head = segment.slice(0, segmentIndex + 1)
  const headPoint = coordAtDistance(segmentTable, distance)
  if (headPoint) head.push(headPoint)
  return dedupeConsecutiveCoords(head)
}

function segmentWindowAtDistance(
  segmentTable: SegmentDistanceTable,
  startDistance: number,
  endDistance: number,
): RouteSegment {
  if (endDistance <= startDistance) return []
  if (
    startDistance <= segmentTable.startDistance &&
    endDistance >= segmentTable.endDistance
  ) {
    return segmentTable.segment
  }

  const { cumulative, segment } = segmentTable
  const result: RouteSegment = []
  const startCoord = coordAtDistance(segmentTable, startDistance)
  if (startCoord) result.push(startCoord)

  for (let i = 0; i < segment.length; i++) {
    const pointDistance = cumulative[i] ?? 0
    if (pointDistance > startDistance && pointDistance < endDistance) {
      result.push(segment[i]!)
    }
  }

  const endCoord = coordAtDistance(segmentTable, endDistance)
  if (endCoord) result.push(endCoord)

  return dedupeConsecutiveCoords(result)
}

function activeSegmentAtDistance(
  distanceTable: DistanceTable,
  distance: number,
) {
  for (const segment of distanceTable.segments) {
    if (distance <= segment.endDistance) return segment
  }
  return distanceTable.segments.at(-1) ?? null
}

function nearestRouteDistance(
  distanceTable: DistanceTable,
  point: RouteCoordinate,
): number {
  let bestDistance = 0
  let bestError = Infinity

  for (const segmentTable of distanceTable.segments) {
    const { cumulative, segment } = segmentTable
    for (let i = 0; i < segment.length - 1; i++) {
      const start = segment[i]!
      const end = segment[i + 1]!
      const projection = projectPointToSegment(point, start, end)
      if (projection.error < bestError) {
        const segmentDistance = (cumulative[i + 1] ?? 0) - (cumulative[i] ?? 0)
        bestError = projection.error
        bestDistance =
          (cumulative[i] ?? 0) + segmentDistance * projection.progress
      }
    }
  }

  return bestDistance
}

function projectPointToSegment(
  point: RouteCoordinate,
  start: RouteCoordinate,
  end: RouteCoordinate,
): { error: number; progress: number } {
  const latRef = point[1]
  const p = projectMeters(point, latRef)
  const a = projectMeters(start, latRef)
  const b = projectMeters(end, latRef)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const denom = dx * dx + dy * dy
  const progress =
    denom > 0 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / denom, 0, 1) : 0
  const projected = {
    x: a.x + dx * progress,
    y: a.y + dy * progress,
  }

  return {
    error: Math.hypot(p.x - projected.x, p.y - projected.y),
    progress,
  }
}

function coordAtDistance(
  segmentTable: SegmentDistanceTable,
  distance: number,
): RouteCoordinate | null {
  const safeDistance = clamp(
    distance,
    segmentTable.startDistance,
    segmentTable.endDistance,
  )
  const { cumulative, segment } = segmentTable
  if (safeDistance <= segmentTable.startDistance) return segment[0] ?? null
  if (safeDistance >= segmentTable.endDistance) return segment.at(-1) ?? null

  const segmentIndex = findSegmentIndex(cumulative, safeDistance)
  const startDistance = cumulative[segmentIndex] ?? 0
  const endDistance = cumulative[segmentIndex + 1] ?? 0
  const segmentDistance = endDistance - startDistance
  const segmentProgress =
    segmentDistance > 0 ? (safeDistance - startDistance) / segmentDistance : 0

  return interpolateCoord(
    segment[segmentIndex]!,
    segment[segmentIndex + 1]!,
    segmentProgress,
  )
}

function projectMeters(coord: RouteCoordinate, latRef: number) {
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLon = Math.cos(toRad(latRef)) * 111_320
  return {
    x: coord[0] * metersPerDegreeLon,
    y: coord[1] * metersPerDegreeLat,
  }
}

function boundsFromCoords(
  coords: RouteSegment,
): [[number, number], [number, number]] {
  const fallback: [[number, number], [number, number]] = [
    [0, 0],
    [0.001, 0.001],
  ]
  if (coords.length === 0) return fallback

  let [minLon, minLat] = coords[0]!
  let [maxLon, maxLat] = coords[0]!

  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  const lonPad = minLon === maxLon ? 0.0005 : 0
  const latPad = minLat === maxLat ? 0.0005 : 0

  return [
    [minLon - lonPad, minLat - latPad],
    [maxLon + lonPad, maxLat + latPad],
  ]
}

function findSegmentIndex(cumulative: number[], distance: number): number {
  for (let i = 0; i < cumulative.length - 1; i++) {
    if (distance <= cumulative[i + 1]!) return i
  }
  return Math.max(0, cumulative.length - 2)
}

function interpolateCoord(
  start: RouteCoordinate,
  end: RouteCoordinate,
  progress: number,
): RouteCoordinate {
  const t = clamp(progress, 0, 1)
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ]
}

function dedupeConsecutiveCoords(coords: RouteSegment): RouteSegment {
  const result: RouteSegment = []
  for (const coord of coords) {
    const previous = result.at(-1)
    if (previous && previous[0] === coord[0] && previous[1] === coord[1]) {
      continue
    }
    result.push(coord)
  }
  return result
}

function isRouteCoordinate(value: unknown): value is RouteCoordinate {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function distanceMeters(a: RouteCoordinate, b: RouteCoordinate): number {
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3
}

function progressBetween(value: number, start: number, end: number): number {
  if (end <= start) return 1
  return clamp((value - start) / (end - start), 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toRad(value: number) {
  return (value * Math.PI) / 180
}
