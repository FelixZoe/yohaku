#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { XMLParser } from 'fast-xml-parser'

const xmlParser = new XMLParser({
  attributeNamePrefix: '@_',
  ignoreAttributes: false,
  isArray: (name) =>
    name === 'trk' || name === 'trkseg' || name === 'trkpt',
})

const [, , inputPath, outputPath, targetArg = '450'] = process.argv

if (!inputPath || !outputPath) {
  console.error(
    'Usage: node scripts/compress-gps-track.mjs <input.gpx|geojson|json> <output.json> [targetPoints]',
  )
  process.exit(1)
}

const targetPoints = Number.parseInt(targetArg, 10)
const source = await readFile(inputPath, 'utf8')
const { points, timezoneOffsetMinutes } = parseTrack(source, inputPath)

if (points.length < 2) {
  throw new Error(`Need at least 2 points, got ${points.length}`)
}

const sampled = simplifyToTarget(points, Number.isFinite(targetPoints) ? targetPoints : 450)
const stops = detectStops(points)
const startTimeMs = firstFinite(points.map((p) => p.timeMs))
const endTimeMs = lastFinite(points.map((p) => p.timeMs))
const payload = {
  bounds: getBounds(sampled),
  distanceMeters: Math.round(totalDistance(points)),
  ...(Number.isFinite(endTimeMs) && { endTimeMs }),
  originalCount: points.length,
  points: sampled.map((point) => [
    round(point.lat, 7),
    round(point.lon, 7),
    point.ele == null ? null : round(point.ele, 1),
  ]),
  sampledCount: sampled.length,
  ...(Number.isFinite(startTimeMs) && { startTimeMs }),
  ...(stops.length > 0 && { stops }),
  ...(typeof timezoneOffsetMinutes === 'number' && { timezoneOffsetMinutes }),
  title: path.basename(inputPath).replace(/\.[^.]+$/, ''),
  version: 1,
}

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload)}\n`)

console.log(
  `Compressed ${points.length} -> ${sampled.length} points (${stops.length} stops), ${source.length} -> ${JSON.stringify(payload).length} chars`,
)

function parseTrack(text, filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.gpx' || text.trimStart().startsWith('<')) {
    return parseGpx(text)
  }

  const json = JSON.parse(text)
  let points
  if (json.type === 'FeatureCollection' || json.type === 'Feature') {
    points = parseGeoJson(json)
  } else if (Array.isArray(json.points)) {
    points = json.points.map(tupleToPoint).filter(Boolean)
  } else if (Array.isArray(json)) {
    points = json.map(tupleToPoint).filter(Boolean)
  } else {
    throw new Error(`Unsupported track format: ${filename}`)
  }
  return { points, timezoneOffsetMinutes: null }
}

function parseGpx(text) {
  const root = xmlParser.parse(text)
  const gpx = root?.gpx
  if (!gpx) return { points: [], timezoneOffsetMinutes: null }

  const points = []
  for (const trk of toArray(gpx.trk)) {
    for (const seg of toArray(trk?.trkseg)) {
      for (const pt of toArray(seg?.trkpt)) {
        if (!pt) continue
        const lat = Number(pt['@_lat'])
        const lon = Number(pt['@_lon'])
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
        const ele = pt.ele == null ? Number.NaN : Number(pt.ele)
        const timeMs = pt.time ? Date.parse(String(pt.time)) : Number.NaN
        points.push({
          ele: Number.isFinite(ele) ? ele : null,
          lat,
          lon,
          timeMs: Number.isFinite(timeMs) ? timeMs : null,
        })
      }
    }
  }

  const tz = gpx.metadata?.['mytracks:timezone']
  const offset = tz ? Number(tz['@_offset']) : Number.NaN
  return {
    points,
    timezoneOffsetMinutes: Number.isFinite(offset) ? offset : null,
  }
}

function toArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function firstFinite(values) {
  for (const v of values) if (Number.isFinite(v)) return v
  return null
}

function lastFinite(values) {
  for (let i = values.length - 1; i >= 0; i--) {
    if (Number.isFinite(values[i])) return values[i]
  }
  return null
}

function parseGeoJson(json) {
  const points = []
  const features = json.type === 'FeatureCollection' ? json.features : [json]

  for (const feature of features) {
    const geometry = feature.type === 'Feature' ? feature.geometry : feature
    if (!geometry) continue
    collectGeoJsonCoordinates(geometry, points)
  }

  return points
}

function collectGeoJsonCoordinates(geometry, points) {
  if (geometry.type === 'LineString') {
    for (const tuple of geometry.coordinates) {
      const point = tupleToPoint(tuple, true)
      if (point) points.push(point)
    }
    return
  }
  if (geometry.type === 'MultiLineString') {
    for (const line of geometry.coordinates) {
      for (const tuple of line) {
        const point = tupleToPoint(tuple, true)
        if (point) points.push(point)
      }
    }
  }
}

function tupleToPoint(value, lonLat = false) {
  if (!Array.isArray(value) || value.length < 2) return null
  const lat = Number(lonLat ? value[1] : value[0])
  const lon = Number(lonLat ? value[0] : value[1])
  const ele = value[2] == null ? null : Number(value[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { ele: Number.isFinite(ele) ? ele : null, lat, lon }
}

function simplifyToTarget(points, target) {
  if (points.length <= target) return points

  let low = 0
  let high = getBounds(points).diagonalMeters / 12
  let best = points

  for (let i = 0; i < 28; i++) {
    const tolerance = (low + high) / 2
    const simplified = simplifyRdp(points, tolerance)
    if (simplified.length > target) {
      low = tolerance
    } else {
      best = simplified
      high = tolerance
    }
  }

  return best
}

function simplifyRdp(points, toleranceMeters) {
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  simplifyRange(points, 0, points.length - 1, toleranceMeters, keep)
  return points.filter((_, index) => keep[index])
}

function simplifyRange(points, first, last, toleranceMeters, keep) {
  let maxDistance = 0
  let index = first

  for (let i = first + 1; i < last; i++) {
    const distance = pointLineDistance(points[i], points[first], points[last])
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

function pointLineDistance(point, start, end) {
  const origin = projectMeters(start, point.lat)
  const p = projectMeters(point, point.lat)
  const a = projectMeters(start, point.lat)
  const b = projectMeters(end, point.lat)
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return distanceMeters(point, start)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  const projection = { x: a.x + t * dx, y: a.y + t * dy }
  return Math.hypot(p.x - projection.x, p.y - projection.y) + origin.x * 0
}

function projectMeters(point, latRef) {
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLon = Math.cos((latRef * Math.PI) / 180) * 111_320
  return {
    x: point.lon * metersPerDegreeLon,
    y: point.lat * metersPerDegreeLat,
  }
}

function detectStops(
  points,
  {
    speedThresholdMps = 0.5,
    minDwellSec = 60,
    clusterRadiusM = 80,
    minMergedSec = 600,
  } = {},
) {
  const withTime = points.filter((p) => Number.isFinite(p.timeMs))
  if (withTime.length < 3) return []

  const dwells = []
  let runStart = null
  for (let i = 1; i < withTime.length; i++) {
    const dtSec = (withTime[i].timeMs - withTime[i - 1].timeMs) / 1000
    const dM = distanceMeters(withTime[i - 1], withTime[i])
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

  const clusters = []
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

function pushDwell(points, startIdx, endIdx, minDwellSec, out) {
  const dur = (points[endIdx].timeMs - points[startIdx].timeMs) / 1000
  if (dur < minDwellSec) return
  out.push({
    durationSec: dur,
    lat: (points[startIdx].lat + points[endIdx].lat) / 2,
    lon: (points[startIdx].lon + points[endIdx].lon) / 2,
    startMs: points[startIdx].timeMs,
  })
}

function totalDistance(points) {
  let distance = 0
  for (let i = 1; i < points.length; i++) {
    distance += distanceMeters(points[i - 1], points[i])
  }
  return distance
}

function distanceMeters(a, b) {
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

function getBounds(points) {
  const bounds = points.reduce(
    (acc, point) => ({
      maxLat: Math.max(acc.maxLat, point.lat),
      maxLon: Math.max(acc.maxLon, point.lon),
      minLat: Math.min(acc.minLat, point.lat),
      minLon: Math.min(acc.minLon, point.lon),
    }),
    {
      maxLat: points[0].lat,
      maxLon: points[0].lon,
      minLat: points[0].lat,
      minLon: points[0].lon,
    },
  )

  return {
    ...Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, round(value, 7)])),
    diagonalMeters: Math.round(
      distanceMeters(
        { lat: bounds.minLat, lon: bounds.minLon },
        { lat: bounds.maxLat, lon: bounds.maxLon },
      ),
    ),
  }
}

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toRad(value) {
  return (value * Math.PI) / 180
}
