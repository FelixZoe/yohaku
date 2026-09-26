import { describe, expect, it } from 'vitest'

import {
  orderTrackPoints,
  type RawPoint,
  splitTrackSegments,
} from './gpx-to-track.client'

describe('gpx-to-track.client', () => {
  it('orders fully timed GPX points chronologically', () => {
    const ordered = orderTrackPoints([
      point(35.77, 140.38, '2026-06-07T04:36:05Z'),
      point(35.7, 139.77, '2026-06-03T07:47:01Z'),
      point(35.69, 139.8, '2026-06-04T04:25:22Z'),
    ])

    expect(ordered.map((p) => p.timeMs)).toEqual(
      [...ordered].map((p) => p.timeMs).sort((a, b) => (a ?? 0) - (b ?? 0)),
    )
  })

  it('splits only significant moved gaps into separate route segments', () => {
    const segments = splitTrackSegments(
      [
        point(35.68, 139.76, '2026-06-01T08:00:00Z'),
        point(35.681, 139.761, '2026-06-01T08:01:00Z'),
        point(35.72, 139.81, '2026-06-01T08:40:00Z'),
        point(35.721, 139.811, '2026-06-01T08:41:00Z'),
        point(35.7211, 139.8111, '2026-06-02T08:41:00Z'),
      ],
      { breakDistanceMeters: 3_000, breakGapSec: 1_800 },
    )

    expect(segments).toHaveLength(2)
    expect(segments[0]).toHaveLength(2)
    expect(segments[1]).toHaveLength(3)
  })
})

function point(lat: number, lon: number, time: string): RawPoint {
  return {
    ele: null,
    lat,
    lon,
    timeMs: Date.parse(time),
  }
}
