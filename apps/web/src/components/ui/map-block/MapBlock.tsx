'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import './MapBlock.css'

import type { VirtualElement } from '@floating-ui/react-dom'
import { flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { clsx } from 'clsx'
import { ArrowRight, Check, Copy, Globe, MapPin } from 'lucide-react'
import type {
  LngLatBoundsLike,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapMouseEvent,
} from 'maplibre-gl'
import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SlotText } from '~/components/ui/slot-text'
import useClickAway from '~/hooks/common/use-click-away'
import { useIsDark } from '~/hooks/common/use-is-dark'

import { getPopoverAnimationConfig } from '../float-popover/animation'
import { popoverPanelClassNames } from '../float-popover/styles'
import { useModalStack } from '../modal'
import { RootPortal } from '../portal'
import { unionBounds } from './map-block-export'
import {
  addPoiLayers,
  addRouteLayers,
  addStopLayers,
  type LayerColors,
  POIS_PIN_LAYER,
  type RouteSegment,
  setPoisData,
  setRouteFocus,
  setRouteSegmentsData,
  setStopsData,
  STOPS_LAYER,
} from './map-block-layers'
import type { ResolvedLeg } from './map-block-legs'
import { resolveLegs } from './map-block-legs'
import {
  buildDistanceTable,
  flattenRouteSegments,
  sliceRouteAtDistance,
  stopsBeforeDistance,
} from './map-block-video-timeline'
import { MapDetailPanel } from './MapDetailPanel'
import { MapExportDialog } from './MapExportDialog'
import { MapLegChips } from './MapLegChips'
import type { MapBlockProps, MapPoi, MapTrackData, MapTrackStop } from './types'

type ActivePopover =
  | { kind: 'stop'; lngLat: [number, number]; stop: MapTrackStop }
  | { kind: 'poi'; lngLat: [number, number]; poi: MapPoi }

const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'
const FALLBACK_ACCENT = '#c56473'
const REVEAL_DURATION_MS = 2200
const DEFAULT_STOP_MIN_DURATION = 600

export function MapBlock({
  className,
  height = 460,
  interactive = true,
  locale = 'en',
  pois: poisProp,
  src,
  stopPopoverMinDurationSec = DEFAULT_STOP_MIN_DURATION,
  title,
  track,
  view,
}: MapBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const styleRef = useRef<LayerColors>({
    accent: FALLBACK_ACCENT,
    casing: 'rgba(255,255,255,0.85)',
  })
  const revealedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const inViewRef = useRef(false)
  const tryRevealRef = useRef<(() => void) | null>(null)
  const [shouldMountMap, setShouldMountMap] = useState(false)
  const [remoteTrack, setRemoteTrack] = useState<MapTrackData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [active, setActive] = useState<ActivePopover | null>(null)
  const isDark = useIsDark()
  const { present } = useModalStack()

  useEffect(() => {
    const fig = figureRef.current
    if (!fig) return
    if (typeof IntersectionObserver === 'undefined') {
      inViewRef.current = true
      setShouldMountMap(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        const isVisible = entry.isIntersecting
        setShouldMountMap((prev) => (prev === isVisible ? prev : isVisible))

        if (!isVisible) {
          inViewRef.current = false
          return
        }

        const figHeight = entry.boundingClientRect.height
        const viewHeight =
          entry.rootBounds?.height ?? window.innerHeight ?? figHeight
        const fullyVisible =
          entry.intersectionRatio >= 0.99 ||
          (figHeight > viewHeight &&
            entry.intersectionRatio >= viewHeight / figHeight - 0.02)

        inViewRef.current = fullyVisible
        if (fullyVisible) tryRevealRef.current?.()
      },
      { threshold: [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1] },
    )

    observer.observe(fig)
    return () => observer.disconnect()
  }, [])

  const data = track ?? remoteTrack
  const pois = useMemo(
    () =>
      (poisProp ?? []).filter(
        (poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lon),
      ),
    [poisProp],
  )
  const merchantPois = useMemo(() => pois.filter((p) => p.merchant), [pois])
  const isSplit = merchantPois.length > 0
  const [activeMerchantIndex, setActiveMerchantIndex] = useState(0)
  useEffect(() => {
    setActiveMerchantIndex(0)
  }, [merchantPois])
  const routeSegments = useMemo(() => routeSegmentsFromTrack(data), [data])
  const coordinates = useMemo(
    () => flattenRouteSegments(routeSegments),
    [routeSegments],
  )
  const stops = useMemo(
    () =>
      (data?.stops ?? []).filter(
        (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon),
      ),
    [data],
  )
  const legs = useMemo(() => resolveLegs(data, stops), [data, stops])
  const [legPick, setLegPick] = useState<{
    index: number | null
    legs: ResolvedLeg[]
  }>({ index: null, legs })
  const activeLegIndex = legPick.legs === legs ? legPick.index : null
  const activeLeg =
    activeLegIndex === null ? null : (legs[activeLegIndex] ?? null)
  const focusRef = useRef<ResolvedLeg | null>(null)

  const applyLegFocus = (map: MapLibreMap, allStops: MapTrackStop[]) => {
    const leg = focusRef.current
    setRouteFocus(map, leg?.routeSegments ?? null)
    if (revealedRef.current) setStopsData(map, leg?.stops ?? allStops)
  }

  const presentExportDialog = useCallback(() => {
    if (!data) return

    setExportError(null)
    present({
      content: () => (
        <MapExportDialog
          colors={styleRef.current}
          defaultIsDark={isDark}
          filename={`${data.title ?? title ?? 'gps-track'}.mp4`}
          pois={pois}
          routeSegments={routeSegments}
          stops={stops}
          onError={setExportError}
        />
      ),
      modalClassName:
        'w-[860px] max-w-[calc(100vw-2rem)] !max-h-[calc(100vh-4rem)] lg:!max-h-[calc(100vh-6rem)]',
      overlay: true,
      title: 'Export Video',
    })
  }, [data, isDark, pois, present, routeSegments, stops, title])

  const hasTrack = coordinates.length >= 2
  const hasPois = pois.length > 0
  const hasContent = hasTrack || hasPois

  useEffect(() => {
    if (!shouldMountMap || !src || track) return

    let cancelled = false
    setLoadError(null)

    fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<MapTrackData>
      })
      .then((payload) => {
        if (!cancelled) setRemoteTrack(payload)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(String(error))
      })

    return () => {
      cancelled = true
    }
  }, [shouldMountMap, src, track])

  useEffect(() => {
    if (!shouldMountMap) return
    const container = containerRef.current
    if (!container || !hasContent) return

    let cancelled = false
    let map: MapLibreMap | null = null

    const tryReveal = () => {
      if (cancelled) return
      const current = mapRef.current
      if (!current) return
      if (revealedRef.current) return
      if (rafRef.current !== null) return
      if (!hasTrack) return
      if (!inViewRef.current) return
      if (!current.getSource('map-block-route')) return
      rafRef.current = animateReveal(
        current,
        routeSegments,
        stops,
        REVEAL_DURATION_MS,
        (handle) => {
          if (rafRef.current === handle) rafRef.current = null
          revealedRef.current = true
          applyLegFocus(current, stops)
        },
      )
    }
    tryRevealRef.current = tryReveal

    void (async () => {
      const maplibre = await import('maplibre-gl')
      if (cancelled) return

      styleRef.current = resolveColors(isDark)

      map = new maplibre.Map({
        attributionControl: { compact: true },
        cooperativeGestures: interactive,
        container,
        interactive,
        style: isDark ? DARK_STYLE : LIGHT_STYLE,
      })
      mapRef.current = map

      const fixedView =
        view && view.center && typeof view.zoom === 'number' ? view : null
      if (fixedView) {
        map.jumpTo({
          center: fixedView.center as [number, number],
          zoom: fixedView.zoom!,
        })
      } else {
        const bounds = focusRef.current
          ? unionBounds(
              flattenRouteSegments(focusRef.current.routeSegments),
              [],
            )
          : unionBounds(coordinates, pois)
        if (bounds) {
          map.fitBounds(bounds as LngLatBoundsLike, {
            animate: false,
            maxZoom: hasTrack ? 16 : 14,
            padding: 48,
          })
        }
      }

      const ensureLayers = () => {
        const current = mapRef.current
        if (!current) return
        const freshRoute = !current.getSource('map-block-route')
        const freshStops = !current.getSource('map-block-stops')
        const freshPois = !current.getSource('map-block-pois')
        if (freshRoute) addRouteLayers(current, styleRef.current)
        if (freshStops) addStopLayers(current, styleRef.current)
        if (hasPois && freshPois) {
          addPoiLayers(current, styleRef.current)
          setPoisData(current, pois)
        }

        if (revealedRef.current) {
          if (freshRoute && hasTrack) {
            setRouteSegmentsData(current, routeSegments)
          }
          if (freshStops) setStopsData(current, stops)
        } else if (freshRoute && hasTrack) {
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
          tryReveal()
        } else if (!hasTrack) {
          revealedRef.current = true
        }
        if (hasTrack) applyLegFocus(current, stops)
      }

      const collapseAttribution = () => {
        const attribution = map
          ?.getContainer()
          .querySelector('.maplibregl-ctrl-attrib')
        attribution?.classList.remove('maplibregl-compact-show')
        attribution?.removeAttribute('open')
      }

      map.on('load', ensureLayers)
      map.on('load', collapseAttribution)
      map.on('styledata', ensureLayers)
      map.on('styledata', collapseAttribution)

      const onStopClick = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const durationSec = Number(feature.properties?.duration ?? 0)
        if (durationSec < stopPopoverMinDurationSec) return
        const [lon, lat] = feature.geometry.coordinates as [number, number]
        setActive({
          kind: 'stop',
          lngLat: [lon, lat],
          stop: {
            durationSec,
            lat,
            lon,
            time:
              typeof feature.properties?.time === 'string'
                ? feature.properties.time
                : undefined,
            visits: Number(feature.properties?.visits ?? 1),
          },
        })
        event.originalEvent.stopPropagation()
      }
      const onPoiClick = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const idx = Number(feature.properties?.index ?? -1)
        const poi = pois[idx]
        if (!poi) return
        if (poi.merchant) {
          const mIdx = merchantPois.findIndex(
            (m) => m.lat === poi.lat && m.lon === poi.lon,
          )
          if (mIdx >= 0) {
            setActiveMerchantIndex(mIdx)
            setActive(null)
          }
          event.originalEvent.stopPropagation()
          return
        }
        const [lon, lat] = feature.geometry.coordinates as [number, number]
        setActive({
          kind: 'poi',
          lngLat: [lon, lat],
          poi,
        })
        event.originalEvent.stopPropagation()
      }
      const onMapClick = (event: MapMouseEvent) => {
        const layers = [STOPS_LAYER, POIS_PIN_LAYER].filter(
          (id) => map?.getLayer(id) !== undefined,
        )
        if (layers.length === 0) return
        const hit = map?.queryRenderedFeatures(event.point, { layers })
        if (!hit || hit.length === 0) {
          setActive(null)
        }
      }
      const onEnter = () => {
        if (map) map.getCanvas().style.cursor = 'pointer'
      }
      const onLeave = () => {
        if (map) map.getCanvas().style.cursor = ''
      }
      map.on('click', STOPS_LAYER, onStopClick)
      map.on('click', POIS_PIN_LAYER, onPoiClick)
      map.on('click', onMapClick)
      map.on('mouseenter', STOPS_LAYER, onEnter)
      map.on('mouseleave', STOPS_LAYER, onLeave)
      map.on('mouseenter', POIS_PIN_LAYER, onEnter)
      map.on('mouseleave', POIS_PIN_LAYER, onLeave)
    })()

    return () => {
      cancelled = true
      tryRevealRef.current = null
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, pois, routeSegments, shouldMountMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    styleRef.current = resolveColors(isDark)
    map.setStyle(isDark ? DARK_STYLE : LIGHT_STYLE)
  }, [isDark])

  useEffect(() => {
    setActive(null)
    revealedRef.current = false
  }, [coordinates, pois])

  useEffect(() => {
    focusRef.current = activeLeg
    setActive(null)
    const map = mapRef.current
    if (!map?.getSource('map-block-route')) return
    applyLegFocus(map, stops)
    if (!activeLeg && view?.center && typeof view.zoom === 'number') {
      map.easeTo({ center: view.center, duration: 600, zoom: view.zoom })
      return
    }
    const bounds = activeLeg
      ? unionBounds(flattenRouteSegments(activeLeg.routeSegments), [])
      : unionBounds(coordinates, pois)
    if (bounds) {
      map.fitBounds(bounds as LngLatBoundsLike, {
        duration: 600,
        maxZoom: 16,
        padding: 48,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeg])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isSplit) return
    const poi = merchantPois[activeMerchantIndex]
    if (!poi) return
    const targetZoom = Math.max(map.getZoom(), 14)
    map.flyTo({
      center: [poi.lon, poi.lat],
      zoom: targetZoom,
      duration: 600,
    })
  }, [activeMerchantIndex, isSplit, merchantPois])

  // FIXME: i18n — wire to next-intl keys (map.untitled / map.places / map.stops
  // / map.pts) once apps/web/src/messages/{zh,en}/map.json lands. Until then
  // English defaults match the spec §6.5 example output.
  const baseTitle = title ?? data?.title ?? 'Map'
  const displayTitle = activeLeg
    ? `${baseTitle} · ${activeLeg.title || `Leg ${activeLegIndex! + 1}`}`
    : baseTitle
  const span = activeLeg ?? data

  const distanceMeters = span?.distanceMeters
  const distanceLabel = distanceMeters
    ? `${(distanceMeters / 1000).toFixed(1)} km`
    : null
  const countLabel = useMemo<React.ReactNode>(() => {
    if (!data) return null
    if (
      data.originalCount &&
      data.sampledCount &&
      data.originalCount !== data.sampledCount
    ) {
      return (
        <span className="inline-flex items-center gap-0.5">
          {data.originalCount.toLocaleString()}
          <ArrowRight aria-hidden className="inline-block size-3" />
          {data.sampledCount.toLocaleString()} pts
        </span>
      )
    }
    if (data.sampledCount) return `${data.sampledCount.toLocaleString()} pts`
    if (coordinates.length > 0)
      return `${coordinates.length.toLocaleString()} pts`
    return null
  }, [coordinates.length, data])

  const dateLabel = useMemo(() => {
    if (!span?.startTimeMs) {
      if (!hasTrack && hasPois) return `${pois.length} places`
      return null
    }
    const start = new Date(span.startTimeMs)
    const end =
      span.endTimeMs && span.endTimeMs > span.startTimeMs
        ? new Date(span.endTimeMs)
        : null
    try {
      const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
        dateStyle: 'long',
        timeZone: tzNameFromOffset(data?.timezoneOffsetMinutes),
      })
      if (!end) return fmt.format(start)
      const startLabel = fmt.format(start)
      const endLabel = fmt.format(end)
      if (startLabel === endLabel) return startLabel
      if (typeof fmt.formatRange === 'function') {
        return fmt.formatRange(start, end)
      }
      return `${startLabel} – ${endLabel}`
    } catch {
      const startLabel = start.toLocaleDateString()
      if (!end) return startLabel
      const endLabel = end.toLocaleDateString()
      return startLabel === endLabel
        ? startLabel
        : `${startLabel} – ${endLabel}`
    }
  }, [
    span?.endTimeMs,
    span?.startTimeMs,
    data?.timezoneOffsetMinutes,
    hasPois,
    hasTrack,
    locale,
    pois.length,
  ])

  const legChipItems = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
      day: 'numeric',
      month: 'short',
      timeZone: tzNameFromOffset(data?.timezoneOffsetMinutes),
    })
    return legs.map((leg) => ({
      label: leg.title,
      meta: leg.startTimeMs ? fmt.format(leg.startTimeMs) : null,
    }))
  }, [data?.timezoneOffsetMinutes, legs, locale])

  const exportable = hasTrack
  const stopsCount = (activeLeg?.stops ?? stops).length
  const hasSecondary = !!(
    dateLabel ||
    distanceLabel ||
    countLabel ||
    stopsCount
  )

  return (
    <figure
      data-no-article-selection
      ref={figureRef}
      className={clsx(
        'not-prose my-6 overflow-hidden rounded-xl bg-neutral-1 ring-1 ring-border dark:bg-neutral-2',
        className,
      )}
    >
      <div
        className={clsx(
          isSplit && 'md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]',
        )}
      >
        <div className="relative" style={{ height }}>
          <div className="yohaku-map-block size-full" ref={containerRef} />
          {!shouldMountMap && <MapBlockIdlePlaceholder />}
          {!hasContent && (
            <div className="absolute inset-0 grid place-items-center bg-paper/80 text-copy-14 text-neutral-7 backdrop-blur-sm">
              {loadError
                ? `Failed to load track: ${loadError}`
                : 'Loading map...'}
            </div>
          )}
          <AnimatePresence>
            {active && mapRef.current && (
              <MapMarkerPopover
                key={`${active.kind}-${active.lngLat[0]}-${active.lngLat[1]}`}
                lngLat={active.lngLat}
                map={mapRef.current}
                onClose={() => setActive(null)}
              >
                {active.kind === 'stop' ? (
                  <StopPopover
                    stop={active.stop}
                    onClose={() => setActive(null)}
                  />
                ) : (
                  <PoiPopover
                    poi={active.poi}
                    onClose={() => setActive(null)}
                  />
                )}
              </MapMarkerPopover>
            )}
          </AnimatePresence>
        </div>
        {isSplit && (
          <div className="border-t border-border md:border-t-0 md:border-l md:min-h-0 md:overflow-y-auto">
            <MapDetailPanel
              activeIndex={activeMerchantIndex}
              pois={merchantPois}
              onActiveChange={setActiveMerchantIndex}
            />
          </div>
        )}
      </div>
      {legs.length > 0 && (
        <MapLegChips
          active={activeLegIndex}
          items={legChipItems}
          onChange={(index) => setLegPick({ index, legs })}
        />
      )}
      <figcaption className="min-h-[68px] border-t border-border bg-paper px-4 py-3 dark:bg-neutral-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="truncate text-copy-14 font-medium text-neutral-10">
              {displayTitle}
            </div>
            {hasSecondary && (
              <div className="flex flex-wrap items-center gap-1 text-label-12 text-neutral-7">
                {joinWithDots(
                  [
                    { id: 'date', node: dateLabel },
                    {
                      id: 'distance',
                      node: distanceLabel && <SlotText text={distanceLabel} />,
                    },
                    { id: 'count', node: activeLeg ? null : countLabel },
                    {
                      id: 'stops',
                      node: stopsCount > 0 && (
                        <SlotText
                          text={`${stopsCount} ${stopsCount === 1 ? 'stop' : 'stops'}`}
                        />
                      ),
                    },
                  ].filter((item) => Boolean(item.node)),
                )}
              </div>
            )}
          </div>
          {exportable && (
            <button
              className="inline-flex h-7 items-center rounded-md bg-neutral-2 px-2.5 text-label-12 font-medium text-neutral-9 ring-1 ring-border transition-colors hover:bg-neutral-3 active:scale-[0.96] dark:bg-neutral-4 dark:hover:bg-neutral-5"
              type="button"
              onClick={presentExportDialog}
            >
              Export Video
            </button>
          )}
        </div>
      </figcaption>
      {exportError && (
        <p className="border-t border-error/30 bg-error/10 px-4 py-2 text-label-12 text-error">
          Export failed: {exportError}
        </p>
      )}
    </figure>
  )
}

function MapBlockIdlePlaceholder() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,var(--color-neutral-2)_0%,var(--color-neutral-1)_48%,var(--color-neutral-2)_100%)] dark:bg-[linear-gradient(135deg,var(--color-neutral-3)_0%,var(--color-neutral-2)_48%,var(--color-neutral-3)_100%)]"
    >
      <div className="absolute inset-x-0 top-1/3 h-px bg-border/70" />
      <div className="absolute inset-x-0 top-2/3 h-px bg-border/50" />
      <div className="absolute top-0 bottom-0 left-1/3 w-px bg-border/50" />
      <div className="absolute top-0 bottom-0 left-2/3 w-px bg-border/70" />
    </div>
  )
}

function routeSegmentsFromTrack(data: MapTrackData | null): RouteSegment[] {
  const sourceSegments =
    data?.segments && data.segments.length > 0
      ? data.segments
      : data?.points
        ? [data.points]
        : []

  return sourceSegments
    .map((segment) =>
      segment
        .map(([lat, lon]) => [lon, lat] as [number, number])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat)),
    )
    .filter((segment) => segment.length > 0)
}

function joinWithDots(items: Array<{ id: string; node: React.ReactNode }>) {
  const nodes: React.ReactNode[] = []
  for (const item of items) {
    if (nodes.length > 0) {
      nodes.push(
        <span className="text-neutral-5" key={`sep-${item.id}`}>
          ·
        </span>,
      )
    }
    nodes.push(<span key={item.id}>{item.node}</span>)
  }
  return nodes
}

type AddressState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; text: string }
  | { status: 'error' }

const addressCache = new Map<string, string>()

function StopPopover({
  onClose,
  stop,
}: {
  onClose: () => void
  stop: MapTrackStop
}) {
  const [address, setAddress] = useState<AddressState>({ status: 'idle' })

  const minutes = Math.max(1, Math.round(stop.durationSec / 60))
  const durationLabel =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes} min`
  const timeLabel = stop.time
    ? new Date(stop.time).toLocaleString(undefined, {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
      })
    : null
  const cacheKey = `${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`

  useEffect(() => {
    const cached = addressCache.get(cacheKey)
    if (cached) {
      setAddress({ status: 'ok', text: cached })
      return
    }
    let cancelled = false
    setAddress({ status: 'loading' })
    fetchAddress(stop.lat, stop.lon)
      .then((text) => {
        if (cancelled) return
        if (text) {
          addressCache.set(cacheKey, text)
          setAddress({ status: 'ok', text })
        } else {
          setAddress({ status: 'error' })
        }
      })
      .catch(() => {
        if (!cancelled) setAddress({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [cacheKey, stop.lat, stop.lon])

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-neutral-10">
          Stop · {durationLabel}
          {(stop.visits ?? 1) > 1 && (
            <span className="ml-1 font-normal text-neutral-7">
              · {stop.visits}×
            </span>
          )}
        </div>
        <PopoverCloseButton onClose={onClose} />
      </div>
      {timeLabel && (
        <div className="mt-1 text-neutral-7">Starts at {timeLabel}</div>
      )}
      {address.status === 'ok' && (
        <div className="mt-1.5 text-neutral-8">{address.text}</div>
      )}
      {address.status === 'loading' && (
        <div className="mt-1.5 text-neutral-5">Resolving address…</div>
      )}
      <PopoverLatLon label="Stop" lat={stop.lat} lon={stop.lon} />
    </>
  )
}

function PoiPopover({ onClose, poi }: { onClose: () => void; poi: MapPoi }) {
  const [address, setAddress] = useState<AddressState>({ status: 'idle' })
  const cacheKey = `${poi.lat.toFixed(4)},${poi.lon.toFixed(4)}`

  useEffect(() => {
    const cached = addressCache.get(cacheKey)
    if (cached) {
      setAddress({ status: 'ok', text: cached })
      return
    }
    let cancelled = false
    setAddress({ status: 'loading' })
    fetchAddress(poi.lat, poi.lon)
      .then((text) => {
        if (cancelled) return
        if (text) {
          addressCache.set(cacheKey, text)
          setAddress({ status: 'ok', text })
        } else {
          setAddress({ status: 'error' })
        }
      })
      .catch(() => {
        if (!cancelled) setAddress({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [cacheKey, poi.lat, poi.lon])

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-neutral-10">
          {poi.title || 'Place'}
        </div>
        <PopoverCloseButton onClose={onClose} />
      </div>
      {poi.description && (
        <div className="mt-1 text-neutral-8">{poi.description}</div>
      )}
      {address.status === 'ok' && (
        <div className="mt-1.5 text-neutral-7">{address.text}</div>
      )}
      {address.status === 'loading' && (
        <div className="mt-1.5 text-neutral-5">Resolving address…</div>
      )}
      <PopoverLatLon label={poi.title || 'Place'} lat={poi.lat} lon={poi.lon} />
    </>
  )
}

function MapMarkerPopover({
  children,
  lngLat,
  map,
  onClose,
}: {
  children: React.ReactNode
  lngLat: [number, number]
  map: MapLibreMap
  onClose: () => void
}) {
  const [lng, lat] = lngLat
  const referenceEl = useMemo<VirtualElement>(
    () => ({
      getBoundingClientRect: () => {
        const rect = map.getContainer().getBoundingClientRect()
        const pt = map.project([lng, lat])
        const x = rect.left + pt.x
        const y = rect.top + pt.y
        return {
          bottom: y,
          height: 0,
          left: x,
          right: x,
          toJSON: () => ({}),
          top: y,
          width: 0,
          x,
          y,
        }
      },
    }),
    [lng, lat, map],
  )

  const {
    isPositioned,
    placement: resolvedPlacement,
    refs,
    strategy,
    update,
    x,
    y,
  } = useFloating({
    elements: { reference: referenceEl },
    middleware: [offset(14), flip({ padding: 8 }), shift({ padding: 8 })],
    placement: 'top',
    strategy: 'fixed',
  })

  useEffect(() => {
    update()
    const handler = () => update()
    map.on('move', handler)
    map.on('zoom', handler)
    map.on('resize', handler)
    return () => {
      map.off('move', handler)
      map.off('zoom', handler)
      map.off('resize', handler)
    }
  }, [map, update])

  const panelRef = useRef<HTMLDivElement>(null)
  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node
      refs.setFloating(node)
    },
    [refs],
  )
  useClickAway(panelRef, (event) => {
    const target = event.target as Node | null
    if (target && map.getCanvasContainer().contains(target)) return
    onClose()
  })

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const animation = getPopoverAnimationConfig(resolvedPlacement)

  return (
    <RootPortal>
      <m.div className="pointer-events-auto relative z-[60]">
        <m.div
          {...animation}
          ref={setPanelRef}
          className={clsx(
            popoverPanelClassNames,
            'max-w-[280px] min-w-[180px] px-3 py-2 text-label-12 text-neutral-7',
          )}
          style={{
            ...animation.style,
            left: x ?? '',
            position: strategy,
            top: y ?? '',
            visibility: isPositioned && x !== null ? 'visible' : 'hidden',
          }}
        >
          {children}
        </m.div>
      </m.div>
    </RootPortal>
  )
}

function PopoverCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Close popover"
      className="-mr-1 rounded p-0.5 text-neutral-5 hover:text-neutral-9"
      type="button"
      onClick={onClose}
    >
      ×
    </button>
  )
}

function PopoverLatLon({
  label,
  lat,
  lon,
}: {
  label?: string
  lat: number
  lon: number
}) {
  const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
  const appleMapsUrl = `https://maps.apple.com/?${new URLSearchParams({
    ll: `${lat},${lon}`,
    ...(label ? { q: label } : {}),
  }).toString()}`
  const googleMapsUrl = `https://www.google.com/maps/search/?${new URLSearchParams(
    { api: '1', query: `${lat},${lon}` },
  ).toString()}`
  return (
    <div className="mt-1.5 space-y-1 border-t border-border pt-1.5">
      <div className="font-mono text-caption-10 text-neutral-5">{coords}</div>
      <div className="-mx-1 flex flex-wrap items-center gap-0.5">
        <CopyCoordsButton text={coords} />
        <PopoverActionLink href={appleMapsUrl}>
          <MapPin aria-hidden className="size-3" />
          <span>Apple Maps</span>
        </PopoverActionLink>
        <PopoverActionLink href={googleMapsUrl}>
          <Globe aria-hidden className="size-3" />
          <span>Google Maps</span>
        </PopoverActionLink>
      </div>
    </div>
  )
}

function CopyCoordsButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <button
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-caption-10 font-medium text-neutral-7 transition-colors hover:bg-neutral-2 hover:text-neutral-9 dark:hover:bg-neutral-3"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
        } catch {
          /* clipboard blocked; silently no-op */
        }
      }}
    >
      {copied ? (
        <Check aria-hidden className="size-3" />
      ) : (
        <Copy aria-hidden className="size-3" />
      )}
      <SlotText text={copied ? 'Copied' : 'Copy'} />
    </button>
  )
}

function PopoverActionLink({
  children,
  href,
}: {
  children: React.ReactNode
  href: string
}) {
  return (
    <a
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-caption-10 font-medium text-neutral-7 transition-colors hover:bg-neutral-2 hover:text-neutral-9 dark:hover:bg-neutral-3"
      href={href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {children}
    </a>
  )
}

function animateReveal(
  map: MapLibreMap,
  routeSegments: RouteSegment[],
  stops: MapTrackStop[],
  durationMs: number,
  onDone: (handle: number) => void,
) {
  const distanceTable = buildDistanceTable(routeSegments)
  if (distanceTable.totalDistance <= 0) return null

  setStopsData(map, [])

  let start: number | null = null
  let handle = 0

  const step = (ts: number) => {
    if (start === null) start = ts
    const raw = Math.min(1, (ts - start) / durationMs)
    const eased = 1 - (1 - raw) ** 3
    const revealDistance = eased * distanceTable.totalDistance
    setRouteSegmentsData(
      map,
      sliceRouteAtDistance(routeSegments, revealDistance, distanceTable),
    )
    setStopsData(map, stopsBeforeDistance(stops, routeSegments, revealDistance))

    if (raw < 1) {
      handle = requestAnimationFrame(step)
    } else {
      setRouteSegmentsData(map, routeSegments)
      setStopsData(map, stops)
      onDone(handle)
    }
  }

  handle = requestAnimationFrame(step)
  return handle
}

function resolveColors(isDark: boolean): LayerColors {
  return {
    accent: readAccentHex(isDark) ?? FALLBACK_ACCENT,
    casing: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)',
  }
}

async function fetchAddress(lat: number, lon: number): Promise<string | null> {
  const lang =
    typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en'
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lon}&zoom=18&accept-language=${encodeURIComponent(lang)}`
  const response = await fetch(url, {
    headers: { 'Accept-Language': lang },
  })
  if (!response.ok) return null
  const payload = (await response.json()) as {
    address?: Record<string, string>
    display_name?: string
    name?: string
  }
  if (payload.name && payload.address) {
    const parts = [payload.name]
    const addr = payload.address
    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.town ||
      addr.city
    if (locality && locality !== payload.name) parts.push(locality)
    return parts.join(' · ')
  }
  return payload.display_name ?? null
}

function readAccentHex(isDark: boolean) {
  if (typeof document === 'undefined') return null
  const style = document.getElementById('accent-color-style')
  if (!style) return null
  const value = isDark ? style.dataset.dark : style.dataset.light
  return value && /^#[\da-f]{3,8}$/i.test(value) ? value : null
}

function intlLocale(locale: string): string {
  if (locale === 'zh') return 'zh-CN'
  return locale
}

function tzNameFromOffset(offsetMinutes?: number): string | undefined {
  if (typeof offsetMinutes !== 'number' || !Number.isFinite(offsetMinutes))
    return undefined
  const totalHours = offsetMinutes / 60
  if (Number.isInteger(totalHours)) {
    if (totalHours === 0) return 'Etc/UTC'
    // Etc/GMT zones are sign-inverted vs UTC offset (GMT-9 == UTC+9).
    return `Etc/GMT${totalHours > 0 ? '-' : '+'}${Math.abs(totalHours)}`
  }
  return undefined
}
