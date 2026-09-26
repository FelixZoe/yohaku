import { describe, expect, it } from 'vitest'

import { resolveLegs } from './map-block-legs'
import type { MapTrackData } from './types'

const T0 = Date.UTC(2026, 9, 2)
const DAY = 86_400_000

const track: MapTrackData = {
  legs: [
    {
      endTimeMs: T0 + 3_600_000,
      segments: [0, 2],
      startTimeMs: T0,
      title: 'Day 1',
    },
    {
      endTimeMs: T0 + DAY + 3_600_000,
      segments: [2, 3],
      startTimeMs: T0 + DAY,
      title: 'Day 2',
    },
  ],
  points: [],
  segments: [
    [
      [35, 135],
      [35.1, 135],
    ],
    [
      [35.2, 135],
      [35.3, 135],
    ],
    [
      [34.7, 135],
      [34.8, 135],
    ],
  ],
}

const stops = [
  {
    durationSec: 900,
    lat: 35,
    lon: 135,
    time: new Date(T0 + 600_000).toISOString(),
  },
  {
    durationSec: 900,
    lat: 34.7,
    lon: 135,
    time: new Date(T0 + DAY + 600_000).toISOString(),
  },
  { durationSec: 900, lat: 34.7, lon: 135 },
]

describe('resolveLegs', () => {
  it('slices segments per leg in [lon, lat] order', () => {
    const legs = resolveLegs(track, stops)
    expect(legs.map((leg) => leg.routeSegments.length)).toEqual([2, 1])
    expect(legs[1]!.routeSegments[0]![0]).toEqual([135, 34.7])
  })

  it('assigns timed stops by leg window and untimed stops to every leg', () => {
    const legs = resolveLegs(track, stops)
    expect(legs.map((leg) => leg.stops.length)).toEqual([2, 2])
  })

  it('drops invalid ranges and needs two valid legs', () => {
    expect(
      resolveLegs(
        {
          ...track,
          legs: [track.legs![0]!, { segments: [2, 9], title: 'Bad' }],
        },
        stops,
      ),
    ).toEqual([])
    expect(resolveLegs({ ...track, legs: undefined }, stops)).toEqual([])
  })
})
