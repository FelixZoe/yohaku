import type {
  LiveDeskAvailability,
  MediaKind,
  MediaPlaybackState,
  PublicApplicationActivityV2,
  PublicApplicationPresenceV2,
  PublicLiveDeskProjectionV2,
  PublicLiveDeskStateV2,
  PublicMediaPlaybackV2,
  PublicMediaPresenceV2,
} from '~/models/live-desk'

type UnknownRecord = Record<string, unknown>

const ACTIVITY_KEY_PATTERN = /^[a-z][\d.a-z-]{0,63}$/
const ULID_PATTERN = /^[\dA-HJKMNP-TV-Z]{26}$/
const UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
const RFC_3339_UTC_MILLISECONDS_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

const APPLICATION_KEYS = ['activity', 'displayName', 'icon', 'window'] as const
const APPLICATION_ACTIVITY_KEYS = ['customLabel', 'key'] as const
const ICON_KEYS = ['url'] as const
const MEDIA_ARTWORK_KEYS = ['url'] as const
const MEDIA_LINK_KEYS = ['url'] as const
const MEDIA_KEYS = [
  'album',
  'artwork',
  'artist',
  'kind',
  'link',
  'playback',
  'player',
  'sessionId',
  'title',
] as const
const MEDIA_PLAYBACK_KEYS = [
  'anchorAt',
  'durationMs',
  'positionMs',
  'rate',
  'state',
] as const
const PLAYER_KEYS = ['displayName'] as const
const PROJECTION_KEYS = [
  'application',
  'availability',
  'expiresAt',
  'media',
  'updatedAt',
] as const
const STATE_KEYS = ['epoch', 'projection', 'revision', 'schemaVersion'] as const
const WINDOW_KEYS = ['title'] as const

const MEDIA_KINDS = new Set<MediaKind>(['music', 'podcast', 'unknown', 'video'])
const MEDIA_PLAYBACK_STATES = new Set<MediaPlaybackState>(['paused', 'playing'])

export class LiveDeskStateValidationError extends TypeError {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`Invalid Live Desk state at ${path}: ${message}`)
    this.name = 'LiveDeskStateValidationError'
  }
}

function invalid(path: string, message: string): never {
  throw new LiveDeskStateValidationError(path, message)
}

const isPlainObject = (value: unknown): value is UnknownRecord => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const normalizeExactObject = <TKey extends string>(
  value: unknown,
  path: string,
  expectedKeys: readonly TKey[],
): Record<TKey, unknown> => {
  if (!isPlainObject(value)) invalid(path, 'expected an object')

  const expectedKeySet = new Set<string>(expectedKeys)
  for (const key of Object.keys(value)) {
    if (!expectedKeySet.has(key)) invalid(`${path}.${key}`, 'unknown field')
  }

  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      invalid(`${path}.${key}`, 'required field is missing')
    }
  }

  return value as Record<TKey, unknown>
}

const normalizeCanonicalString = (
  value: unknown,
  path: string,
  maximumScalarCount: number,
): string => {
  if (typeof value !== 'string') invalid(path, 'expected a string')
  if (value.length === 0) invalid(path, 'must not be empty')
  if (value !== value.trim()) invalid(path, 'must not contain edge whitespace')
  if (value !== value.normalize('NFC')) {
    invalid(path, 'must use Unicode NFC normalization')
  }
  if ([...value].length > maximumScalarCount) {
    invalid(path, `must not exceed ${maximumScalarCount} Unicode scalars`)
  }

  return value
}

const normalizeNullableCanonicalString = (
  value: unknown,
  path: string,
  maximumScalarCount: number,
): string | null =>
  value === null
    ? null
    : normalizeCanonicalString(value, path, maximumScalarCount)

const normalizeIdentifier = (value: unknown, path: string): string => {
  const identifier = normalizeCanonicalString(value, path, 36)
  if (!ULID_PATTERN.test(identifier) && !UUID_PATTERN.test(identifier)) {
    invalid(path, 'expected a UUID or ULID')
  }
  return identifier
}

const normalizeTimestamp = (value: unknown, path: string): string => {
  if (typeof value !== 'string') invalid(path, 'expected a timestamp string')
  if (!RFC_3339_UTC_MILLISECONDS_PATTERN.test(value)) {
    invalid(path, 'expected RFC 3339 UTC with millisecond precision')
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== value) {
    invalid(path, 'expected a valid canonical UTC timestamp')
  }

  return value
}

const normalizeNonNegativeSafeInteger = (
  value: unknown,
  path: string,
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    invalid(path, 'expected a non-negative safe integer')
  }

  return value
}

const normalizeNullableNonNegativeSafeInteger = (
  value: unknown,
  path: string,
): number | null =>
  value === null ? null : normalizeNonNegativeSafeInteger(value, path)

const normalizeActivity = (
  value: unknown,
  path: string,
): PublicApplicationActivityV2 => {
  const activity = normalizeExactObject(value, path, APPLICATION_ACTIVITY_KEYS)
  const key =
    activity.key === null
      ? null
      : normalizeCanonicalString(activity.key, `${path}.key`, 64)

  if (key !== null && !ACTIVITY_KEY_PATTERN.test(key)) {
    invalid(`${path}.key`, 'does not match the activity key grammar')
  }

  return {
    customLabel: normalizeNullableCanonicalString(
      activity.customLabel,
      `${path}.customLabel`,
      80,
    ),
    key,
  }
}

const normalizeHttpsUrl = (value: unknown, path: string): string => {
  const url = normalizeCanonicalString(value, path, 2048)
  if (new TextEncoder().encode(url).byteLength > 2048) {
    invalid(path, 'must not exceed 2048 bytes')
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    invalid(path, 'expected an absolute URL')
  }

  if (parsed.protocol !== 'https:') invalid(path, 'expected an HTTPS URL')
  if (!parsed.hostname) invalid(path, 'expected a URL hostname')
  if (parsed.username || parsed.password) {
    invalid(path, 'URL credentials are not permitted')
  }

  return url
}

const normalizeMediaArtworkUrl = (value: unknown, path: string): string => {
  const url = normalizeHttpsUrl(value, path)
  const parsed = new URL(url)
  const parameters = Array.from(parsed.searchParams.entries())
  if (parsed.hash) invalid(path, 'URL fragments are not permitted')
  if (
    parameters.length !== 1 ||
    parameters[0]?.[0] !== 'v' ||
    !/^[\da-f]{64}$/.test(parameters[0]?.[1] ?? '')
  ) {
    invalid(path, 'expected one lowercase SHA-256 v query parameter')
  }
  return url
}

const normalizeMediaLinkUrl = (value: unknown, path: string): string => {
  const url = normalizeHttpsUrl(value, path)
  const parsed = new URL(url)
  if (parsed.port || parsed.hash) {
    invalid(path, 'URL ports and fragments are not permitted')
  }

  if (parsed.hostname === 'y.qq.com') {
    if (
      parsed.search ||
      !/^\/n\/ryqq\/songDetail\/[\dA-Za-z]{14}$/.test(parsed.pathname)
    ) {
      invalid(path, 'expected a canonical QQ Music song URL')
    }
    return url
  }

  if (parsed.hostname === 'music.163.com') {
    const parameters = Array.from(parsed.searchParams.entries())
    if (
      parsed.pathname !== '/song' ||
      parameters.length !== 1 ||
      parameters[0]?.[0] !== 'id' ||
      !/^(?!0$)\d{1,20}$/.test(parameters[0]?.[1] ?? '')
    ) {
      invalid(path, 'expected a canonical NetEase Music song URL')
    }
    return url
  }

  invalid(path, 'expected a supported media provider hostname')
}

const normalizeApplication = (
  value: unknown,
  path: string,
): PublicApplicationPresenceV2 => {
  const application = normalizeExactObject(value, path, APPLICATION_KEYS)

  const activity =
    application.activity === null
      ? null
      : normalizeActivity(application.activity, `${path}.activity`)

  const icon =
    application.icon === null
      ? null
      : (() => {
          const iconValue = normalizeExactObject(
            application.icon,
            `${path}.icon`,
            ICON_KEYS,
          )
          return {
            url: normalizeHttpsUrl(iconValue.url, `${path}.icon.url`),
          }
        })()

  const window =
    application.window === null
      ? null
      : (() => {
          const windowValue = normalizeExactObject(
            application.window,
            `${path}.window`,
            WINDOW_KEYS,
          )
          return {
            title: normalizeCanonicalString(
              windowValue.title,
              `${path}.window.title`,
              500,
            ),
          }
        })()

  return {
    activity,
    displayName: normalizeCanonicalString(
      application.displayName,
      `${path}.displayName`,
      120,
    ),
    icon,
    window,
  }
}

const normalizeMediaPlayback = (
  value: unknown,
  path: string,
): PublicMediaPlaybackV2 => {
  const playback = normalizeExactObject(value, path, MEDIA_PLAYBACK_KEYS)
  const durationMs = normalizeNullableNonNegativeSafeInteger(
    playback.durationMs,
    `${path}.durationMs`,
  )
  const positionMs = normalizeNullableNonNegativeSafeInteger(
    playback.positionMs,
    `${path}.positionMs`,
  )

  if (durationMs !== null && positionMs !== null && positionMs > durationMs) {
    invalid(`${path}.positionMs`, 'must not exceed durationMs')
  }

  if (
    typeof playback.rate !== 'number' ||
    !Number.isFinite(playback.rate) ||
    playback.rate < 0 ||
    playback.rate > 4 ||
    Object.is(playback.rate, -0)
  ) {
    invalid(`${path}.rate`, 'expected a finite number from 0 through 4')
  }

  if (
    typeof playback.state !== 'string' ||
    !MEDIA_PLAYBACK_STATES.has(playback.state as MediaPlaybackState)
  ) {
    invalid(`${path}.state`, 'expected playing or paused')
  }

  const state = playback.state as MediaPlaybackState
  if (state === 'paused' && playback.rate !== 0) {
    invalid(`${path}.rate`, 'paused playback must have rate 0')
  }
  if (state === 'playing' && playback.rate <= 0) {
    invalid(`${path}.rate`, 'playing playback must have a positive rate')
  }

  return {
    anchorAt: normalizeTimestamp(playback.anchorAt, `${path}.anchorAt`),
    durationMs,
    positionMs,
    rate: playback.rate,
    state,
  }
}

const normalizeMedia = (
  value: unknown,
  path: string,
): PublicMediaPresenceV2 => {
  if (!isPlainObject(value)) invalid(path, 'expected an object')
  const media = normalizeExactObject(
    {
      ...value,
      artwork: Object.prototype.hasOwnProperty.call(value, 'artwork')
        ? value.artwork
        : null,
      link: Object.prototype.hasOwnProperty.call(value, 'link')
        ? value.link
        : null,
    },
    path,
    MEDIA_KEYS,
  )
  if (
    typeof media.kind !== 'string' ||
    !MEDIA_KINDS.has(media.kind as MediaKind)
  ) {
    invalid(`${path}.kind`, 'expected a supported media kind')
  }

  const artist = normalizeNullableCanonicalString(
    media.artist,
    `${path}.artist`,
    300,
  )
  const title = normalizeNullableCanonicalString(
    media.title,
    `${path}.title`,
    300,
  )
  if (artist === null && title === null) {
    invalid(path, 'media must include a title or artist')
  }

  const player =
    media.player === null
      ? null
      : (() => {
          const playerValue = normalizeExactObject(
            media.player,
            `${path}.player`,
            PLAYER_KEYS,
          )
          return {
            displayName: normalizeCanonicalString(
              playerValue.displayName,
              `${path}.player.displayName`,
              120,
            ),
          }
        })()

  const artwork =
    media.artwork === null
      ? null
      : (() => {
          const artworkValue = normalizeExactObject(
            media.artwork,
            `${path}.artwork`,
            MEDIA_ARTWORK_KEYS,
          )
          return {
            url: normalizeMediaArtworkUrl(
              artworkValue.url,
              `${path}.artwork.url`,
            ),
          }
        })()

  const link =
    media.link === null
      ? null
      : (() => {
          const linkValue = normalizeExactObject(
            media.link,
            `${path}.link`,
            MEDIA_LINK_KEYS,
          )
          return {
            url: normalizeMediaLinkUrl(linkValue.url, `${path}.link.url`),
          }
        })()

  return {
    album: normalizeNullableCanonicalString(media.album, `${path}.album`, 300),
    artwork,
    artist,
    kind: media.kind as MediaKind,
    link,
    playback: normalizeMediaPlayback(media.playback, `${path}.playback`),
    player,
    sessionId: normalizeIdentifier(media.sessionId, `${path}.sessionId`),
    title,
  }
}

const normalizeAvailability = (
  value: unknown,
  path: string,
): LiveDeskAvailability => {
  if (value !== 'active' && value !== 'idle') {
    invalid(path, 'expected active or idle')
  }
  return value
}

const normalizeProjection = (
  value: unknown,
  path: string,
): PublicLiveDeskProjectionV2 => {
  const projection = normalizeExactObject(value, path, PROJECTION_KEYS)
  const application =
    projection.application === null
      ? null
      : normalizeApplication(projection.application, `${path}.application`)
  const availability = normalizeAvailability(
    projection.availability,
    `${path}.availability`,
  )
  const expiresAt = normalizeTimestamp(
    projection.expiresAt,
    `${path}.expiresAt`,
  )
  const media =
    projection.media === null
      ? null
      : normalizeMedia(projection.media, `${path}.media`)
  const updatedAt = normalizeTimestamp(
    projection.updatedAt,
    `${path}.updatedAt`,
  )

  if (new Date(expiresAt).getTime() <= new Date(updatedAt).getTime()) {
    invalid(`${path}.expiresAt`, 'must be later than updatedAt')
  }

  if (availability === 'active' && application === null && media === null) {
    invalid(path, 'active projection must include application or media')
  }
  if (availability === 'idle' && (application !== null || media !== null)) {
    invalid(path, 'idle projection must not include application or media')
  }

  return {
    application,
    availability,
    expiresAt,
    media,
    updatedAt,
  }
}

export const normalizePublicLiveDeskState = (
  value: unknown,
): PublicLiveDeskStateV2 => {
  const state = normalizeExactObject(value, '$', STATE_KEYS)

  if (state.schemaVersion !== 2) {
    invalid('$.schemaVersion', 'expected schema version 2')
  }

  return {
    epoch: normalizeIdentifier(state.epoch, '$.epoch'),
    projection:
      state.projection === null
        ? null
        : normalizeProjection(state.projection, '$.projection'),
    revision: normalizeNonNegativeSafeInteger(state.revision, '$.revision'),
    schemaVersion: 2,
  }
}
