import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { initWasm, Resvg } from '@resvg/resvg-wasm'
import type { ReactElement } from 'react'
import type { SatoriOptions } from 'satori'
import satori from 'satori'

import type { OgFontBundle } from './og-shared'

const nodeRequire = createRequire(import.meta.url)

// Turbopack/Rspack rewrite any statically visible `require.resolve()` call
// site — a string literal gets the .wasm/.ttf bundled as a module, a dynamic
// expression becomes a throwing "expression is too dynamic" stub. Building
// the function at runtime hides the call site from both bundlers so Node's
// real resolution runs.
const resolveNodeFile = new Function(
  'req',
  'spec',
  'return req.resolve(spec)',
) as (req: NodeJS.Require, spec: string) => string

// Next standalone output ships pnpm's .pnpm store without the top-level
// node_modules symlinks, so require.resolve cannot find any package there.
// Fall back to walking up from cwd, checking the direct layout and then
// scanning .pnpm for the package's store directory.
const findPackageFile = (pkgName: string, relPath: string): string => {
  try {
    return resolveNodeFile(nodeRequire, `${pkgName}/${relPath}`)
  } catch {
    /* fall through to manual lookup */
  }
  const rel = path.join('node_modules', pkgName, relPath)
  const pnpmPrefix = `${pkgName.replaceAll('/', '+')}@`
  let dir = process.cwd()
  for (;;) {
    const direct = path.join(dir, rel)
    if (existsSync(direct)) return direct
    const pnpmDir = path.join(dir, 'node_modules', '.pnpm')
    if (existsSync(pnpmDir)) {
      for (const entry of readdirSync(pnpmDir)) {
        if (!entry.startsWith(pnpmPrefix)) continue
        const candidate = path.join(pnpmDir, entry, rel)
        if (existsSync(candidate)) return candidate
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`Cannot locate ${pkgName}/${relPath} in node_modules`)
}

let wasmInit: Promise<void> | null = null

const ensureResvgWasm = () => {
  wasmInit ??= readFile(findPackageFile('@resvg/resvg-wasm', 'index_bg.wasm'))
    .then((wasm) => initWasm(wasm))
    .catch((error) => {
      // HMR re-evaluates this module while the wasm module keeps its
      // process-wide initialized flag; a second initWasm always throws.
      if (String(error?.message).includes('Already initialized')) return
      wasmInit = null
      throw error
    })
  return wasmInit
}

let fallbackFont: Promise<Buffer> | null = null

const loadFallbackFont = () => {
  fallbackFont ??= readFile(
    findPackageFile('next', 'dist/compiled/@vercel/og/Geist-Regular.ttf'),
  ).catch((error) => {
    fallbackFont = null
    throw error
  })
  return fallbackFont
}

const languageFontMap: Record<string, string | string[]> = {
  'ja-JP': 'Noto+Sans+JP',
  'ko-KR': 'Noto+Sans+KR',
  'zh-CN': 'Noto+Sans+SC',
  'zh-TW': 'Noto+Sans+TC',
  'zh-HK': 'Noto+Sans+HK',
  'th-TH': 'Noto+Sans+Thai',
  'bn-IN': 'Noto+Sans+Bengali',
  'ar-AR': 'Noto+Sans+Arabic',
  'ta-IN': 'Noto+Sans+Tamil',
  'ml-IN': 'Noto+Sans+Malayalam',
  'he-IL': 'Noto+Sans+Hebrew',
  'te-IN': 'Noto+Sans+Telugu',
  devanagari: 'Noto+Sans+Devanagari',
  kannada: 'Noto+Sans+Kannada',
  symbol: ['Noto+Sans+Symbols', 'Noto+Sans+Symbols+2'],
  math: 'Noto+Sans+Math',
  unknown: 'Noto+Sans',
}

const toTwemojiCode = (segment: string) => {
  const normalized = segment.includes('\u200D')
    ? segment
    : segment.replaceAll('\uFE0F', '')
  const codes: string[] = []
  for (const char of normalized) {
    codes.push(char.codePointAt(0)!.toString(16))
  }
  return codes.join('-')
}

const loadEmojiSvg = async (segment: string) => {
  const res = await fetch(
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${toTwemojiCode(segment)}.svg`,
    { signal: AbortSignal.timeout(4000) },
  )
  if (!res.ok) return []
  const svg = await res.text()
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const loadGoogleFontSubset = async (family: string, text: string) => {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
    {
      headers: {
        // An old UA makes Google Fonts return TTF, which satori can parse
        // (it cannot decode woff2).
        'User-Agent':
          'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
      },
      signal: AbortSignal.timeout(4000),
    },
  ).then((res) => (res.ok ? res.text() : ''))
  const resource = css.match(
    /src: url\((.+)\) format\('(?:opentype|truetype)'\)/,
  )
  if (!resource) return null
  const res = await fetch(resource[1], { signal: AbortSignal.timeout(4000) })
  if (!res.ok) return null
  return res.arrayBuffer()
}

type SatoriFonts = SatoriOptions['fonts']

const loadFallbackAsset = async (
  code: string,
  segment: string,
): Promise<string | SatoriFonts> => {
  if (code === 'emoji') return loadEmojiSvg(segment)

  const targets = code.split('|').flatMap((lang) => {
    const mapped = languageFontMap[lang]
    if (!mapped) return []
    const families = Array.isArray(mapped) ? mapped : [mapped]
    return families.map((family) => ({
      family,
      lang: lang === 'unknown' ? undefined : lang,
    }))
  })

  const fonts = await Promise.all(
    targets.map(async ({ family, lang }) => {
      const data = await loadGoogleFontSubset(family, segment)
      if (!data) return null
      return {
        name: family.replaceAll('+', ' '),
        data,
        weight: 400 as const,
        style: 'normal' as const,
        lang,
      }
    }),
  )
  return fonts.filter(Boolean) as SatoriFonts
}

const assetCache = new Map<string, Promise<string | SatoriFonts>>()

const loadAdditionalAsset = (code: string, segment: string) => {
  const key = `${code}:${segment}`
  let cached = assetCache.get(key)
  if (!cached) {
    cached = loadFallbackAsset(code, segment).catch(() => [])
    if (assetCache.size > 256) assetCache.clear()
    assetCache.set(key, cached)
  }
  return cached
}

export interface RenderOgImageOptions {
  fonts: OgFontBundle['fonts']
  height: number
  width: number
}

export async function renderOgImage(
  element: ReactElement,
  { width, height, fonts }: RenderOgImageOptions,
): Promise<Uint8Array<ArrayBuffer>> {
  await ensureResvgWasm()

  const resolvedFonts: SatoriFonts = fonts.length
    ? fonts
    : [
        {
          name: 'Geist',
          data: await loadFallbackFont(),
          weight: 400,
          style: 'normal',
        },
      ]

  const svg = await satori(element, {
    width,
    height,
    fonts: resolvedFonts,
    loadAdditionalAsset,
  })

  const image = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
  }).render()
  return new Uint8Array(image.asPng())
}
