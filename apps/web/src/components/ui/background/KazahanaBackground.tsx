'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { isClientSide } from '~/lib/env'

export type KazahanaBackgroundProps = {
  density?: number
  speed?: number
  intensity?: number
}

type Flake = {
  x: number
  y: number
  layer: number
  radius: number
  baseAlpha: number
  hue: number
  sat: number
  light: number
  fall: number
  windResp: number
  swayAmp: number
  swayFreq: number
  swayPhase: number
  shimmerFreq: number
  shimmerPhase: number
  glintStart: number
  glintDur: number
  flareLen: number
  flareAngle: number
}

const TAU = Math.PI * 2
const MAX_GLINTS = 5
// velocity band (px/s) over which a flake morphs from dot into motion streak
const STREAK_MIN_V = 70
const STREAK_MAX_V = 140
const TRAIL_SECONDS = 0.09
const MAX_TRAIL_PX = 18

// depth layers: far flakes are small/dim/slow and barely feel the wind
const LAYERS = [
  {
    share: 0.4,
    radius: [0.9, 1.6],
    alpha: [0.22, 0.35],
    fall: [12, 20],
    wind: 0.35,
  },
  {
    share: 0.35,
    radius: [1.6, 2.5],
    alpha: [0.35, 0.5],
    fall: [22, 34],
    wind: 0.65,
  },
  {
    share: 0.25,
    radius: [2.5, 3.5],
    alpha: [0.5, 0.7],
    fall: [36, 52],
    wind: 1,
  },
] as const

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

const pickLayer = () => {
  const r = Math.random()
  if (r < LAYERS[0].share) return 0
  if (r < LAYERS[0].share + LAYERS[1].share) return 1
  return 2
}

const createFlake = (width: number, height: number): Flake => {
  const layer = pickLayer()
  const spec = LAYERS[layer]
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    layer,
    radius: randBetween(spec.radius[0], spec.radius[1]),
    baseAlpha: randBetween(spec.alpha[0], spec.alpha[1]),
    hue: randBetween(210, 225),
    sat: randBetween(8, 20),
    light: randBetween(72, 90),
    fall: randBetween(spec.fall[0], spec.fall[1]),
    windResp: spec.wind * randBetween(0.8, 1.2),
    swayAmp: randBetween(4, 12),
    swayFreq: randBetween(0.08, 0.2),
    swayPhase: Math.random() * TAU,
    shimmerFreq: randBetween(0.2, 0.5),
    shimmerPhase: Math.random() * TAU,
    glintStart: -1,
    glintDur: 0,
    flareLen: 0,
    flareAngle: 0,
  }
}

const glintEnvelope = (phase: number) =>
  Math.sin(clamp(phase, 0, 1) * Math.PI) ** 1.5

const drawFlare = (
  ctx: CanvasRenderingContext2D,
  flake: Flake,
  env: number,
  intensity: number,
) => {
  const len = flake.flareLen * env
  if (len < 0.5) return
  const alpha = 0.4 * env * intensity
  ctx.save()
  ctx.translate(flake.x, flake.y)
  ctx.rotate(flake.flareAngle)
  ctx.lineWidth = 1
  for (let i = 0; i < 2; i++) {
    const grad = ctx.createLinearGradient(-len, 0, len, 0)
    grad.addColorStop(0, 'hsla(215, 45%, 88%, 0)')
    grad.addColorStop(0.5, `hsla(215, 45%, 88%, ${alpha})`)
    grad.addColorStop(1, 'hsla(215, 45%, 88%, 0)')
    ctx.strokeStyle = grad
    ctx.beginPath()
    ctx.moveTo(-len, 0)
    ctx.lineTo(len, 0)
    ctx.stroke()
    ctx.rotate(Math.PI / 2)
  }
  ctx.restore()
}

export const KazahanaBackground: FC<KazahanaBackgroundProps> = ({
  density = 1,
  speed = 1,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flakesRef = useRef<Flake[]>([])
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const animationRef = useRef<number | null>(null)

  const propsRef = useRef({ density, speed, intensity })
  propsRef.current = { density, speed, intensity }

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

    const windDir = Math.random() < 0.5 ? -1 : 1
    let gustStart = randBetween(1.5, 4.5)
    let gustDur = randBetween(2.5, 4)
    let gustStrength = randBetween(90, 140)
    let nextGlint = randBetween(0.5, 1.5)

    const render = (now: number) => {
      const t = (now - start) / 1000
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { width, height, dpr } = sizeRef.current
      const { density: dens, speed: spd, intensity: inten } = propsRef.current

      const target = Math.round(
        clamp((width * height) / 34000, 40, 110) * Math.max(dens, 0),
      )
      const flakes = flakesRef.current
      while (flakes.length < target) flakes.push(createFlake(width, height))
      if (flakes.length > target) flakes.length = target

      // gust cycle: calm -> surge -> calm, then a randomized rest before the next
      let gustEnv = 0
      if (t >= gustStart) {
        const progress = (t - gustStart) / gustDur
        if (progress >= 1) {
          gustStart = t + randBetween(4, 8)
          gustDur = randBetween(2.5, 4)
          gustStrength = randBetween(90, 140)
        } else {
          gustEnv = Math.sin(Math.PI * progress) ** 2
        }
      }

      const breeze =
        Math.sin(t * 0.13 * TAU) * 6 + Math.sin(t * 0.047 * TAU + 1.7) * 5
      const windX = breeze + windDir * gustStrength * gustEnv

      const vmin = Math.min(width, height)
      const moonX = width * 0.16
      const moonY = height * 0.15
      const moonR = vmin * 0.4

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = 'round'

      const moonAlpha = 0.08 * inten
      if (moonAlpha > 0.003) {
        const glow = ctx.createRadialGradient(
          moonX,
          moonY,
          0,
          moonX,
          moonY,
          moonR,
        )
        glow.addColorStop(0, `hsla(218, 42%, 86%, ${moonAlpha})`)
        glow.addColorStop(0.35, `hsla(218, 42%, 86%, ${moonAlpha * 0.55})`)
        glow.addColorStop(1, 'hsla(218, 42%, 86%, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(moonX - moonR, moonY - moonR, moonR * 2, moonR * 2)
      }

      // glints only spark inside the moonlit region
      if (t >= nextGlint) {
        let active = 0
        for (const f of flakes) {
          if (f.glintStart >= 0 && t - f.glintStart < f.glintDur) active++
        }
        if (active < MAX_GLINTS) {
          const glowR2 = moonR * moonR * 0.81
          const candidates = flakes.filter((f) => {
            if (f.glintStart >= 0 && t - f.glintStart < f.glintDur) return false
            const dx = f.x - moonX
            const dy = f.y - moonY
            return dx * dx + dy * dy < glowR2
          })
          if (candidates.length > 0) {
            const f = candidates[Math.floor(Math.random() * candidates.length)]
            f.glintStart = t
            f.glintDur = randBetween(0.8, 1.4)
            f.flareLen = randBetween(6, 14)
            f.flareAngle = Math.random() < 0.5 ? 0 : Math.PI / 4
          }
        }
        nextGlint = t + randBetween(0.4, 1.2)
      }

      const margin = 24
      for (const f of flakes) {
        const swayVx = Math.sin(t * f.swayFreq * TAU + f.swayPhase) * f.swayAmp
        const vx = (windX * f.windResp + swayVx) * spd
        // gusts carry flakes: fall slows while the wind bears them sideways
        const vy = f.fall * (1 - 0.45 * gustEnv * f.windResp) * spd

        f.x += vx * dt
        f.y += vy * dt

        if (f.x > width + margin) f.x -= width + margin * 2
        else if (f.x < -margin) f.x += width + margin * 2
        if (f.y > height + margin) {
          f.y = -8 - Math.random() * 40
          f.x = Math.random() * width
          f.glintStart = -1
        }

        const shimmer =
          0.88 + 0.12 * Math.sin(t * f.shimmerFreq * TAU + f.shimmerPhase)
        const alpha = clamp(f.baseAlpha * shimmer * inten, 0, 1)
        if (alpha < 0.01) continue

        const v = Math.hypot(vx, vy)
        const streak = smoothstep(STREAK_MIN_V, STREAK_MAX_V, v)

        const dotAlpha = alpha * (1 - streak)
        if (dotAlpha > 0.01) {
          ctx.fillStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light}%, ${dotAlpha * 0.3})`
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.radius * 1.9, 0, TAU)
          ctx.fill()
          ctx.fillStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light}%, ${dotAlpha})`
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.radius, 0, TAU)
          ctx.fill()
        }

        if (streak > 0.01) {
          const k = Math.min(TRAIL_SECONDS, MAX_TRAIL_PX / v)
          const tx = f.x - vx * k
          const ty = f.y - vy * k
          const grad = ctx.createLinearGradient(f.x, f.y, tx, ty)
          grad.addColorStop(
            0,
            `hsla(${f.hue}, ${f.sat}%, ${f.light}%, ${alpha * streak})`,
          )
          grad.addColorStop(1, `hsla(${f.hue}, ${f.sat}%, ${f.light}%, 0)`)
          ctx.strokeStyle = grad
          ctx.lineWidth = f.radius * 1.5
          ctx.beginPath()
          ctx.moveTo(f.x, f.y)
          ctx.lineTo(tx, ty)
          ctx.stroke()
        }

        if (f.glintStart >= 0) {
          const phase = (t - f.glintStart) / f.glintDur
          if (phase < 1) {
            const env = glintEnvelope(phase)
            drawFlare(ctx, f, env, inten)
            const coreAlpha = clamp(
              (f.baseAlpha + (0.75 - f.baseAlpha) * env) * inten,
              0,
              1,
            )
            ctx.fillStyle = `hsla(215, 40%, ${Math.min(f.light + 12 * env, 94)}%, ${coreAlpha})`
            ctx.beginPath()
            ctx.arc(f.x, f.y, f.radius * (1 + 0.4 * env), 0, TAU)
            ctx.fill()
          }
        }
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
