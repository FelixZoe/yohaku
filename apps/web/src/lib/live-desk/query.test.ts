import { describe, expect, it } from 'vitest'

import { normalizePublicLiveDeskReadResult } from './query'

const createPublicState = () => ({
  epoch: '01K0A5P1KD0QAFMZKVFNFC7AFN',
  projection: null,
  revision: 12,
  schemaVersion: 2,
})

describe('normalizePublicLiveDeskReadResult', () => {
  it('normalizes the REST result through the canonical state normalizer', () => {
    const state = createPublicState()

    const result = normalizePublicLiveDeskReadResult({
      $meta: { requestId: 'transport-only' },
      state,
    })

    expect(result).toEqual(state)
    expect(result).not.toBe(state)
  })

  it('rejects a result without a state baseline', () => {
    expect(() => normalizePublicLiveDeskReadResult({})).toThrow(
      'state is missing',
    )
  })

  it('does not allow private or unknown fields into the cached state', () => {
    const state = {
      ...createPublicState(),
      deviceId: 'must-not-be-public',
    }

    expect(() => normalizePublicLiveDeskReadResult({ state })).toThrow(
      '$.deviceId',
    )
  })
})
