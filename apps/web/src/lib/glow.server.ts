import 'server-only'

import { hexToHsl } from './color'

const SOFT_HUES = [25, 35, 45, 85, 200, 220, 270, 340, 15, 160, 20, 120]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i)!
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function resolveAccentHue(options: {
  seed?: string
  baseColor?: string
}): { hue: number; hash: number } {
  const { seed, baseColor } = options

  if (baseColor) {
    const [h] = hexToHsl(baseColor)
    return { hue: h, hash: hashString(baseColor) }
  }

  const hash = hashString(seed ?? '')
  const baseHue = SOFT_HUES[hash % SOFT_HUES.length]
  const offset = ((hash >> 8) % 24) - 12
  return { hue: (baseHue + offset + 360) % 360, hash }
}
