import type {
  MapTrackData,
  MapTrackStop,
} from '~/components/ui/map-block/types'

export interface RawPoint {
  ele: number | null
  lat: number
  lon: number
  timeMs: number | null
}

export interface GpxToTrackOptions {
  fileName?: string
  targetPoints?: number
}

export function gpxToMapTrack(
  text: string,
  options: GpxToTrackOptions = {},
): MapTrackData {
  const { points, timezoneOffsetMinutes } = parseGpx(text)
  if (points.length < 2) {
    throw new Error(`Need at least 2 points, got ${points.length}`)
  }

  const ordered = orderTrackPoints(points)
  const segments = splitTrackSegments(ordered)
  const sampledSegments =
    options.targetPoints && options.targetPoints > 0
      ? simplifySegmentsToTarget(segments, options.targetPoints)
      : segments
  const sampled = sampledSegments.flat()

  const stops = detectStops(ordered)
  const startTimeMs = firstFinite(ordered.map((p) => p.timeMs))
  const endTimeMs = lastFinite(ordered.map((p) => p.timeMs))

  return {
    bounds: getBounds(sampled),
    distanceMeters: Math.round(totalDistanceSegments(segments)),
    ...(Number.isFinite(endTimeMs) && { endTimeMs: endTimeMs ?? undefined }),
    originalCount: ordered.length,
    points: sampled.map((point) => [
      round(point.lat, 7),
      round(point.lon, 7),
      point.ele === null ? null : round(point.ele, 1),
    ]),
    sampledCount: sampled.length,
    segments: sampledSegments.map((segment) =>
      segment.map((point) => [
        round(point.lat, 7),
        round(point.lon, 7),
        point.ele === null ? null : round(point.ele, 1),
      ]),
    ),
    ...(Number.isFinite(startTimeMs) && {
      startTimeMs: startTimeMs ?? undefined,
    }),
    ...(stops.length > 0 && { stops }),
    ...(typeof timezoneOffsetMinutes === 'number' && {
      timezoneOffsetMinutes,
    }),
    title: options.fileName?.replace(/\.[^.]+$/, '') ?? 'GPX track',
    version: 1,
  }
}

function parseGpx(text: string): {
  points: RawPoint[]
  timezoneOffsetMinutes: number | null
} {
  if (typeof DOMParser === 'undefined') {
    throw new TypeError(
      'DOMParser is not available; gpxToMapTrack must run in the browser',
    )
  }

  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid GPX: XML parse error')
  }

  const points: RawPoint[] = []
  const trkpts = doc.getElementsByTagName('trkpt')
  for (let i = 0; i < trkpts.length; i++) {
    const el = trkpts[i]!
    const lat = Number(el.getAttribute('lat'))
    const lon = Number(el.getAttribute('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const eleNode = el.getElementsByTagName('ele')[0]
    const ele = eleNode ? Number(eleNode.textContent) : Number.NaN
    const timeNode = el.getElementsByTagName('time')[0]
    const timeMs = timeNode
      ? Date.parse(timeNode.textContent ?? '')
      : Number.NaN
    points.push({
      ele: Number.isFinite(ele) ? ele : null,
      lat,
      lon,
      timeMs: Number.isFinite(timeMs) ? timeMs : null,
    })
  }

  let timezoneOffsetMinutes: number | null = null
  const all = doc.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!
    if (el.localName === 'timezone' && el.hasAttribute('offset')) {
      const v = Number(el.getAttribute('offset'))
      if (Number.isFinite(v)) timezoneOffsetMinutes = v
      break
    }
  }

  return { points, timezoneOffsetMinutes }
}

export function orderTrackPoints(points: RawPoint[]): RawPoint[] {
  if (points.length < 2) return points

  const timedPoints = points.filter((point) => Number.isFinite(point.timeMs))
  if (timedPoints.length !== points.length) return points

  let hasInversion = false
  for (let i = 1; i < points.length; i++) {
    if ((points[i]!.timeMs ?? 0) < (points[i - 1]!.timeMs ?? 0)) {
      hasInversion = true
      break
    }
  }

  if (!hasInversion) return points
  return [...points].sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0))
}

export function splitTrackSegments(
  points: RawPoint[],
  {
    breakDistanceMeters = 3_000,
    breakGapSec = 1_800,
  }: {
    breakDistanceMeters?: number
    breakGapSec?: number
  } = {},
): RawPoint[][] {
  if (points.length === 0) return []

  const segments: RawPoint[][] = [[points[0]!]]

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!
    const current = points[i]!
    const dtSec =
      Number.isFinite(previous.timeMs) && Number.isFinite(current.timeMs)
        ? ((current.timeMs ?? 0) - (previous.timeMs ?? 0)) / 1000
        : 0
    const shouldBreak =
      dtSec < 0 ||
      (dtSec >= breakGapSec &&
        distanceMeters(previous, current) >= breakDistanceMeters)

    if (shouldBreak) {
      segments.push([current])
    } else {
      segments.at(-1)!.push(current)
    }
  }

  return segments.filter((segment) => segment.length > 0)
}

function simplifySegmentsToTarget(
  segments: RawPoint[][],
  target: number,
): RawPoint[][] {
  const totalPoints = segments.reduce(
    (count, segment) => count + segment.length,
    0,
  )
  if (totalPoints <= target) return segments

  const points = segments.flat()
  let low = 0
  let high = (getBounds(points).diagonalMeters ?? 1) / 12
  let best = segments

  for (let i = 0; i < 28; i++) {
    const tolerance = (low + high) / 2
    const simplified = segments.map((segment) =>
      simplifyRdp(segment, tolerance),
    )
    const simplifiedCount = simplified.reduce(
      (count, segment) => count + segment.length,
      0,
    )
    if (simplifiedCount > target) {
      low = tolerance
    } else {
      best = simplified
      high = tolerance
    }
  }

  return best
}

function simplifyRdp(points: RawPoint[], toleranceMeters: number): RawPoint[] {
  if (points.length < 3) return points

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  simplifyRange(points, 0, points.length - 1, toleranceMeters, keep)
  return points.filter((_, index) => keep[index])
}

function simplifyRange(
  points: RawPoint[],
  first: number,
  last: number,
  toleranceMeters: number,
  keep: Uint8Array,
): void {
  let maxDistance = 0
  let index = first

  for (let i = first + 1; i < last; i++) {
    const distance = pointLineDistance(
      points[i]!,
      points[first]!,
      points[last]!,
    )
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  if (maxDistance <= toleranceMeters) return
  keep[index] = 1
  simplifyRange(points, first, index, toleranceMeters, keep)
  simplifyRange(points, index, last, toleranceMeters, keep)
}

function pointLineDistance(
  point: RawPoint,
  start: RawPoint,
  end: RawPoint,
): number {
  const p = projectMeters(point, point.lat)
  const a = projectMeters(start, point.lat)
  const b = projectMeters(end, point.lat)
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return distanceMeters(point, start)
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
  )
  const projection = { x: a.x + t * dx, y: a.y + t * dy }
  return Math.hypot(p.x - projection.x, p.y - projection.y)
}

function projectMeters(
  point: { lat: number; lon: number },
  latRef: number,
): { x: number; y: number } {
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLon = Math.cos((latRef * Math.PI) / 180) * 111_320
  return {
    x: point.lon * metersPerDegreeLon,
    y: point.lat * metersPerDegreeLat,
  }
}

interface DwellCandidate {
  durationSec: number
  lat: number
  lon: number
  startMs: number
}

interface ClusterCandidate extends DwellCandidate {
  visits: number
}

function detectStops(
  points: RawPoint[],
  {
    clusterRadiusM = 80,
    minDwellSec = 60,
    minMergedSec = 600,
    speedThresholdMps = 0.5,
  }: {
    clusterRadiusM?: number
    minDwellSec?: number
    minMergedSec?: number
    speedThresholdMps?: number
  } = {},
): MapTrackStop[] {
  const withTime = points.filter((p): p is RawPoint & { timeMs: number } =>
    Number.isFinite(p.timeMs),
  )
  if (withTime.length < 3) return []

  const dwells: DwellCandidate[] = []
  let runStart: number | null = null

  for (let i = 1; i < withTime.length; i++) {
    const dtSec = (withTime[i]!.timeMs - withTime[i - 1]!.timeMs) / 1000
    const dM = distanceMeters(withTime[i - 1]!, withTime[i]!)
    const speed = dtSec > 0 ? dM / dtSec : 0
    if (speed <= speedThresholdMps) {
      if (runStart === null) runStart = i - 1
    } else if (runStart !== null) {
      pushDwell(withTime, runStart, i - 1, minDwellSec, dwells)
      runStart = null
    }
  }
  if (runStart !== null) {
    pushDwell(withTime, runStart, withTime.length - 1, minDwellSec, dwells)
  }

  const clusters: ClusterCandidate[] = []
  for (const d of dwells) {
    const hit = clusters.find((c) => distanceMeters(c, d) < clusterRadiusM)
    if (hit) {
      hit.durationSec += d.durationSec
      hit.visits += 1
      if (d.startMs < hit.startMs) hit.startMs = d.startMs
    } else {
      clusters.push({ ...d, visits: 1 })
    }
  }

  return clusters
    .filter((c) => c.durationSec >= minMergedSec)
    .sort((a, b) => a.startMs - b.startMs)
    .map((c) => ({
      durationSec: Math.round(c.durationSec),
      lat: round(c.lat, 6),
      lon: round(c.lon, 6),
      time: new Date(c.startMs).toISOString(),
      visits: c.visits,
    }))
}

function pushDwell(
  points: Array<RawPoint & { timeMs: number }>,
  startIdx: number,
  endIdx: number,
  minDwellSec: number,
  out: DwellCandidate[],
): void {
  const dur = (points[endIdx]!.timeMs - points[startIdx]!.timeMs) / 1000
  if (dur < minDwellSec) return
  out.push({
    durationSec: dur,
    lat: (points[startIdx]!.lat + points[endIdx]!.lat) / 2,
    lon: (points[startIdx]!.lon + points[endIdx]!.lon) / 2,
    startMs: points[startIdx]!.timeMs,
  })
}

function totalDistance(points: RawPoint[]): number {
  let distance = 0
  for (let i = 1; i < points.length; i++) {
    distance += distanceMeters(points[i - 1]!, points[i]!)
  }
  return distance
}

function totalDistanceSegments(segments: RawPoint[][]): number {
  return segments.reduce(
    (distance, segment) => distance + totalDistance(segment),
    0,
  )
}

function distanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const earthRadius = 6_371_000
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(h))
}

function getBounds(points: RawPoint[]): {
  diagonalMeters: number
  maxLat: number
  maxLon: number
  minLat: number
  minLon: number
} {
  const first = points[0]!
  const bounds = points.reduce(
    (acc, point) => ({
      maxLat: Math.max(acc.maxLat, point.lat),
      maxLon: Math.max(acc.maxLon, point.lon),
      minLat: Math.min(acc.minLat, point.lat),
      minLon: Math.min(acc.minLon, point.lon),
    }),
    {
      maxLat: first.lat,
      maxLon: first.lon,
      minLat: first.lat,
      minLon: first.lon,
    },
  )

  return {
    diagonalMeters: Math.round(
      distanceMeters(
        { lat: bounds.minLat, lon: bounds.minLon },
        { lat: bounds.maxLat, lon: bounds.maxLon },
      ),
    ),
    maxLat: round(bounds.maxLat, 7),
    maxLon: round(bounds.maxLon, 7),
    minLat: round(bounds.minLat, 7),
    minLon: round(bounds.minLon, 7),
  }
}

function firstFinite(values: Array<number | null>): number | null {
  for (const v of values) if (v !== null && Number.isFinite(v)) return v
  return null
}

function lastFinite(values: Array<number | null>): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i]
    if (v !== null && v !== undefined && Number.isFinite(v)) return v
  }
  return null
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}
