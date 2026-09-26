'use client'

import type { MapPoi, MapView } from '@mx-space/editor'
import type { MapSlotProps } from '@yohaku/rich-content/host'
import dynamic from 'next/dynamic'

const MAP_AREA_HEIGHT = 460

function MapBlockPlaceholder() {
  return (
    <figure
      aria-hidden
      className="not-prose my-6 overflow-hidden rounded-xl bg-neutral-1 font-sans ring-1 ring-border dark:bg-neutral-2"
    >
      <div className="relative" style={{ height: MAP_AREA_HEIGHT }} />
      <div className="min-h-[68px] border-t border-border bg-paper px-4 py-3 dark:bg-neutral-3" />
    </figure>
  )
}

const DynamicMapBlock = dynamic(
  () => import('~/components/ui/map-block').then((mod) => mod.MapBlock),
  { loading: () => <MapBlockPlaceholder />, ssr: false },
)

export function YohakuMapRenderer({
  locale,
  pois,
  title,
  track,
  view,
}: MapSlotProps) {
  return (
    <DynamicMapBlock
      className="font-sans"
      locale={locale}
      pois={pois as MapPoi[] | undefined}
      src={track?.url}
      title={title}
      view={view as MapView | undefined}
    />
  )
}
