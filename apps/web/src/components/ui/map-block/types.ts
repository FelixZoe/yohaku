import type {
  MapBlockProps as MxMapBlockProps,
  MapMerchant,
  MapPoi,
  MapTrackBounds,
  MapTrackData as MxMapTrackData,
  MapTrackPointTuple,
  MapTrackStop,
  MapView,
} from '@mx-space/editor'

export type {
  MapMerchant,
  MapPoi,
  MapTrackBounds,
  MapTrackPointTuple,
  MapTrackStop,
  MapView,
}

export interface MapTrackLeg {
  distanceMeters?: number
  endTimeMs?: number
  segments: [from: number, to: number]
  startTimeMs?: number
  title: string
}

export interface MapTrackData extends MxMapTrackData {
  legs?: MapTrackLeg[]
  segments?: MapTrackPointTuple[][]
}

export interface MapBlockProps extends Omit<MxMapBlockProps, 'track'> {
  locale?: string
  stopPopoverMinDurationSec?: number
  track?: MapTrackData
}
