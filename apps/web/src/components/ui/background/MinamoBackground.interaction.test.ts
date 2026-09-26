import { describe, expect, it } from 'vitest'

import {
  createMinamoClickRipple,
  fillMinamoClickBatch,
  getMinamoClickBatchCount,
  MINAMO_CLICK_BATCH_SIZE,
  retainActiveMinamoClickRipples,
} from './MinamoBackground.interaction'

describe('createMinamoClickRipple', () => {
  it('is deterministic and preserves the exact circular center', () => {
    const args = { clientX: 123, clientY: 456, start: 1.25, seed: 42 }
    const first = createMinamoClickRipple(args)
    const second = createMinamoClickRipple(args)

    expect(first).toEqual(second)
    expect(first.clientX).toBe(123)
    expect(first.clientY).toBe(456)
    expect(first.start).toBe(1.25)
  })

  it('keeps all stable parameters inside the approved ranges', () => {
    for (let seed = 0; seed < 256; seed++) {
      const ripple = createMinamoClickRipple({
        clientX: 0,
        clientY: 0,
        start: 0,
        seed,
      })

      expect(ripple.wavelengthScale).toBeGreaterThanOrEqual(0.94)
      expect(ripple.wavelengthScale).toBeLessThanOrEqual(1.06)
      expect(ripple.amplitudeScale).toBeGreaterThanOrEqual(0.9)
      expect(ripple.amplitudeScale).toBeLessThanOrEqual(1.1)
      expect(ripple.phaseOffset).toBeGreaterThanOrEqual(-Math.PI * 0.08)
      expect(ripple.phaseOffset).toBeLessThanOrEqual(Math.PI * 0.08)
      expect(ripple.speedScale).toBeGreaterThanOrEqual(0.93)
      expect(ripple.speedScale).toBeLessThanOrEqual(1.07)
    }
  })
})

describe('retainActiveMinamoClickRipples', () => {
  const ripple = (start: number) =>
    createMinamoClickRipple({ clientX: 10, clientY: 20, start, seed: start })

  it('retains every unexpired event and removes events at 3.5 seconds', () => {
    const active = retainActiveMinamoClickRipples(
      [ripple(0), ripple(1), ripple(2)],
      3.5,
    )

    expect(active.map(({ start }) => start)).toEqual([1, 2])
  })
})

describe('Minamo click batching', () => {
  it('packs more than six events without truncation', () => {
    const ripples = Array.from({ length: 13 }, (_, index) =>
      createMinamoClickRipple({
        clientX: 100 + index,
        clientY: 200 + index,
        start: index * 0.01,
        seed: index,
      }),
    )
    const clickData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
    const profileData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
    const packedCenters: number[] = []

    expect(getMinamoClickBatchCount(ripples.length)).toBe(3)
    for (let batchIndex = 0; batchIndex < 3; batchIndex++) {
      const count = fillMinamoClickBatch({
        ripples,
        batchIndex,
        dpr: 2,
        pixelHeight: 1200,
        cellSize: 440,
        clickData,
        profileData,
      })
      for (let index = 0; index < count; index++) {
        packedCenters.push(clickData[index * 4])
      }
    }

    expect(packedCenters).toHaveLength(13)
    expect(packedCenters[0]).toBeCloseTo((100 * 2) / 440)
    expect(packedCenters[12]).toBeCloseTo((112 * 2) / 440)
  })
})
