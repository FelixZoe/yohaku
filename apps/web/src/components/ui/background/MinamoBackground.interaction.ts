export const MINAMO_CLICK_RIPPLE_DURATION = 3.5
export const MINAMO_CLICK_BATCH_SIZE = 6

export type MinamoClickRipple = {
  clientX: number
  clientY: number
  start: number
  speedScale: number
  wavelengthScale: number
  amplitudeScale: number
  phaseOffset: number
}

const createRandom = (seed: number) => {
  let value = seed >>> 0
  return () => {
    value += 1_831_565_813
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const createMinamoClickRipple = ({
  clientX,
  clientY,
  start,
  seed,
}: {
  clientX: number
  clientY: number
  start: number
  seed: number
}): MinamoClickRipple => {
  const random = createRandom(seed)
  const wavelengthScale = 0.94 + random() * 0.12
  const environmentalVariation = (random() * 2 - 1) * 0.02

  return {
    clientX,
    clientY,
    start,
    wavelengthScale,
    amplitudeScale: 0.9 + random() * 0.2,
    phaseOffset: (random() * 2 - 1) * Math.PI * 0.08,
    speedScale: clamp(
      1 + (wavelengthScale - 1) * 0.8 + environmentalVariation,
      0.93,
      1.07,
    ),
  }
}

export const retainActiveMinamoClickRipples = (
  ripples: MinamoClickRipple[],
  eventTime: number,
) =>
  ripples.filter((ripple) => {
    const age = eventTime - ripple.start
    return age >= 0 && age < MINAMO_CLICK_RIPPLE_DURATION
  })

export const getMinamoClickBatchCount = (count: number) =>
  Math.ceil(count / MINAMO_CLICK_BATCH_SIZE)

export const fillMinamoClickBatch = ({
  ripples,
  batchIndex,
  dpr,
  pixelHeight,
  cellSize,
  clickData,
  profileData,
}: {
  ripples: MinamoClickRipple[]
  batchIndex: number
  dpr: number
  pixelHeight: number
  cellSize: number
  clickData: Float32Array
  profileData: Float32Array
}) => {
  clickData.fill(0)
  profileData.fill(0)
  const startIndex = batchIndex * MINAMO_CLICK_BATCH_SIZE
  const count = Math.min(
    MINAMO_CLICK_BATCH_SIZE,
    Math.max(0, ripples.length - startIndex),
  )

  for (let index = 0; index < count; index++) {
    const ripple = ripples[startIndex + index]
    const offset = index * 4
    clickData[offset] = (ripple.clientX * dpr) / cellSize
    clickData[offset + 1] = (pixelHeight - ripple.clientY * dpr) / cellSize
    clickData[offset + 2] = ripple.start
    clickData[offset + 3] = 1
    profileData[offset] = ripple.speedScale
    profileData[offset + 1] = ripple.wavelengthScale
    profileData[offset + 2] = ripple.amplitudeScale
    profileData[offset + 3] = ripple.phaseOffset
  }

  return count
}
