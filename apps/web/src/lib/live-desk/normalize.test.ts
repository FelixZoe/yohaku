import { describe, expect, it } from 'vitest'

import { normalizePublicLiveDeskState } from './normalize'

const createValidState = () => ({
  epoch: '01K0A5P1KD0QAFMZKVFNFC7AFN',
  projection: {
    application: {
      activity: {
        customLabel: null,
        key: 'editing',
      },
      displayName: 'Xcode',
      icon: {
        url: 'https://assets.example.com/apps/xcode.png',
      },
      window: null,
    },
    availability: 'active',
    expiresAt: '2026-07-16T12:01:30.180Z',
    media: {
      album: null,
      artwork: {
        url: `https://assets.example.com/media/current.png?v=${'a'.repeat(64)}`,
      },
      artist: 'Artist',
      kind: 'music',
      link: null,
      playback: {
        anchorAt: '2026-07-16T12:00:00.180Z',
        durationMs: 203_000,
        positionMs: 72_980,
        rate: 1,
        state: 'playing',
      },
      player: {
        displayName: 'Music',
      },
      sessionId: '01K0A5PXA7KPKN6VBYF6M52M2R',
      title: 'Track title',
    },
    updatedAt: '2026-07-16T12:00:00.180Z',
  },
  revision: 8451,
  schemaVersion: 2,
})

describe('normalizePublicLiveDeskState', () => {
  it('returns a fresh canonical state for a valid complete projection', () => {
    const input = createValidState()

    const result = normalizePublicLiveDeskState(input)

    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(result.projection).not.toBe(input.projection)
    expect(result.projection?.application).not.toBe(
      input.projection.application,
    )
    expect(result.projection?.media).not.toBe(input.projection.media)
  })

  it('accepts an initialized state with no public projection', () => {
    const input = {
      epoch: '01K0A5P1KD0QAFMZKVFNFC7AFN',
      projection: null,
      revision: 0,
      schemaVersion: 2,
    }

    expect(normalizePublicLiveDeskState(input)).toEqual(input)
  })

  it('requires v2 and a non-negative safe revision', () => {
    const unsupportedVersion = createValidState()
    unsupportedVersion.schemaVersion = 3

    expect(() => normalizePublicLiveDeskState(unsupportedVersion)).toThrow(
      '$.schemaVersion',
    )

    const unsafeRevision = createValidState()
    unsafeRevision.revision = Number.MAX_SAFE_INTEGER + 1

    expect(() => normalizePublicLiveDeskState(unsafeRevision)).toThrow(
      '$.revision',
    )
  })

  it('requires opaque UUID or ULID identifiers', () => {
    const invalidEpoch = createValidState()
    invalidEpoch.epoch = 'epoch-derived-from-site-name'

    expect(() => normalizePublicLiveDeskState(invalidEpoch)).toThrow('$.epoch')

    const invalidMediaSession = createValidState()
    invalidMediaSession.projection.media.sessionId = 'Track title'

    expect(() => normalizePublicLiveDeskState(invalidMediaSession)).toThrow(
      '$.projection.media.sessionId',
    )
  })

  it('accepts media-only activity when either title or artist is present', () => {
    const input = createValidState()
    const projection = input.projection as {
      application: unknown
      media: { title: unknown }
    }
    projection.application = null
    projection.media.title = null

    expect(normalizePublicLiveDeskState(input).projection).toMatchObject({
      application: null,
      availability: 'active',
      media: {
        artist: 'Artist',
        title: null,
      },
    })
  })

  it('requires every declared nullable field and rejects unknown fields', () => {
    const missingField = createValidState()
    delete (missingField.projection.media as unknown as Record<string, unknown>)
      .album

    expect(() => normalizePublicLiveDeskState(missingField)).toThrow(
      '$.projection.media.album',
    )

    const unknownField = createValidState() as unknown as Record<
      string,
      unknown
    >
    unknownField.deviceId = 'must-not-be-public'

    expect(() => normalizePublicLiveDeskState(unknownField)).toThrow(
      '$.deviceId',
    )
  })

  it('enforces availability and context consistency', () => {
    const activeWithoutContext = createValidState()
    const projectionWithoutContext = activeWithoutContext.projection as {
      application: unknown
      media: unknown
    }
    projectionWithoutContext.application = null
    projectionWithoutContext.media = null

    expect(() => normalizePublicLiveDeskState(activeWithoutContext)).toThrow(
      'active projection must include application or media',
    )

    const idleWithContext = createValidState()
    idleWithContext.projection.availability = 'idle'

    expect(() => normalizePublicLiveDeskState(idleWithContext)).toThrow(
      'idle projection must not include application or media',
    )
  })

  it('rejects non-canonical timestamps and non-positive leases', () => {
    const nonCanonical = createValidState()
    nonCanonical.projection.updatedAt = '2026-07-16T12:00:00Z'

    expect(() => normalizePublicLiveDeskState(nonCanonical)).toThrow(
      '$.projection.updatedAt',
    )

    const expired = createValidState()
    expired.projection.expiresAt = expired.projection.updatedAt

    expect(() => normalizePublicLiveDeskState(expired)).toThrow(
      'must be later than updatedAt',
    )
  })

  it('enforces playback rate and position invariants', () => {
    const stoppedPlaying = createValidState()
    stoppedPlaying.projection.media.playback.rate = 0

    expect(() => normalizePublicLiveDeskState(stoppedPlaying)).toThrow(
      'playing playback must have a positive rate',
    )

    const overshot = createValidState()
    overshot.projection.media.playback.positionMs = 204_000

    expect(() => normalizePublicLiveDeskState(overshot)).toThrow(
      'must not exceed durationMs',
    )
  })

  it('rejects non-HTTPS application icons', () => {
    const input = createValidState()
    input.projection.application.icon.url =
      'http://assets.example.com/apps/xcode.png'

    expect(() => normalizePublicLiveDeskState(input)).toThrow(
      'expected an HTTPS URL',
    )
  })

  it('accepts legacy media without artwork and rejects unversioned artwork', () => {
    const legacy = createValidState()
    delete (legacy.projection.media as unknown as Record<string, unknown>)
      .artwork

    expect(
      normalizePublicLiveDeskState(legacy).projection?.media?.artwork,
    ).toBeNull()

    const unversioned = createValidState()
    unversioned.projection.media.artwork.url =
      'https://assets.example.com/media/current.png'
    expect(() => normalizePublicLiveDeskState(unversioned)).toThrow(
      'expected one lowercase SHA-256 v query parameter',
    )
  })

  it('accepts legacy media without a link and validates canonical provider links', () => {
    const legacy = createValidState()
    delete (legacy.projection.media as unknown as Record<string, unknown>).link
    expect(
      normalizePublicLiveDeskState(legacy).projection?.media?.link,
    ).toBeNull()

    const qqMusic = createValidState()
    ;(qqMusic.projection.media as unknown as Record<string, unknown>).link = {
      url: 'https://y.qq.com/n/ryqq/songDetail/001lzbAN14boA4',
    }
    expect(
      normalizePublicLiveDeskState(qqMusic).projection?.media?.link,
    ).toEqual(qqMusic.projection.media.link)

    const netEaseMusic = createValidState()
    ;(
      netEaseMusic.projection.media as unknown as Record<string, unknown>
    ).link = {
      url: 'https://music.163.com/song?id=3339827986',
    }
    expect(
      normalizePublicLiveDeskState(netEaseMusic).projection?.media?.link,
    ).toEqual(netEaseMusic.projection.media.link)

    const spoofedHost = createValidState()
    ;(spoofedHost.projection.media as unknown as Record<string, unknown>).link =
      {
        url: 'https://y.qq.com.example.com/n/ryqq/songDetail/001lzbAN14boA4',
      }
    expect(() => normalizePublicLiveDeskState(spoofedHost)).toThrow(
      'expected a supported media provider hostname',
    )
  })

  it('rejects media without a displayable identity', () => {
    const input = createValidState()
    const media = input.projection.media as {
      artist: unknown
      title: unknown
    }
    media.artist = null
    media.title = null

    expect(() => normalizePublicLiveDeskState(input)).toThrow(
      'media must include a title or artist',
    )
  })

  it('rejects non-canonical user-facing strings', () => {
    const input = createValidState()
    input.projection.application.displayName = ' Xcode'

    expect(() => normalizePublicLiveDeskState(input)).toThrow(
      'must not contain edge whitespace',
    )
  })
})
