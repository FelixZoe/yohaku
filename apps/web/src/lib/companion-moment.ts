import { isRecord } from '~/lib/is-record'

export type CompanionMomentApplication = {
  displayName: string
  activity: { key: string | null; customLabel: string | null } | null
  window: { title: string } | null
  icon: { url: string } | null
}

export type CompanionMomentMedia = {
  kind: 'music' | 'podcast' | 'video' | 'unknown'
  title: string | null
  artist: string | null
  album: string | null
  player: { displayName: string } | null
  playback: {
    state: 'playing' | 'paused'
    durationMs: number | null
    positionMs: number | null
  }
  artwork: { url: string } | null
  link: { url: string } | null
}

export type CompanionMomentMetadata = {
  kind: 'companion-moment'
  schemaVersion: 1
  observedAt: string
  application: CompanionMomentApplication | null
  media: CompanionMomentMedia | null
}

const nullableString = (value: unknown): string | null | undefined =>
  value === null ? null : typeof value === 'string' ? value : undefined

const nullableNonNegativeInteger = (
  value: unknown,
): number | null | undefined =>
  value === null
    ? null
    : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? value
      : undefined

const parseHttpsURL = (value: unknown): { url: string } | null | undefined => {
  if (value === null) return null
  if (!isRecord(value) || typeof value.url !== 'string') return undefined
  try {
    const url = new URL(value.url)
    return url.protocol === 'https:' && !url.username && !url.password
      ? { url: value.url }
      : undefined
  } catch {
    return undefined
  }
}

const parseApplication = (
  value: unknown,
): CompanionMomentApplication | null | undefined => {
  if (value === null) return null
  if (!isRecord(value) || typeof value.displayName !== 'string')
    return undefined

  let activity: CompanionMomentApplication['activity']
  if (value.activity === null) {
    activity = null
  } else if (isRecord(value.activity)) {
    const key = nullableString(value.activity.key)
    const customLabel = nullableString(value.activity.customLabel)
    if (key === undefined || customLabel === undefined) return undefined
    activity = { key, customLabel }
  } else {
    return undefined
  }

  let window: CompanionMomentApplication['window']
  if (value.window === null) window = null
  else if (isRecord(value.window) && typeof value.window.title === 'string')
    window = { title: value.window.title }
  else return undefined

  const icon = parseHttpsURL(value.icon)
  if (icon === undefined) return undefined
  return { displayName: value.displayName, activity, window, icon }
}

const parseMedia = (
  value: unknown,
): CompanionMomentMedia | null | undefined => {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  if (!['music', 'podcast', 'video', 'unknown'].includes(String(value.kind)))
    return undefined

  const title = nullableString(value.title)
  const artist = nullableString(value.artist)
  const album = nullableString(value.album)
  if (title === undefined || artist === undefined || album === undefined)
    return undefined

  let player: CompanionMomentMedia['player']
  if (value.player === null) player = null
  else if (
    isRecord(value.player) &&
    typeof value.player.displayName === 'string'
  )
    player = { displayName: value.player.displayName }
  else return undefined

  if (!isRecord(value.playback)) return undefined
  if (!['playing', 'paused'].includes(String(value.playback.state)))
    return undefined
  const durationMs = nullableNonNegativeInteger(value.playback.durationMs)
  const positionMs = nullableNonNegativeInteger(value.playback.positionMs)
  if (durationMs === undefined || positionMs === undefined) return undefined

  const artwork = parseHttpsURL(value.artwork)
  const link = parseHttpsURL(value.link)
  if (artwork === undefined || link === undefined) return undefined

  return {
    kind: value.kind as CompanionMomentMedia['kind'],
    title,
    artist,
    album,
    player,
    playback: {
      state: value.playback.state as 'playing' | 'paused',
      durationMs,
      positionMs,
    },
    artwork,
    link,
  }
}

export const parseCompanionMomentMetadata = (
  metadata: unknown,
): CompanionMomentMetadata | null => {
  if (
    !isRecord(metadata) ||
    metadata.kind !== 'companion-moment' ||
    metadata.schemaVersion !== 1 ||
    typeof metadata.observedAt !== 'string' ||
    Number.isNaN(Date.parse(metadata.observedAt))
  ) {
    return null
  }
  const application = parseApplication(metadata.application)
  const media = parseMedia(metadata.media)
  if (application === undefined || media === undefined) return null
  return {
    kind: 'companion-moment',
    schemaVersion: 1,
    observedAt: metadata.observedAt,
    application,
    media,
  }
}

export const formatPlaybackTime = (milliseconds: number): string => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

export const companionMomentSummary = (
  metadata: CompanionMomentMetadata,
): string => {
  const mediaIdentity = [metadata.media?.title, metadata.media?.artist]
    .filter(Boolean)
    .join(' — ')
  if (mediaIdentity) return mediaIdentity
  return metadata.application?.displayName ?? ''
}
