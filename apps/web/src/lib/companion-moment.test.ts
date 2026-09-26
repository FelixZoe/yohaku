import { describe, expect, it } from 'vitest'

import {
  companionMomentSummary,
  formatPlaybackTime,
  parseCompanionMomentMetadata,
} from './companion-moment'

const metadata = {
  kind: 'companion-moment',
  schemaVersion: 1,
  observedAt: '2026-07-16T12:00:00.000Z',
  application: {
    displayName: 'Xcode',
    activity: { key: 'editing', customLabel: null },
    window: null,
    icon: null,
  },
  media: {
    kind: 'music',
    title: 'Track title',
    artist: 'Artist',
    album: null,
    player: { displayName: 'Music' },
    playback: { state: 'paused', durationMs: 203_000, positionMs: 72_000 },
    artwork: {
      url: `https://assets.example.com/recently/media-artwork/aa/${'a'.repeat(64)}.png`,
    },
    link: null,
  },
}

describe('companion Moment metadata', () => {
  it('parses the supported public projection and provides a context-only summary', () => {
    const parsed = parseCompanionMomentMetadata(metadata)

    expect(parsed).not.toBeNull()
    expect(parsed && companionMomentSummary(parsed)).toBe(
      'Track title — Artist',
    )
    expect(formatPlaybackTime(72_000)).toBe('1:12')
  })

  it('ignores unknown versions and malformed nested values', () => {
    expect(
      parseCompanionMomentMetadata({ ...metadata, schemaVersion: 2 }),
    ).toBeNull()
    expect(
      parseCompanionMomentMetadata({
        ...metadata,
        media: { ...metadata.media, playback: { state: 'live' } },
      }),
    ).toBeNull()
    expect(
      parseCompanionMomentMetadata({
        ...metadata,
        media: {
          ...metadata.media,
          artwork: { url: 'https://token@assets.example.com/artwork.png' },
        },
      }),
    ).toBeNull()
  })
})
