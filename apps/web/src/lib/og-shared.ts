import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const PAPER = '#f9f8f5'
export const INK = '#141312'
export const INK_SOFT = '#403f3a'
export const TEXT_SECONDARY = '#787670'
export const TEXT_FAINT = '#a8a69f'
export const FILL = '#d0cec6'
export const UME = '#c56473'

const fontSearchDirs = [
  '/usr/share/fonts/truetype',
  '/usr/share/fonts/opentype',
  '/usr/local/share/fonts',
  '/usr/share/fonts',
  '/usr/share/fonts/truetype/lxgw-wenkai',
  '/usr/share/fonts/truetype/lxgw',
  '/usr/share/fonts/truetype/chinese',
  '/Library/Fonts',
  '/System/Library/Fonts/Supplemental',
  process.env.HOME ? path.join(process.env.HOME, 'Library/Fonts') : '',
].filter(Boolean)

const isVercel = process.env.VERCEL === '1'

async function loadFont(fileNames: string[]): Promise<ArrayBuffer | null> {
  for (const fileName of fileNames) {
    for (const dir of fontSearchDirs) {
      try {
        const font = await readFile(path.join(dir, fileName))
        // @ts-expect-error
        return font
      } catch {
        continue
      }
    }
  }
  return null
}

const cjkRegex =
  /[\u{3040}-\u{30FF}\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{F900}-\u{FAFF}]/u

export const isLatinOnly = (value?: string) => {
  if (!value) return true
  return !cjkRegex.test(value)
}

const geistRegularFonts = [
  'Geist-Regular.ttf',
  'Geist-Regular.otf',
  'Geist-Book.otf',
  'Geist-Medium.otf',
  'SF-Pro-Text-Regular.otf',
  'SF-Pro-Display-Regular.otf',
  'SF-Pro.ttf',
]

const geistSemiBoldFonts = [
  'Geist-SemiBold.ttf',
  'Geist-SemiBold.otf',
  'Geist-Medium.ttf',
  'Geist-Medium.otf',
  'Geist-Bold.ttf',
  'Geist-Bold.otf',
  'Geist-ExtraBold.otf',
  'SF-Pro-Text-Semibold.otf',
  'SF-Pro-Display-Semibold.otf',
  'SF-Pro-Text-Bold.otf',
]

const lxgwRegularFonts = [
  'LXGWWenKai-Regular.ttf',
  'LXGWWenKaiMono-Regular.ttf',
  'Arial Unicode 2.ttf',
]

const lxgwMediumFonts = [
  'LXGWWenKai-Medium.ttf',
  'LXGWWenKaiMono-Medium.ttf',
  'Arial Unicode 2.ttf',
]

export interface OgFontBundle {
  fontFamily: string
  fonts: {
    name: string
    data: ArrayBuffer
    weight: 400 | 600
    style: 'normal'
  }[]
}

export const loadOgFonts = async (useGeist: boolean): Promise<OgFontBundle> => {
  const fontFamily = isVercel
    ? 'system-ui, sans-serif'
    : useGeist
      ? 'Geist, system-ui, sans-serif'
      : '"LXGW WenKai", system-ui, sans-serif'

  const [regular, bold] = await Promise.all([
    useGeist ? loadFont(geistRegularFonts) : loadFont(lxgwRegularFonts),
    useGeist ? loadFont(geistSemiBoldFonts) : loadFont(lxgwMediumFonts),
  ])
  const resolvedBold = bold ?? regular
  const name = useGeist ? 'Geist' : 'LXGW WenKai'

  return {
    fontFamily,
    fonts: [
      regular && {
        name,
        data: regular,
        weight: 400 as const,
        style: 'normal' as const,
      },
      resolvedBold && {
        name,
        data: resolvedBold,
        weight: 600 as const,
        style: 'normal' as const,
      },
    ].filter(Boolean) as OgFontBundle['fonts'],
  }
}

export const hashSeed = (input: string) => {
  let hash = 0
  for (const char of input) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) | 0
  }
  return Math.abs(hash)
}

export const seededWash = (seed: string) => {
  const hue = hashSeed(seed) % 360
  const hue2 = (hue + 140) % 360
  return `radial-gradient(ellipse 70% 90% at 88% 12%, hsla(${hue}, 42%, 55%, 0.12), transparent 60%), radial-gradient(ellipse 60% 80% at 8% 100%, hsla(${hue2}, 38%, 52%, 0.07), transparent 55%)`
}
