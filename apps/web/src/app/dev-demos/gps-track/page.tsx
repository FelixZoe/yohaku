import { MapBlock } from '~/components/ui/map-block'

import { GpxUploadPreview } from './_components/gpx-upload-preview'
import { LEGS_SAMPLE_TRACK } from './_components/legs-sample'

const TOKYO_POIS = [
  { lat: 35.6586, lon: 139.7454, title: 'Tokyo Tower' },
  { lat: 35.7101, lon: 139.8107, title: 'Tokyo Skytree' },
  { lat: 35.6852, lon: 139.71, title: 'Shinjuku Gyoen' },
]

export default function GpsTrackDevPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
          Dev Preview
        </p>
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
          Map Block
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Stacked comparison of the same GPX track rendered with and without RDP
          simplification. Inferred stops are computed from full GPS samples
          regardless of route simplification.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          POI-only · 3 places · no track
        </h2>
        <MapBlock
          className="my-0"
          height={460}
          pois={TOKYO_POIS}
          title="Tokyo highlights"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          Multi-leg · 3 journeys in one map
        </h2>
        <MapBlock
          className="my-0"
          height={460}
          title="Kansai by bike"
          track={LEGS_SAMPLE_TRACK}
        />
      </section>

      <GpxUploadPreview />
    </main>
  )
}
