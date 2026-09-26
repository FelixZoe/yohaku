import 'server-only'

import chroma from 'chroma-js'
import type { FC } from 'react'

import { generateSingleColorStyle } from '~/lib/accent-color'
import { resolveAccentHue } from '~/lib/glow.server'

import { PageBleed } from './PageBleed'

export const PageColorGradient: FC<{
  seed?: string
  baseColor?: string
  bleed?: boolean
}> = async ({ seed, baseColor, bleed = false }) => {
  const { hue, hash } = resolveAccentHue({ seed, baseColor })
  const accentHex = chroma.hsl(hue, 0.35, 0.5).hex()

  const cssContent = await generateSingleColorStyle(accentHex, {
    useThemedClass: true,
    rootBackground: false,
  })

  return (
    <>
      {bleed && <PageBleed hue={hue} seed={(hash % 1000) / 1000} />}
      <style
        dangerouslySetInnerHTML={{ __html: cssContent }}
        id="accent-color-style"
      />
    </>
  )
}
