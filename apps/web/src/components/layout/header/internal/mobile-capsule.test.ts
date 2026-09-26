import { describe, expect, it } from 'vitest'

import {
  overlayOnPrimaryTap,
  resolveCapsuleState,
  resolveScrollAction,
  toggleMenuOverlay,
} from './mobile-capsule'

describe('resolveCapsuleState', () => {
  it('returns idle without live data', () => {
    expect(
      resolveCapsuleState({
        collapsed: false,
        hasLive: false,
        overlay: 'none',
      }),
    ).toBe('idle')
  })

  it('returns ticket with live data', () => {
    expect(
      resolveCapsuleState({ collapsed: false, hasLive: true, overlay: 'none' }),
    ).toBe('ticket')
  })

  it('collapses to dot regardless of live data', () => {
    expect(
      resolveCapsuleState({ collapsed: true, hasLive: true, overlay: 'none' }),
    ).toBe('dot')
    expect(
      resolveCapsuleState({ collapsed: true, hasLive: false, overlay: 'none' }),
    ).toBe('dot')
  })

  it('overlay wins over collapse', () => {
    expect(
      resolveCapsuleState({ collapsed: true, hasLive: false, overlay: 'menu' }),
    ).toBe('menu')
    expect(
      resolveCapsuleState({
        collapsed: true,
        hasLive: true,
        overlay: 'expanded',
      }),
    ).toBe('expanded')
  })

  it('expanded falls back when live data disappears', () => {
    expect(
      resolveCapsuleState({
        collapsed: false,
        hasLive: false,
        overlay: 'expanded',
      }),
    ).toBe('idle')
  })

  it('lang overlay wins regardless of live data or collapse', () => {
    expect(
      resolveCapsuleState({
        collapsed: false,
        hasLive: false,
        overlay: 'lang',
      }),
    ).toBe('lang')
    expect(
      resolveCapsuleState({ collapsed: true, hasLive: true, overlay: 'lang' }),
    ).toBe('lang')
  })
})

describe('overlay transitions', () => {
  it('menu toggles and the close glyph always closes', () => {
    expect(toggleMenuOverlay('none')).toBe('menu')
    expect(toggleMenuOverlay('menu')).toBe('none')
    expect(toggleMenuOverlay('expanded')).toBe('none')
  })

  it('primary tap opens expanded only with live data', () => {
    expect(overlayOnPrimaryTap('none', true)).toBe('expanded')
    expect(overlayOnPrimaryTap('none', false)).toBe('menu')
  })

  it('primary tap closes any open overlay', () => {
    expect(overlayOnPrimaryTap('expanded', true)).toBe('none')
    expect(overlayOnPrimaryTap('menu', false)).toBe('none')
    expect(overlayOnPrimaryTap('lang', false)).toBe('none')
  })

  it('menu glyph closes the lang overlay', () => {
    expect(toggleMenuOverlay('lang')).toBe('none')
  })
})

describe('narration', () => {
  it('shows narrating row when narrating and not collapsed', () => {
    expect(
      resolveCapsuleState({
        collapsed: false,
        hasLive: false,
        isNarrating: true,
        overlay: 'none',
      }),
    ).toBe('narrating')
  })
  it('narration wins over live ticket', () => {
    expect(
      resolveCapsuleState({
        collapsed: false,
        hasLive: true,
        isNarrating: true,
        overlay: 'none',
      }),
    ).toBe('narrating')
  })
  it('collapses to dot while narrating', () => {
    expect(
      resolveCapsuleState({
        collapsed: true,
        hasLive: false,
        isNarrating: true,
        overlay: 'none',
      }),
    ).toBe('dot')
  })
  it('tts overlay shows narrating shape', () => {
    expect(
      resolveCapsuleState({
        collapsed: false,
        hasLive: false,
        isNarrating: false,
        overlay: 'tts',
      }),
    ).toBe('narrating')
  })
  it('primary tap opens tts when narrating', () => {
    expect(overlayOnPrimaryTap('none', false, true)).toBe('tts')
  })
  it('primary tap prefers tts over live when narrating', () => {
    expect(overlayOnPrimaryTap('none', true, true)).toBe('tts')
  })
})

describe('resolveScrollAction', () => {
  it('restores near the top', () => {
    expect(resolveScrollAction(100, 30)).toBe('restore')
  })

  it('collapses on downward scroll past threshold', () => {
    expect(resolveScrollAction(400, 10)).toBe('collapse')
  })

  it('restores on upward scroll', () => {
    expect(resolveScrollAction(400, -10)).toBe('restore')
  })

  it('ignores jitter within delta', () => {
    expect(resolveScrollAction(400, 1)).toBe('none')
    expect(resolveScrollAction(400, -1)).toBe('none')
  })
})
