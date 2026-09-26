import { describe, expect, it } from 'vitest'

import {
  buildDistanceTable,
  resolveTimelinePhase,
  resolveVideoCameraBounds,
  sliceRouteAtDistance,
  stopsBeforeDistance,
  totalDistanceOf,
} from './map-block-video-timeline'

describe('map-block-video-timeline', () => {
  const route: Array<[number, number]> = [
    [0, 0],
    [0.01, 0],
    [0.02, 0],
  ]

  it('uses cumulative distance independent of point count', () => {
    const dense: Array<[number, number]> = [
      [0, 0],
      [0.002, 0],
      [0.004, 0],
      [0.006, 0],
      [0.008, 0],
      [0.01, 0],
    ]
    const sparse: Array<[number, number]> = [
      [0, 0],
      [0.01, 0],
    ]

    expect(totalDistanceOf(dense)).toBeCloseTo(totalDistanceOf(sparse), 0)
  })

  it('slices a route with an interpolated head point', () => {
    const table = buildDistanceTable(route)
    const sliced = sliceRouteAtDistance(route, table.totalDistance / 2, table)

    expect(sliced).toHaveLength(1)
    expect(sliced[0]).toHaveLength(2)
    expect(sliced[0]?.at(-1)?.[0]).toBeCloseTo(0.01, 4)
  })

  it('does not count disconnected segment gaps as route distance', () => {
    const segmentedRoute: Array<Array<[number, number]>> = [
      [
        [0, 0],
        [0.01, 0],
      ],
      [
        [10, 10],
        [10.01, 10],
      ],
    ]

    expect(totalDistanceOf(segmentedRoute.flat())).toBeGreaterThan(
      totalDistanceOf(segmentedRoute) * 100,
    )
  })

  it('slices disconnected routes without joining segments', () => {
    const segmentedRoute: Array<Array<[number, number]>> = [
      [
        [0, 0],
        [0.01, 0],
      ],
      [
        [10, 10],
        [10.01, 10],
      ],
    ]
    const table = buildDistanceTable(segmentedRoute)
    const sliced = sliceRouteAtDistance(
      segmentedRoute,
      table.totalDistance * 0.75,
      table,
    )

    expect(sliced).toHaveLength(2)
    expect(sliced[0]).toEqual(segmentedRoute[0])
    expect(sliced[1]?.[0]).toEqual([10, 10])
  })

  it('reveals stops only after the route head reaches them', () => {
    const table = buildDistanceTable(route)
    const stops = [
      { durationSec: 600, lat: 0, lon: 0.005 },
      { durationSec: 600, lat: 0, lon: 0.019 },
    ]

    expect(
      stopsBeforeDistance(stops, route, table.totalDistance * 0.5),
    ).toHaveLength(1)
  })

  it('reserves return and hold phases after reveal', () => {
    expect(resolveTimelinePhase(0.2, 6).kind).toBe('establish')
    expect(resolveTimelinePhase(2, 6).kind).toBe('reveal')
    expect(resolveTimelinePhase(5, 6).kind).toBe('return')
    expect(resolveTimelinePhase(5.8, 6).kind).toBe('hold')
  })

  it('uses overview bounds in overview mode', () => {
    const table = buildDistanceTable(route)
    const phase = resolveTimelinePhase(2, 6)

    expect(
      resolveVideoCameraBounds({
        cameraMode: 'overview',
        coords: route,
        distanceTable: table,
        phase,
        pois: [],
        revealDistance: table.totalDistance / 2,
        stops: [],
      }).kind,
    ).toBe('overview')
  })

  it('uses a follow window during auto-follow reveal', () => {
    const longRoute: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]
    const table = buildDistanceTable(longRoute)
    const phase = resolveTimelinePhase(2, 6)
    const camera = resolveVideoCameraBounds({
      cameraMode: 'auto-follow',
      coords: longRoute,
      distanceTable: table,
      phase,
      pois: [],
      revealDistance: table.totalDistance / 2,
      stops: [],
    })

    expect(camera.kind).toBe('follow')
    expect(camera.bounds[0][0]).toBeGreaterThan(0)
    expect(camera.bounds[1][0]).toBeLessThan(3)
  })
})
