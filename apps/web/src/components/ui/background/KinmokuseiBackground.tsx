'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'
import { isClientSide } from '~/lib/env'

export type KinmokuseiBackgroundProps = {
  density?: number
  speed?: number
  intensity?: number
}

type Floret = {
  baseX: number
  y: number
  size: number
  spriteIndex: number
  rotation: number
  rotationVel: number
  fallVel: number
  alphaBase: number
  layerAlpha: number
  swayAmp1: number
  swayFreq1: number
  swayPhase1: number
  swayAmp2: number
  swayFreq2: number
  swayPhase2: number
  breathPhase: number
}

const TAU = Math.PI * 2
const SPRITE_VARIANTS = 4
// Offscreen sprite: floret core occupies CORE_RADIUS; night halo fills the rest
const SPRITE_SIZE = 96
const CORE_RADIUS = 18
const HALO_RADIUS = 46
const BREATH_PERIOD = 18

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

type Layer = { scale: number; alpha: number; fall: number; weight: number }

const LAYERS: Layer[] = [
  { scale: 0.62, alpha: 0.65, fall: 0.7, weight: 0.4 },
  { scale: 0.82, alpha: 0.85, fall: 0.85, weight: 0.35 },
  { scale: 1, alpha: 1, fall: 1, weight: 0.25 },
]

const pickLayer = () => {
  const r = Math.random()
  let acc = 0
  for (const layer of LAYERS) {
    acc += layer.weight
    if (r <= acc) return layer
  }
  return LAYERS.at(-1)!
}

const drawFloretSprite = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isDark: boolean,
) => {
  const hue = isDark ? randBetween(28, 36) : randBetween(33, 40)
  const sat = isDark ? randBetween(55, 70) : randBetween(65, 80)
  const light = isDark ? randBetween(55, 65) : randBetween(52, 62)

  if (isDark) {
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, HALO_RADIUS)
    halo.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 5}%, 0.12)`)
    halo.addColorStop(1, `hsla(${hue}, ${sat}%, ${light + 5}%, 0)`)
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(cx, cy, HALO_RADIUS, 0, TAU)
    ctx.fill()
  }

  // Four rounded lobes in a cross — an osmanthus floret seen from above
  const baseAngle = randBetween(0, TAU)
  const petalLen = CORE_RADIUS * randBetween(0.52, 0.6)
  const petalWid = CORE_RADIUS * randBetween(0.38, 0.46)
  const petalDist = CORE_RADIUS * 0.45
  ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`
  for (let k = 0; k < 4; k++) {
    const ang = baseAngle + (k * TAU) / 4 + randBetween(-0.08, 0.08)
    const px = cx + Math.cos(ang) * petalDist
    const py = cy + Math.sin(ang) * petalDist
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(ang)
    ctx.beginPath()
    ctx.ellipse(0, 0, petalLen, petalWid, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  ctx.fillStyle = `hsl(${hue + 2}, ${sat + 5}%, ${light - 12}%)`
  ctx.beginPath()
  ctx.arc(cx, cy, CORE_RADIUS * 0.22, 0, TAU)
  ctx.fill()
}

const buildSprites = (isDark: boolean): HTMLCanvasElement[] =>
  Array.from({ length: SPRITE_VARIANTS }, () => {
    const sprite = document.createElement('canvas')
    sprite.width = SPRITE_SIZE
    sprite.height = SPRITE_SIZE
    const ctx = sprite.getContext('2d')
    if (ctx) drawFloretSprite(ctx, SPRITE_SIZE / 2, SPRITE_SIZE / 2, isDark)
    return sprite
  })

const createFloret = (width: number, height: number, onScreen: boolean) => {
  const layer = pickLayer()
  const floret: Floret = {
    baseX: Math.random() * width,
    y: onScreen ? Math.random() * height : -randBetween(10, height * 0.3),
    size: randBetween(4, 10) * (0.7 + layer.scale * 0.3),
    spriteIndex: Math.floor(Math.random() * SPRITE_VARIANTS),
    rotation: randBetween(0, TAU),
    rotationVel: randBetween(-0.9, 0.9),
    fallVel: randBetween(20, 40) * layer.fall,
    alphaBase: randBetween(0.35, 0.65),
    layerAlpha: layer.alpha,
    swayAmp1: randBetween(10, 26) * layer.scale,
    swayFreq1: randBetween(0.04, 0.09),
    swayPhase1: randBetween(0, TAU),
    swayAmp2: randBetween(3, 9) * layer.scale,
    swayFreq2: randBetween(0.12, 0.24),
    swayPhase2: randBetween(0, TAU),
    breathPhase: randBetween(0, TAU),
  }
  return floret
}

export const KinmokuseiBackground: FC<KinmokuseiBackgroundProps> = ({
  density = 1,
  speed = 1,
  intensity = 1,
}) => {
  const isDark = useIsDark()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const floretsRef = useRef<Floret[]>([])
  const spritesRef = useRef<HTMLCanvasElement[]>([])
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const animationRef = useRef<number | null>(null)
  const initialFillRef = useRef(true)

  const propsRef = useRef({ density, speed, intensity, isDark })
  propsRef.current = { density, speed, intensity, isDark }

  useEffect(() => {
    if (!isClientSide) return
    spritesRef.current = buildSprites(isDark)
  }, [isDark])

  useIsomorphicLayoutEffect(() => {
    if (!isClientSide) return
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { innerWidth: w, innerHeight: h } = window
      sizeRef.current = { width: w, height: h, dpr }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (!isClientSide) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const start = performance.now()
    let last = start

    const render = (now: number) => {
      const t = (now - start) / 1000
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { width, height, dpr } = sizeRef.current
      const {
        density: dens,
        speed: spd,
        intensity: inten,
        isDark: dark,
      } = propsRef.current

      const area = width * height
      const baseCount = Math.min(140, Math.max(40, area / 28000))
      const target = Math.max(
        0,
        Math.round(baseCount * dens * (dark ? 0.6 : 1)),
      )
      const florets = floretsRef.current
      while (florets.length < target) {
        florets.push(createFloret(width, height, initialFillRef.current))
      }
      if (florets.length > target) florets.length = target
      initialFillRef.current = false

      const darkSpeed = dark ? 0.75 : 1

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const sprites = spritesRef.current
      if (sprites.length === 0) {
        animationRef.current = requestAnimationFrame(render)
        return
      }

      for (const floret of florets) {
        floret.y += floret.fallVel * spd * darkSpeed * dt
        floret.rotation += floret.rotationVel * spd * dt

        const margin = floret.size * 3
        if (floret.y - margin > height) {
          const next = createFloret(width, height, false)
          Object.assign(floret, next)
          continue
        }

        const ts = t * spd
        const x =
          floret.baseX +
          Math.sin(ts * floret.swayFreq1 * TAU + floret.swayPhase1) *
            floret.swayAmp1 +
          Math.sin(ts * floret.swayFreq2 * TAU + floret.swayPhase2) *
            floret.swayAmp2

        // Fragrance wave: a slow alpha swell sweeping across the field
        const breath =
          1 +
          0.25 *
            Math.sin(
              (t * TAU) / BREATH_PERIOD +
                floret.baseX * 0.0025 +
                floret.breathPhase,
            )

        const coreAlpha = dark ? floret.alphaBase * 0.78 : floret.alphaBase
        const alpha = Math.min(
          0.7,
          coreAlpha * floret.layerAlpha * breath * inten,
        )
        if (alpha <= 0.01) continue

        const sprite = sprites[floret.spriteIndex]
        // Core maps to floret.size; the night halo is baked into the same
        // sprite canvas and extends naturally beyond the core
        const drawSize = floret.size * (SPRITE_SIZE / (CORE_RADIUS * 2))

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(x, floret.y)
        ctx.rotate(floret.rotation)
        ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
        ctx.restore()
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    return () => {
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}
