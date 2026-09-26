'use client'

import { clsx } from 'clsx'
import { Camera, Clock, LoaderCircle, Palette, Tags, Video } from 'lucide-react'
import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'

import { StyledButton } from '../button'
import { useCurrentModal } from '../modal'
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportPhase,
  exportTrackToMp4,
  type TrackVideoExportOptions,
} from './map-block-export'
import {
  addPoiLayers,
  addRouteLayers,
  addStopLayers,
  type LayerColors,
  POIS_LABEL_LAYER,
  type RouteSegment,
  setPoisData,
  setRouteSegmentsData,
  setStopsData,
} from './map-block-layers'
import type {
  TimelinePhase,
  TrackVideoCameraMode,
  TrackVideoDurationSec,
  TrackVideoLabelMode,
  TrackVideoThemeMode,
  VideoCameraBounds,
} from './map-block-video-timeline'
import {
  buildDistanceTable,
  resolveTimelinePhase,
  resolveVideoCameraBounds,
  sliceRouteAtDistance,
  stopsBeforeDistance,
} from './map-block-video-timeline'
import type { MapPoi, MapTrackStop } from './types'

interface MapExportDialogProps {
  colors: LayerColors
  defaultIsDark: boolean
  filename: string
  onError: (message: string) => void
  pois: MapPoi[]
  routeSegments: RouteSegment[]
  stops: MapTrackStop[]
}

const durationOptions: Array<{ id: TrackVideoDurationSec; label: string }> = [
  { id: 4, label: '4s' },
  { id: 6, label: '6s' },
  { id: 10, label: '10s' },
]
const cameraOptions: Array<{ id: TrackVideoCameraMode; label: string }> = [
  { id: 'auto-follow', label: 'Follow' },
  { id: 'overview', label: 'Overview' },
]
const themeOptions: Array<{ id: TrackVideoThemeMode; label: string }> = [
  { id: 'current', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]
const labelOptions: Array<{ id: TrackVideoLabelMode; label: string }> = [
  { id: 'stops-and-pois', label: 'Stops + POIs' },
  { id: 'minimal', label: 'Minimal' },
]

export function MapExportDialog({
  colors,
  defaultIsDark,
  filename,
  onError,
  pois,
  routeSegments,
  stops,
}: MapExportDialogProps) {
  const { dismiss } = useCurrentModal()
  const [cameraMode, setCameraMode] = useState<TrackVideoCameraMode>(
    DEFAULT_EXPORT_OPTIONS.cameraMode,
  )
  const [durationSec, setDurationSec] = useState<TrackVideoDurationSec>(
    DEFAULT_EXPORT_OPTIONS.durationSec,
  )
  const [labelMode, setLabelMode] = useState<TrackVideoLabelMode>(
    DEFAULT_EXPORT_OPTIONS.labelMode,
  )
  const [themeMode, setThemeMode] = useState<TrackVideoThemeMode>(
    DEFAULT_EXPORT_OPTIONS.themeMode,
  )
  const [phase, setPhase] = useState<'idle' | ExportPhase>('idle')
  const [progress, setProgress] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const rendering = phase !== 'idle'
  const options: TrackVideoExportOptions = {
    cameraMode,
    durationSec,
    labelMode,
    themeMode,
  }

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    [],
  )

  const handleCancel = () => {
    if (rendering) {
      abortRef.current?.abort()
      return
    }
    dismiss()
  }

  const handleExport = async () => {
    if (rendering) return

    const controller = new AbortController()
    abortRef.current = controller
    setPhase('preparing')
    setProgress(0)

    try {
      const blob = await exportTrackToMp4({
        colors,
        isDark: defaultIsDark,
        onPhase: setPhase,
        onProgress: setProgress,
        options,
        pois,
        routeSegments,
        signal: controller.signal,
        stops,
      })
      downloadBlob(blob, filename)
      dismiss()
    } catch (error) {
      if (isAbortError(error)) {
        setPhase('idle')
        setProgress(0)
        return
      }
      setPhase('idle')
      setProgress(0)
      onError(error instanceof Error ? error.message : String(error))
    } finally {
      abortRef.current = null
    }
  }

  const cameraLabel =
    cameraOptions.find((o) => o.id === cameraMode)?.label ?? cameraMode

  return (
    <div className="flex flex-col gap-4">
      <RoutePreview
        cameraMode={cameraMode}
        colors={colors}
        defaultIsDark={defaultIsDark}
        durationSec={durationSec}
        labelMode={labelMode}
        pois={pois}
        routeSegments={routeSegments}
        stops={stops}
        themeMode={themeMode}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 md:grid-cols-4">
        <PropGroup icon={Clock} label="Duration">
          <ChipGroup
            disabled={rendering}
            items={durationOptions}
            value={durationSec}
            onChange={setDurationSec}
          />
        </PropGroup>
        <PropGroup icon={Camera} label="Camera">
          <ChipGroup
            disabled={rendering}
            items={cameraOptions}
            value={cameraMode}
            onChange={setCameraMode}
          />
        </PropGroup>
        <PropGroup icon={Palette} label="Theme">
          <ChipGroup
            disabled={rendering}
            items={themeOptions}
            value={themeMode}
            onChange={setThemeMode}
          />
        </PropGroup>
        <PropGroup icon={Tags} label="Labels">
          <ChipGroup
            disabled={rendering}
            items={labelOptions}
            value={labelMode}
            onChange={setLabelMode}
          />
        </PropGroup>
      </div>

      <div className="relative border-t border-border pt-3">
        {rendering && (
          <div className="absolute inset-x-0 top-0 h-0.5 -translate-y-px overflow-hidden bg-neutral-2 dark:bg-neutral-3">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-label-12 text-neutral-7">
            {rendering ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                <span className="font-mono tabular-nums">
                  {exportProgressLabel(phase)} · {Math.round(progress * 100)}%
                </span>
              </span>
            ) : (
              <span className="font-mono tabular-nums">
                {durationSec}s · {cameraLabel} · 1080p
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <StyledButton
              size="sm"
              type="button"
              variant="ghost"
              onClick={handleCancel}
            >
              {rendering ? 'Cancel Export' : 'Cancel'}
            </StyledButton>
            <StyledButton
              disabled={rendering}
              size="sm"
              type="button"
              variant="primary"
              onClick={handleExport}
            >
              <Video aria-hidden className="size-3.5" />
              Export
            </StyledButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoutePreview({
  cameraMode,
  colors,
  defaultIsDark,
  durationSec,
  labelMode,
  pois,
  routeSegments,
  stops,
  themeMode,
}: {
  cameraMode: TrackVideoCameraMode
  colors: LayerColors
  defaultIsDark: boolean
  durationSec: TrackVideoDurationSec
  labelMode: TrackVideoLabelMode
  pois: MapPoi[]
  routeSegments: RouteSegment[]
  stops: MapTrackStop[]
  themeMode: TrackVideoThemeMode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const rafRef = useRef<number | null>(null)
  const [readyVersion, dispatchReadyVersion] = useReducer(
    (value: number, action: 'ready' | 'reset') =>
      action === 'ready' ? value + 1 : 0,
    0,
  )

  const renderDark =
    themeMode === 'current' ? defaultIsDark : themeMode === 'dark'

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    dispatchReadyVersion('reset')

    void (async () => {
      const maplibre = await import('maplibre-gl')
      if (cancelled) return

      const map = new maplibre.Map({
        attributionControl: false,
        container,
        fadeDuration: 0,
        interactive: false,
        style: renderDark ? DARK_STYLE : LIGHT_STYLE,
      })
      mapRef.current = map

      map.once('load', () => {
        if (cancelled) return
        addRouteLayers(map, colors)
        addStopLayers(map, colors)
        addPoiLayers(map, colors)
        dispatchReadyVersion('ready')
      })
    })()

    return () => {
      cancelled = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [colors, renderDark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || readyVersion === 0) return

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setPoisData(map, pois)
    if (map.getLayer(POIS_LABEL_LAYER)) {
      map.setLayoutProperty(
        POIS_LABEL_LAYER,
        'visibility',
        labelMode === 'minimal' ? 'none' : 'visible',
      )
    }

    const distanceTable = buildDistanceTable(routeSegments)
    let lastFollowBounds: [[number, number], [number, number]] | null = null
    const startedAt = performance.now()
    const loopDurationMs = durationSec * 1000 + PREVIEW_LOOP_PAUSE_MS

    const step = (now: number) => {
      const elapsedMs = (now - startedAt) % loopDurationMs
      const timeSec = Math.min(durationSec, elapsedMs / 1000)
      const phase = resolveTimelinePhase(timeSec, durationSec)
      const revealDistance = phase.revealProgress * distanceTable.totalDistance
      const route = sliceRouteAtDistance(
        routeSegments,
        revealDistance,
        distanceTable,
      )
      const visibleStops = stopsBeforeDistance(
        stops,
        routeSegments,
        revealDistance,
      )
      const camera = resolveVideoCameraBounds({
        cameraMode,
        coords: routeSegments,
        distanceTable,
        phase,
        pois,
        revealDistance,
        stops,
      })

      if (camera.kind === 'follow') lastFollowBounds = camera.bounds
      setPreviewCamera(map, camera, phase, lastFollowBounds)
      setRouteSegmentsData(map, route)
      setStopsData(map, visibleStops)

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [
    cameraMode,
    durationSec,
    labelMode,
    pois,
    readyVersion,
    routeSegments,
    stops,
  ])

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-neutral-1 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-neutral-3 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="size-full" ref={containerRef} />
      {readyVersion === 0 && (
        <div className="absolute inset-0 grid place-items-center bg-paper/70 text-label-12 text-neutral-7 backdrop-blur-sm dark:bg-neutral-2/70">
          Loading map…
        </div>
      )}
    </div>
  )
}

function PropGroup({
  children,
  icon: Icon,
  label,
}: {
  children: ReactNode
  icon?: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-label-12 font-medium text-neutral-7">
        {Icon && <Icon aria-hidden className="size-3.5" />}
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ChipGroup<T extends string | number>({
  disabled,
  items,
  onChange,
  value,
}: {
  disabled?: boolean
  items: Array<{ id: T; label: string }>
  onChange: (value: T) => void
  value: T
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            disabled={disabled}
            key={String(item.id)}
            type="button"
            className={clsx(
              'inline-flex items-center justify-center rounded-md px-2.5 py-1 text-label-12 font-medium transition-[color,background-color,box-shadow,scale] duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'bg-paper text-neutral-10 shadow-[inset_0_0_0_1px_var(--color-accent),0_1px_2px_rgba(0,0,0,0.05)] dark:bg-neutral-2'
                : 'bg-neutral-2 text-neutral-7 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] hover:bg-neutral-3 hover:text-neutral-10 dark:bg-neutral-1 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] dark:hover:bg-neutral-2',
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'
const PREVIEW_PADDING = 36
const PREVIEW_LOOP_PAUSE_MS = 700

function setPreviewCamera(
  map: MapLibreMap,
  camera: VideoCameraBounds,
  phase: TimelinePhase,
  lastFollowBounds: [[number, number], [number, number]] | null,
) {
  const bounds =
    phase.kind === 'return' && lastFollowBounds
      ? interpolateBounds(
          lastFollowBounds,
          camera.bounds,
          easeOutCubic(phase.localProgress),
        )
      : camera.bounds

  map.fitBounds(bounds as LngLatBoundsLike, {
    animate: false,
    maxZoom: 16,
    padding: PREVIEW_PADDING,
  })
}

function interpolateBounds(
  from: [[number, number], [number, number]],
  to: [[number, number], [number, number]],
  progress: number,
): [[number, number], [number, number]] {
  return [
    [
      from[0][0] + (to[0][0] - from[0][0]) * progress,
      from[0][1] + (to[0][1] - from[0][1]) * progress,
    ],
    [
      from[1][0] + (to[1][0] - from[1][0]) * progress,
      from[1][1] + (to[1][1] - from[1][1]) * progress,
    ],
  ]
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3
}

function exportProgressLabel(phase: 'idle' | ExportPhase) {
  if (phase === 'preparing') return 'Preparing'
  if (phase === 'rendering') return 'Rendering'
  if (phase === 'finalizing') return 'Finalizing'
  return 'Ready'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
