import type { MapTrackData } from '~/components/ui/map-block'
import type { MapTrackPointTuple } from '~/components/ui/map-block/types'

const DAY = 86_400_000
const START = Date.UTC(2026, 9, 2, 0, 30)

function route(
  from: [number, number],
  to: [number, number],
  steps = 40,
): MapTrackPointTuple[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const wiggle = Math.sin(t * Math.PI * 6) * 0.004
    return [
      from[0] + (to[0] - from[0]) * t + wiggle,
      from[1] + (to[1] - from[1]) * t - wiggle,
      null,
    ]
  })
}

const KYOTO: [number, number] = [35.0116, 135.7681]
const UJI: [number, number] = [34.8844, 135.7998]
const NARA: [number, number] = [34.6851, 135.8048]
const OSAKA: [number, number] = [34.6937, 135.5023]
const KOBE: [number, number] = [34.6901, 135.1955]

const segments = [
  route(KYOTO, UJI),
  route([UJI[0] - 0.03, UJI[1] + 0.01], NARA),
  route(NARA, OSAKA),
  route(OSAKA, KOBE),
]

export const LEGS_SAMPLE_TRACK: MapTrackData = {
  distanceMeters: 118_400,
  endTimeMs: START + 2 * DAY + 6 * 3_600_000,
  legs: [
    {
      distanceMeters: 44_100,
      endTimeMs: START + 7 * 3_600_000,
      segments: [0, 2],
      startTimeMs: START,
      title: 'Kyoto → Nara',
    },
    {
      distanceMeters: 34_800,
      endTimeMs: START + DAY + 6 * 3_600_000,
      segments: [2, 3],
      startTimeMs: START + DAY,
      title: 'Nara → Osaka',
    },
    {
      distanceMeters: 39_500,
      endTimeMs: START + 2 * DAY + 6 * 3_600_000,
      segments: [3, 4],
      startTimeMs: START + 2 * DAY,
      title: 'Osaka → Kobe',
    },
  ],
  points: segments.flat(),
  segments,
  startTimeMs: START,
  stops: [
    {
      durationSec: 1800,
      lat: UJI[0],
      lon: UJI[1],
      time: new Date(START + 2 * 3_600_000).toISOString(),
    },
    {
      durationSec: 2400,
      lat: NARA[0],
      lon: NARA[1],
      time: new Date(START + 6 * 3_600_000).toISOString(),
    },
    {
      durationSec: 1500,
      lat: OSAKA[0],
      lon: OSAKA[1],
      time: new Date(START + DAY + 5 * 3_600_000).toISOString(),
    },
  ],
  timezoneOffsetMinutes: 540,
  title: 'Kansai by bike',
  version: 1,
}
