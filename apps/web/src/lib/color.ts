const getRandomColor = (
  lightness: [number, number],
  saturation: [number, number],
  hue: number,
) => {
  const satAccent = Math.floor(
    Math.random() * (saturation[1] - saturation[0] + 1) + saturation[0],
  )
  const lightAccent = Math.floor(
    Math.random() * (lightness[1] - lightness[0] + 1) + lightness[0],
  )

  // Generate the background color by increasing the lightness and decreasing the saturation
  const satBackground = satAccent > 30 ? satAccent - 30 : 0
  const lightBackground = lightAccent < 80 ? lightAccent + 20 : 100

  return {
    accent: `hsl(${hue}, ${satAccent}%, ${lightAccent}%)`,
    background: `hsl(${hue}, ${satBackground}%, ${lightBackground}%)`,
  }
}

export function stringToHue(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return hue < 0 ? hue + 360 : hue
}

export const getColorScheme = (hue?: number) => {
  const baseHue = hue ?? Math.floor(Math.random() * 361)
  const complementaryHue = (baseHue + 180) % 360

  // For light theme, we limit the lightness between 40 and 70 to avoid too bright colors for accent
  const lightColors = getRandomColor([40, 70], [70, 90], baseHue)

  // For dark theme, we limit the lightness between 20 and 50 to avoid too dark colors for accent
  const darkColors = getRandomColor([20, 50], [70, 90], complementaryHue)

  return {
    light: {
      accent: lightColors.accent,
      background: lightColors.background,
    },
    dark: {
      accent: darkColors.accent,
      background: darkColors.background,
    },
  }
}
export function addAlphaToHSL(hsl: string, alpha: number): string {
  if (!/^hsl\(\d{1,3}(?:,\s*[\d.]+%){2}\)$/.test(hsl)) {
    throw new Error('Invalid HSL color value')
  }

  const hsla = `${hsl.slice(0, -1)}, ${alpha})`
  return hsla.replace('hsl', 'hsla')
}

export function hexToHsl(hex: string) {
  // Remove the '#' symbol from the hex code
  hex = hex.replace('#', '')

  // Convert hex values to RGB
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255

  // Find the minimum and maximum values among R, G, and B
  const min = Math.min(r, g, b)
  const max = Math.max(r, g, b)

  // Calculate the hue
  let h = 0
  switch (max) {
    case min: {
      h = 0 // No hue for achromatic colors

      break
    }
    case r: {
      h = ((g - b) / (max - min)) % 6

      break
    }
    case g: {
      h = (2 + (b - r) / (max - min)) % 6

      break
    }
    default: {
      h = (4 + (r - g) / (max - min)) % 6
    }
  }
  h = Math.round(h * 60)

  // Calculate the lightness
  const l = (max + min) / 2

  // Calculate the saturation
  let s = 0
  if (max !== min) {
    s = (max - min) / (1 - Math.abs(2 * l - 1))
  }
  s = Math.round(s * 100)

  // Return the HSL values as a string
  return [h, s, Math.round(l * 100)]
}
const isHexColor = (color: string) => {
  return /^#[\da-f]{6}$/i.test(color)
}

const isRGBColor = (color: string) => {
  return /^rgb\((?:\d{1,3},\s*){2}\d{1,3}\)$/.test(color)
}
const isRGBAColor = (color: string) => {
  return /^rgba\((?:\d{1,3},\s*){3}(?:0?\.\d+|1(?:\.0+)?)\)$/.test(color)
}

export const withOpacity = (color: string, opacity: number) => {
  switch (true) {
    case isHexColor(color): {
      // Convert decimal opacity to hex (0-255)
      const alpha = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0')
      return `${color}${alpha}`
    }
    case isRGBColor(color): {
      const [r, g, b] = color.match(/\d+/g)!.map(Number)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    case isRGBAColor(color): {
      const [r, g, b] = color.match(/\d+/g)!.map(Number)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    default: {
      return color
    }
  }
}
export function topicStringToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function topicWarmHue(name: string): number {
  return 5 + (topicStringToHue(name) / 360) * 60
}

export function topicColors(name: string, isDark: boolean) {
  const hue = topicWarmHue(name)
  const s = isDark ? 42 : 52
  const l = isDark ? 48 : 42
  return {
    from: `hsl(${hue}, ${s}%, ${l + 8}%)`,
    mid: `hsl(${hue}, ${s}%, ${l}%)`,
    to: `hsl(${hue}, ${s}%, ${l - 8}%)`,
  }
}
