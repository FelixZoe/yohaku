'use client'

import { clsx } from 'clsx'
import { useMemo, useState } from 'react'

import { MapBlock } from '~/components/ui/map-block'
import type { MapTrackData } from '~/components/ui/map-block/types'
import { gpxToMapTrack } from '~/lib/gpx-to-track.client'

type Mode = 'full' | 'compressed'

type ParseResult =
  | { kind: 'idle' }
  | { kind: 'ok'; track: MapTrackData }
  | { kind: 'error'; message: string }

const COMPRESSED_TARGET = 450

export function GpxUploadPreview() {
  const [rawText, setRawText] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('full')
  const [readError, setReadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const result = useMemo<ParseResult>(() => {
    if (!rawText) return { kind: 'idle' }
    try {
      return {
        kind: 'ok',
        track: gpxToMapTrack(rawText, {
          fileName: fileName ?? undefined,
          targetPoints: mode === 'compressed' ? COMPRESSED_TARGET : undefined,
        }),
      }
    } catch (err) {
      return {
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }, [rawText, fileName, mode])

  const track = result.kind === 'ok' ? result.track : null
  const errorMessage =
    readError ?? (result.kind === 'error' ? result.message : null)

  const handleFile = async (file: File) => {
    setReadError(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      setRawText(text)
    } catch (err) {
      setReadError(err instanceof Error ? err.message : String(err))
      setRawText(null)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        Upload GPX
      </h2>

      <label
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-paper px-4 py-10 text-sm transition-colors',
          dragging
            ? 'border-accent text-neutral-10'
            : 'border-border text-neutral-7 hover:border-accent hover:text-neutral-9',
        )}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragging(false)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file) void handleFile(file)
        }}
      >
        <span className="font-medium">Drop or click to choose a .gpx file</span>
        <span className="text-xs text-neutral-6">
          Parsed in-browser via DOMParser · no upload
        </span>
        {fileName && (
          <span className="mt-1 truncate text-xs text-neutral-8">
            {fileName}
          </span>
        )}
        <input
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          className="hidden"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />
      </label>

      {rawText && <ModeToggle mode={mode} onChange={setMode} />}

      {errorMessage && (
        <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {errorMessage}
        </p>
      )}

      {track && (
        <MapBlock
          className="my-0"
          height={460}
          key={`${fileName}-${mode}`}
          track={track}
        />
      )}
    </section>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (next: Mode) => void
}) {
  const items = [
    { id: 'full' as const, label: 'Full' },
    { id: 'compressed' as const, label: `RDP · ${COMPRESSED_TARGET} pts` },
  ]
  return (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-border">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={clsx(
            'px-3 py-1 text-xs font-medium transition-colors',
            mode === item.id
              ? 'bg-neutral-3 text-neutral-10 dark:bg-neutral-4'
              : 'text-neutral-7 hover:bg-neutral-2 hover:text-neutral-9 dark:hover:bg-neutral-3',
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
