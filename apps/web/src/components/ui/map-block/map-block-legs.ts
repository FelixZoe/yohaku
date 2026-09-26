import type { RouteSegment } from './map-block-layers'
import type { MapTrackData, MapTrackLeg, MapTrackStop } from './types'

export interface ResolvedLeg {
  distanceMeters?: number
  endTimeMs?: number
  routeSegments: RouteSegment[]
  startTimeMs?: number
  stops: MapTrackStop[]
  title: string
}

export function resolveLegs(
  track: MapTrackData | null,
  stops: MapTrackStop[],
): ResolvedLeg[] {
  const segments = track?.segments
  if (!segments || !Array.isArray(track?.legs)) return []

  const legs = track.legs.flatMap((leg): ResolvedLeg[] => {
    const [from, to] = Array.isArray(leg?.segments) ? leg.segments : []
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from! < 0 ||
      to! > segments.length ||
      from! >= to!
    ) {
      return []
    }
    return [
      {
        distanceMeters: leg.distanceMeters,
        endTimeMs: leg.endTimeMs,
        routeSegments: segments
          .slice(from, to)
          .map((segment) =>
            segment
              .map(([lat, lon]) => [lon, lat] as [number, number])
              .filter(
                ([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat),
              ),
          )
          .filter((segment) => segment.length > 0),
        startTimeMs: leg.startTimeMs,
        stops: stops.filter((stop) => stopInLeg(stop, leg)),
        title: typeof leg.title === 'string' ? leg.title : '',
      },
    ]
  })

  return legs.length > 1 ? legs : []
}

function stopInLeg(stop: MapTrackStop, leg: MapTrackLeg) {
  if (!stop.time) return true
  if (typeof leg.startTimeMs !== 'number' || typeof leg.endTimeMs !== 'number')
    return true
  const time = Date.parse(stop.time)
  if (!Number.isFinite(time)) return true
  return time >= leg.startTimeMs && time <= leg.endTimeMs
}
