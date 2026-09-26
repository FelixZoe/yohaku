export type LiveDeskAvailability = 'active' | 'idle'

export type LiveDeskPhase =
  'active' | 'disabled' | 'idle' | 'loading' | 'offline' | 'quiet'

export type LiveDeskTransport = 'rest' | 'socket'

export type MediaKind = 'music' | 'podcast' | 'unknown' | 'video'

export type MediaPlaybackState = 'paused' | 'playing'

export interface PublicApplicationActivityV2 {
  readonly customLabel: string | null
  readonly key: string | null
}

export interface PublicApplicationPresenceV2 {
  readonly activity: PublicApplicationActivityV2 | null
  readonly displayName: string
  readonly icon: { readonly url: string } | null
  readonly window: { readonly title: string } | null
}

export interface PublicMediaPlaybackV2 {
  readonly anchorAt: string
  readonly durationMs: number | null
  readonly positionMs: number | null
  readonly rate: number
  readonly state: MediaPlaybackState
}

export interface PublicMediaPresenceV2 {
  readonly album: string | null
  readonly artist: string | null
  readonly artwork: { readonly url: string } | null
  readonly kind: MediaKind
  readonly link?: { readonly url: string } | null
  readonly playback: PublicMediaPlaybackV2
  readonly player: { readonly displayName: string } | null
  readonly sessionId: string
  readonly title: string | null
}

export interface PublicLiveDeskProjectionV2 {
  readonly application: PublicApplicationPresenceV2 | null
  readonly availability: LiveDeskAvailability
  readonly expiresAt: string
  readonly media: PublicMediaPresenceV2 | null
  readonly updatedAt: string
}

export interface PublicLiveDeskStateV2 {
  readonly epoch: string
  readonly projection: PublicLiveDeskProjectionV2 | null
  readonly revision: number
  readonly schemaVersion: 2
}

export interface LiveDeskState {
  readonly phase: LiveDeskPhase
  readonly publicState: PublicLiveDeskStateV2 | null
  readonly transport: LiveDeskTransport
}
