import { describe, expect, it } from 'vitest'

import { resolveCommentGuard } from './comment-guard'

describe('resolveCommentGuard', () => {
  it('closes comments when content disallows comments', () => {
    expect(
      resolveCommentGuard({
        allowComment: false,
        disableComment: false,
        allowGuestComment: true,
        hasSessionReader: false,
      }),
    ).toEqual({
      commentsClosed: true,
      forceAuthOnly: false,
    })
  })

  it('closes comments when site-wide comments are disabled', () => {
    expect(
      resolveCommentGuard({
        allowComment: true,
        disableComment: true,
        allowGuestComment: true,
        hasSessionReader: false,
      }),
    ).toEqual({
      commentsClosed: true,
      forceAuthOnly: false,
    })
  })

  it('forces auth-only mode when guest comments are disabled for signed-out users', () => {
    expect(
      resolveCommentGuard({
        allowComment: true,
        disableComment: false,
        allowGuestComment: false,
        hasSessionReader: false,
      }),
    ).toEqual({
      commentsClosed: false,
      forceAuthOnly: true,
    })
  })

  it('does not force auth-only mode for signed-in readers', () => {
    expect(
      resolveCommentGuard({
        allowComment: true,
        disableComment: false,
        allowGuestComment: false,
        hasSessionReader: true,
      }),
    ).toEqual({
      commentsClosed: false,
      forceAuthOnly: false,
    })
  })
})
