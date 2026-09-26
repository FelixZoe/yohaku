import { describe, expect, it } from 'vitest'

import type { LiveDeskState, PublicLiveDeskStateV2 } from '~/models/live-desk'

import {
  buildMediaByline,
  createLiveDeskPresentation,
  projectMediaPositionMs,
} from './presentation'

const NOW = Date.parse('2026-07-16T12:00:00.000Z')

const createPublicState = (
  overrides: Partial<NonNullable<PublicLiveDeskStateV2['projection']>> = {},
): PublicLiveDeskStateV2 => ({
  epoch: '01K0A5P1KD0QAFMZKVFNFC7AFN',
  projection: {
    application: {
      activity: null,
      displayName: 'Google Chrome',
      icon: null,
      window: null,
    },
    availability: 'active',
    expiresAt: '2026-07-16T12:01:30.000Z',
    media: null,
    updatedAt: '2026-07-16T12:00:00.000Z',
    ...overrides,
  },
  revision: 7,
  schemaVersion: 2,
})

const createState = (
  publicState: PublicLiveDeskStateV2 | null = createPublicState(),
  phase: LiveDeskState['phase'] = 'active',
): LiveDeskState => ({
  phase,
  publicState,
  transport: 'rest',
})

describe('createLiveDeskPresentation', () => {
  it.each(['disabled', 'idle', 'loading', 'offline', 'quiet'] as const)(
    'hides the paper slips while Live Desk is %s',
    (phase) => {
      expect(createLiveDeskPresentation(createState(null, phase), NOW)).toEqual(
        {
          visible: false,
        },
      )
    },
  )

  it('maps a sanitized application projection without inventing reading state', () => {
    const publicState = createPublicState({
      application: {
        activity: {
          customLabel: 'Reading a draft',
          key: 'reading-session-looking-key',
        },
        displayName: 'Google Chrome',
        icon: { url: 'https://assets.example/chrome.png' },
        window: { title: 'Private window title' },
      },
    })

    expect(createLiveDeskPresentation(createState(publicState), NOW)).toEqual({
      application: {
        detail: 'Reading a draft',
        displayName: 'Google Chrome',
        iconURL: 'https://assets.example/chrome.png',
      },
      kind: 'live-desk',
      media: null,
      mode: 'application',
      updatedAt: '2026-07-16T12:00:00.000Z',
      visible: true,
    })
  })

  it('keeps title-only media visible without requiring application context', () => {
    const publicState = createPublicState({
      application: null,
      media: {
        album: null,
        artwork: null,
        artist: null,
        kind: 'podcast',
        playback: {
          anchorAt: '2026-07-16T12:00:00.000Z',
          durationMs: null,
          positionMs: null,
          rate: 1,
          state: 'paused',
        },
        player: { displayName: 'Podcasts' },
        sessionId: '01K0A5P1KD0QAFMZKVFNFC7AFP',
        title: 'Design Details',
      },
    })

    expect(
      createLiveDeskPresentation(createState(publicState), NOW),
    ).toMatchObject({
      application: null,
      kind: 'live-desk',
      media: {
        artist: null,
        playbackState: 'paused',
        title: 'Design Details',
      },
      mode: 'media',
      visible: true,
    })
  })

  it('combines application and media into a deterministic two-slip mode', () => {
    const publicState = createPublicState({
      media: {
        album: 'A Moment Apart',
        artwork: {
          url: `https://assets.example.com/current.png?v=${'a'.repeat(64)}`,
        },
        artist: 'ODESZA',
        kind: 'music',
        link: {
          url: 'https://y.qq.com/n/ryqq/songDetail/001lzbAN14boA4',
        },
        playback: {
          anchorAt: '2026-07-16T12:00:00.000Z',
          durationMs: 216_000,
          positionMs: 42_000,
          rate: 1,
          state: 'playing',
        },
        player: { displayName: 'Music' },
        sessionId: '01K0A5P1KD0QAFMZKVFNFC7AFP',
        title: 'A Moment Apart',
      },
    })

    expect(
      createLiveDeskPresentation(createState(publicState), NOW),
    ).toMatchObject({
      application: { displayName: 'Google Chrome' },
      media: {
        artist: 'ODESZA',
        artworkURL: `https://assets.example.com/current.png?v=${'a'.repeat(64)}`,
        playbackURL: 'https://y.qq.com/n/ryqq/songDetail/001lzbAN14boA4',
        title: 'A Moment Apart',
      },
      mode: 'application-media',
      visible: true,
    })
  })

  it('hides a projection once its public lease has expired', () => {
    const publicState = createPublicState({
      expiresAt: '2026-07-16T11:59:59.999Z',
    })

    expect(createLiveDeskPresentation(createState(publicState), NOW)).toEqual({
      visible: false,
    })
  })

  it('projects a playing media anchor locally and clamps it to duration', () => {
    const presentation = createLiveDeskPresentation(
      createState(
        createPublicState({
          media: {
            album: null,
            artwork: null,
            artist: 'ODESZA',
            kind: 'music',
            playback: {
              anchorAt: '2026-07-16T12:00:00.000Z',
              durationMs: 45_000,
              positionMs: 42_000,
              rate: 1,
              state: 'playing',
            },
            player: null,
            sessionId: '01K0A5P1KD0QAFMZKVFNFC7AFP',
            title: null,
          },
        }),
      ),
      NOW,
    )

    if (!presentation.visible || !presentation.media) {
      throw new Error('Expected visible media presentation')
    }

    expect(projectMediaPositionMs(presentation.media, NOW + 2_000)).toBe(44_000)
    expect(projectMediaPositionMs(presentation.media, NOW + 8_000)).toBe(45_000)
  })

  it('does not advance paused media from its anchor', () => {
    const presentation = createLiveDeskPresentation(
      createState(
        createPublicState({
          application: null,
          media: {
            album: null,
            artwork: null,
            artist: 'ODESZA',
            kind: 'music',
            playback: {
              anchorAt: '2026-07-16T12:00:00.000Z',
              durationMs: 90_000,
              positionMs: 42_000,
              rate: 1,
              state: 'paused',
            },
            player: null,
            sessionId: '01K0A5P1KD0QAFMZKVFNFC7AFP',
            title: null,
          },
        }),
      ),
      NOW,
    )

    if (!presentation.visible || !presentation.media) {
      throw new Error('Expected visible media presentation')
    }

    expect(projectMediaPositionMs(presentation.media, NOW + 30_000)).toBe(
      42_000,
    )
  })
})

describe('buildMediaByline', () => {
  it('joins artist and album', () => {
    expect(
      buildMediaByline({ album: 'Album', artist: 'Artist', title: 'Track' }),
    ).toBe('Artist · Album')
  })

  it('drops the album when it duplicates the title', () => {
    expect(
      buildMediaByline({ album: 'Track', artist: 'Artist', title: 'Track' }),
    ).toBe('Artist')
  })

  it('drops the album when it duplicates the artist', () => {
    expect(
      buildMediaByline({ album: 'Artist', artist: 'Artist', title: 'Track' }),
    ).toBe('Artist')
  })

  it('omits the artist when there is no title to pair with', () => {
    expect(
      buildMediaByline({ album: 'Album', artist: 'Artist', title: null }),
    ).toBe('Album')
  })

  it('returns null when nothing remains', () => {
    expect(
      buildMediaByline({ album: 'Track', artist: null, title: 'Track' }),
    ).toBeNull()
  })
})
