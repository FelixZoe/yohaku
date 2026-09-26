import { describe, expect, it } from 'vitest'

import { buildScrambleFrame } from './text-scramble'

describe('buildScrambleFrame', () => {
  it('builds a scramble frame with stable length and preserved spaces', () => {
    const frame = buildScrambleFrame('AB CD', () => 0)

    expect(frame).toHaveLength(5)
    expect(frame[2]).toBe(' ')
    expect(frame).not.toBe('AB CD')
  })
})
