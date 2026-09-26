export type Rgb = [number, number, number]
export type Lab = [number, number, number]

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055

export function rgbToLab([r, g, b]: Rgb): Lab {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  const l = Math.cbrt(
    0.412_221_470_8 * R + 0.536_332_536_3 * G + 0.051_445_992_9 * B,
  )
  const m = Math.cbrt(
    0.211_903_498_2 * R + 0.680_699_545_1 * G + 0.107_396_956_6 * B,
  )
  const s = Math.cbrt(
    0.088_302_461_9 * R + 0.281_718_837_6 * G + 0.629_978_700_5 * B,
  )
  return [
    0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s,
    1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s,
    0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s,
  ]
}

export function labToRgb([L, a, b]: Lab): Rgb {
  const l_ = L + 0.396_337_777_4 * a + 0.215_803_757_3 * b
  const m_ = L - 0.105_561_345_8 * a - 0.063_854_172_8 * b
  const s_ = L - 0.089_484_177_5 * a - 1.291_485_548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const out: Rgb = [
    linearToSrgb(
      4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
    ),
    linearToSrgb(
      -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
    ),
    linearToSrgb(
      -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s,
    ),
  ]
  return out.map((v) => Math.min(1, Math.max(0, v))) as Rgb
}

export function hexToRgb(hex: string): Rgb | null {
  const h = hex.trim().replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6 || !/^[\da-f]{6}$/i.test(full)) return null
  return [
    Number.parseInt(full.slice(0, 2), 16) / 255,
    Number.parseInt(full.slice(2, 4), 16) / 255,
    Number.parseInt(full.slice(4, 6), 16) / 255,
  ]
}
