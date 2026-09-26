import type {
  LiveDeskState,
  MediaKind,
  MediaPlaybackState,
} from '~/models/live-desk'

export interface LiveDeskApplicationPresentation {
  readonly detail: string | null
  readonly displayName: string
  readonly iconURL: string | null
}

export interface LiveDeskMediaPresentation {
  readonly album: string | null
  readonly anchorAt: string
  readonly artist: string | null
  readonly artworkURL: string | null
  readonly durationMs: number | null
  readonly kind: MediaKind
  readonly playbackState: MediaPlaybackState
  readonly playbackURL: string | null
  readonly playerDisplayName: string | null
  readonly positionMs: number | null
  readonly rate: number
  readonly title: string | null
}

export type LiveDeskPresentation =
  | { readonly visible: false }
  | {
      readonly application: LiveDeskApplicationPresentation | null
      readonly kind: 'live-desk'
      readonly media: LiveDeskMediaPresentation | null
      readonly mode: 'application' | 'application-media' | 'media'
      readonly updatedAt: string
      readonly visible: true
    }

const hiddenPresentation = { visible: false } as const

const normalizedOptionalText = (value: string | null | undefined) => {
  const normalized = value?.trim()
  return normalized || null
}

export const buildMediaByline = (
  media: Pick<LiveDeskMediaPresentation, 'album' | 'artist' | 'title'>,
): string | null => {
  const artist = media.title ? media.artist : null
  const album =
    media.album && media.album !== media.title && media.album !== media.artist
      ? media.album
      : null
  return [artist, album].filter(Boolean).join(' · ') || null
}

export const projectMediaPositionMs = (
  media: LiveDeskMediaPresentation,
  now: number,
): number | null => {
  if (media.positionMs === null) return null

  const elapsedMs = Math.max(0, now - Date.parse(media.anchorAt))
  const projected =
    media.playbackState === 'playing'
      ? media.positionMs + elapsedMs * media.rate
      : media.positionMs

  return Math.round(
    media.durationMs === null
      ? Math.max(0, projected)
      : Math.min(media.durationMs, Math.max(0, projected)),
  )
}

export const createLiveDeskPresentation = (
  state: LiveDeskState,
  now: number,
): LiveDeskPresentation => {
  if (state.phase !== 'active') return hiddenPresentation

  const projection = state.publicState?.projection
  if (
    !projection ||
    projection.availability !== 'active' ||
    Date.parse(projection.expiresAt) <= now
  ) {
    return hiddenPresentation
  }

  const application = projection.application
    ? {
        detail:
          normalizedOptionalText(
            projection.application.activity?.customLabel,
          ) ?? normalizedOptionalText(projection.application.window?.title),
        displayName: projection.application.displayName,
        iconURL: projection.application.icon?.url ?? null,
      }
    : null

  const media = projection.media
    ? {
        album: normalizedOptionalText(projection.media.album),
        artworkURL: projection.media.artwork?.url ?? null,
        anchorAt: projection.media.playback.anchorAt,
        artist: normalizedOptionalText(projection.media.artist),
        durationMs: projection.media.playback.durationMs,
        kind: projection.media.kind,
        playbackState: projection.media.playback.state,
        playbackURL: projection.media.link?.url ?? null,
        playerDisplayName: normalizedOptionalText(
          projection.media.player?.displayName,
        ),
        positionMs: projection.media.playback.positionMs,
        rate: projection.media.playback.rate,
        title: normalizedOptionalText(projection.media.title),
      }
    : null

  if (!application && !media) return hiddenPresentation

  return {
    application,
    kind: 'live-desk',
    media,
    mode: application ? (media ? 'application-media' : 'application') : 'media',
    updatedAt: projection.updatedAt,
    visible: true,
  }
}
