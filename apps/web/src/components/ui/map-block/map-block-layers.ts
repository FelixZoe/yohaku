import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

import type { MapPoi, MapTrackStop } from './types'

export type RouteCoordinate = [number, number]
export type RouteSegment = RouteCoordinate[]

export const ROUTE_SOURCE = 'map-block-route'
export const ROUTE_LAYER_CASING = 'map-block-route-casing'
export const ROUTE_LAYER = 'map-block-route-line'
export const ROUTE_FOCUS_SOURCE = 'map-block-route-focus'
export const ROUTE_FOCUS_LAYER = 'map-block-route-focus-line'
export const STOPS_SOURCE = 'map-block-stops'
export const STOPS_LAYER_HALO = 'map-block-stops-halo'
export const STOPS_LAYER = 'map-block-stops-dot'
export const POIS_SOURCE = 'map-block-pois'
export const POIS_HALO_LAYER = 'map-block-pois-halo'
export const POIS_PIN_LAYER = 'map-block-pois-pin'
export const POIS_LABEL_LAYER = 'map-block-pois-label'

export interface LayerColors {
  accent: string
  casing: string
}

export function addRouteLayers(map: MapLibreMap, colors: LayerColors) {
  map.addSource(ROUTE_SOURCE, { data: emptyLine(), type: 'geojson' })
  map.addLayer({
    id: ROUTE_LAYER_CASING,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.casing,
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 18, 10],
    },
    source: ROUTE_SOURCE,
    type: 'line',
  })
  map.addLayer({
    id: ROUTE_LAYER,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.accent,
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 18, 6],
    },
    source: ROUTE_SOURCE,
    type: 'line',
  })
  map.addSource(ROUTE_FOCUS_SOURCE, { data: emptyLine(), type: 'geojson' })
  map.addLayer({
    id: ROUTE_FOCUS_LAYER,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': colors.accent,
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 18, 7],
    },
    source: ROUTE_FOCUS_SOURCE,
    type: 'line',
  })
}

export function setRouteFocus(
  map: MapLibreMap,
  segments: RouteSegment[] | null,
) {
  const src = map.getSource(ROUTE_FOCUS_SOURCE) as GeoJSONSource | undefined
  const drawable = (segments ?? []).filter((segment) => segment.length >= 2)
  src?.setData(
    drawable.length > 0
      ? {
          geometry: { coordinates: drawable, type: 'MultiLineString' },
          properties: {},
          type: 'Feature',
        }
      : emptyLine(),
  )
  const opacity = segments ? 0.3 : 1
  if (map.getLayer(ROUTE_LAYER)) {
    map.setPaintProperty(ROUTE_LAYER, 'line-opacity', opacity)
  }
  if (map.getLayer(ROUTE_LAYER_CASING)) {
    map.setPaintProperty(ROUTE_LAYER_CASING, 'line-opacity', opacity)
  }
}

export function addStopLayers(map: MapLibreMap, colors: LayerColors) {
  map.addSource(STOPS_SOURCE, { data: emptyCollection(), type: 'geojson' })
  map.addLayer({
    id: STOPS_LAYER_HALO,
    paint: {
      'circle-color': colors.accent,
      'circle-opacity': 0.16,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 16, 22],
    },
    source: STOPS_SOURCE,
    type: 'circle',
  })
  map.addLayer({
    id: STOPS_LAYER,
    paint: {
      'circle-color': colors.accent,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 16, 7],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.6,
    },
    source: STOPS_SOURCE,
    type: 'circle',
  })
}

export function addPoiLayers(map: MapLibreMap, colors: LayerColors) {
  map.addSource(POIS_SOURCE, { data: emptyCollection(), type: 'geojson' })
  map.addLayer({
    id: POIS_HALO_LAYER,
    paint: {
      'circle-color': colors.accent,
      'circle-opacity': 0.2,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 16, 28],
    },
    source: POIS_SOURCE,
    type: 'circle',
  })
  map.addLayer({
    id: POIS_PIN_LAYER,
    paint: {
      'circle-color': colors.accent,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 10],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2.4,
    },
    source: POIS_SOURCE,
    type: 'circle',
  })
  map.addLayer({
    id: POIS_LABEL_LAYER,
    layout: {
      'text-anchor': 'top',
      'text-field': ['coalesce', ['get', 'title'], ''],
      'text-font': ['Noto Sans Regular'],
      'text-offset': [0, 1.1],
      'text-size': 12,
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
    source: POIS_SOURCE,
    type: 'symbol',
  })
}

export function setRouteData(map: MapLibreMap, coords: RouteSegment) {
  setRouteSegmentsData(map, coords.length > 0 ? [coords] : [])
}

export function setRouteSegmentsData(
  map: MapLibreMap,
  segments: RouteSegment[],
) {
  const src = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined
  const drawableSegments = segments.filter((segment) => segment.length >= 2)
  if (drawableSegments.length === 0) {
    src?.setData(emptyLine())
    return
  }

  src?.setData({
    geometry:
      drawableSegments.length === 1
        ? { coordinates: drawableSegments[0]!, type: 'LineString' }
        : { coordinates: drawableSegments, type: 'MultiLineString' },
    properties: {},
    type: 'Feature',
  })
}

export function setStopsData(map: MapLibreMap, stops: MapTrackStop[]) {
  const src = map.getSource(STOPS_SOURCE) as GeoJSONSource | undefined
  src?.setData({
    features: stops.map((stop) => ({
      geometry: { coordinates: [stop.lon, stop.lat], type: 'Point' },
      properties: {
        duration: stop.durationSec,
        time: stop.time ?? null,
        visits: stop.visits ?? 1,
      },
      type: 'Feature',
    })),
    type: 'FeatureCollection',
  })
}

export function setPoisData(map: MapLibreMap, pois: MapPoi[]) {
  const src = map.getSource(POIS_SOURCE) as GeoJSONSource | undefined
  src?.setData({
    features: pois.map((poi, index) => ({
      geometry: { coordinates: [poi.lon, poi.lat], type: 'Point' },
      properties: {
        description: poi.description ?? null,
        index,
        title: poi.title ?? '',
      },
      type: 'Feature',
    })),
    type: 'FeatureCollection',
  })
}

export function emptyLine() {
  return {
    geometry: {
      coordinates: [] as Array<[number, number]>,
      type: 'LineString' as const,
    },
    properties: {},
    type: 'Feature' as const,
  }
}

export function emptyCollection() {
  return { features: [], type: 'FeatureCollection' as const }
}
