import { describe, expect, it } from 'vitest'

import { formatDuration } from './tts-format'

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
  it('formats seconds under a minute', () => {
    expect(formatDuration(14)).toBe('0:14')
  })
  it('formats minutes:seconds', () => {
    expect(formatDuration(134)).toBe('2:14')
  })
  it('pads single-digit seconds', () => {
    expect(formatDuration(65)).toBe('1:05')
  })
  it('handles minutes >= 10', () => {
    expect(formatDuration(3903)).toBe('65:03')
  })
  it('clamps negatives to zero', () => {
    expect(formatDuration(-5)).toBe('0:00')
  })
})
