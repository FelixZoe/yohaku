'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { isClientSide } from '~/lib/env'

export type HanabiBackgroundProps = {
  density?: number
  speed?: number
  intensity?: number
}

type BurstType = 'peony' | 'willow' | 'chrysanthemum'

type Tint = { h: number; s: number; l: number }

type Shell = {
  x: number
  y: number
  prevY: number
  vy: number
  decel: number
  targetY: number
  type: BurstType
  tint: Tint
}

type Spark = {
  x: number
  y: number
  prevX: number
  prevY: number
  vx: number
  vy: number
  drag: number
  gravity: number
  life: number
  maxLife: number
  baseAlpha: number
  width: number
  hue: number
  sat: number
  light: number
  flickerFreq: number
  flickerPhase: number
  pop: boolean
  trail: { x: number; y: number }[] | null
  lastTrailAt: number
}

type Glow = {
  x: number
  y: number
  radius: number
  age: number
  dur: number
  tint: Tint
}

const TAU = Math.PI * 2
const MAX_SPARKS = 600
const TRAIL_INTERVAL = 0.055
const TRAIL_LENGTH = 5

const GOLD: Tint = { h: 45, s: 60, l: 70 }
const TINTS: Tint[] = [
  GOLD,
  { h: 355, s: 55, l: 75 },
  { h: 190, s: 45, l: 70 },
  { h: 265, s: 35, l: 75 },
]

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const pickBurstType = (): BurstType => {
  const r = Math.random()
  if (r < 0.3) return 'willow'
  if (r < 0.75) return 'peony'
  return 'chrysanthemum'
}

const createShell = (width: number, height: number): Shell => {
  const type = pickBurstType()
  const targetY = randBetween(0.08, 0.33) * height
  const startY = height + 12
  // constant deceleration so the shell nearly stalls at its apex
  const duration = randBetween(1, 1.5)
  const dist = startY - targetY
  const v0 = (2 * dist) / duration
  return {
    x: randBetween(0.15, 0.85) * width,
    y: startY,
    prevY: startY,
    vy: -v0,
    decel: v0 / duration,
    targetY,
    type,
    tint:
      type === 'willow'
        ? GOLD
        : TINTS[Math.floor(Math.random() * TINTS.length)],
  }
}

const spawnBurst = (
  shell: Shell,
  vmin: number,
  t: number,
  sparks: Spark[],
  glows: Glow[],
) => {
  const radius = randBetween(0.12, 0.2) * vmin
  const willow = shell.type === 'willow'
  const count = willow
    ? Math.round(randBetween(40, 80))
    : Math.round(randBetween(60, 120))
  const drag = willow ? 0.7 : 2.4
  const gravity = willow ? 55 : 14
  // with exponential drag the travel distance converges to v0 / drag
  const v0 = willow ? radius * 1.1 : radius * drag
  const step = TAU / count

  for (let i = 0; i < count; i++) {
    if (sparks.length >= MAX_SPARKS) break
    const angle = (i + randBetween(-0.4, 0.4)) * step
    const speed = v0 * randBetween(0.75, 1.05)
    sparks.push({
      x: shell.x,
      y: shell.y,
      prevX: shell.x,
      prevY: shell.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      drag,
      gravity,
      life: 0,
      maxLife: willow ? randBetween(3, 4) : randBetween(1.6, 2.4),
      baseAlpha: randBetween(0.38, 0.52),
      width: randBetween(1, 1.5),
      hue: shell.tint.h + randBetween(-4, 4),
      sat: shell.tint.s + randBetween(-4, 4),
      light: shell.tint.l + randBetween(-3, 3),
      flickerFreq: randBetween(6, 12),
      flickerPhase: Math.random() * TAU,
      pop: shell.type === 'chrysanthemum',
      trail: willow ? [] : null,
      lastTrailAt: t,
    })
  }

  glows.push({
    x: shell.x,
    y: shell.y,
    radius: radius * 0.8,
    age: 0,
    dur: 1.5,
    tint: shell.tint,
  })
}

export const HanabiBackground: FC<HanabiBackgroundProps> = ({
  density = 1,
  speed = 1,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const animationRef = useRef<number | null>(null)
  const shellsRef = useRef<Shell[]>([])
  const sparksRef = useRef<Spark[]>([])
  const glowsRef = useRef<Glow[]>([])

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

    ctx.lineCap = 'round'

    let vt = 0
    let last = performance.now()
    let nextLaunchAt = randBetween(1.2, 2.5)

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { width, height, dpr } = sizeRef.current
      const { density: dens, speed: spd, intensity: inten } = propsRef.current
      const sdt = dt * spd
      vt += sdt

      const shells = shellsRef.current
      const sparks = sparksRef.current
      const glows = glowsRef.current
      const vmin = Math.min(width, height)

      if (vt >= nextLaunchAt) {
        if (width > 0 && sparks.length < MAX_SPARKS * 0.8) {
          shells.push(createShell(width, height))
          if (Math.random() < 0.2) shells.push(createShell(width, height))
        }
        nextLaunchAt = vt + randBetween(5, 9) / Math.max(dens, 0.05)
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = 'round'

      for (let i = glows.length - 1; i >= 0; i--) {
        const glow = glows[i]
        glow.age += sdt
        const p = glow.age / glow.dur
        if (p >= 1) {
          glows.splice(i, 1)
          continue
        }
        const env = (1 - p) ** 1.7
        const r = glow.radius * (0.9 + 0.3 * p)
        const { h, s, l } = glow.tint
        const alpha = Math.min(1, 0.08 * env * inten)
        const grad = ctx.createRadialGradient(
          glow.x,
          glow.y,
          0,
          glow.x,
          glow.y,
          r,
        )
        grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${alpha})`)
        grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(glow.x, glow.y, r, 0, TAU)
        ctx.fill()
      }

      for (let i = shells.length - 1; i >= 0; i--) {
        const shell = shells[i]
        shell.prevY = shell.y
        shell.vy += shell.decel * sdt
        shell.y += shell.vy * sdt

        if (shell.y <= shell.targetY || shell.vy >= -30) {
          spawnBurst(shell, vmin, vt, sparks, glows)
          shells.splice(i, 1)
          continue
        }

        const alpha = Math.min(
          1,
          (0.12 + 0.05 * Math.sin(vt * 40 + shell.x)) * inten,
        )
        ctx.strokeStyle = `hsla(45, 45%, 80%, ${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(shell.x, shell.prevY)
        ctx.lineTo(shell.x, shell.y)
        ctx.stroke()
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life += sdt
        const lifeFrac = s.life / s.maxLife
        if (lifeFrac >= 1) {
          sparks.splice(i, 1)
          continue
        }

        s.prevX = s.x
        s.prevY = s.y
        const dragFactor = Math.exp(-s.drag * sdt)
        s.vx *= dragFactor
        s.vy = s.vy * dragFactor + s.gravity * sdt
        s.x += s.vx * sdt
        s.y += s.vy * sdt

        if (s.trail && vt - s.lastTrailAt >= TRAIL_INTERVAL) {
          s.trail.unshift({ x: s.prevX, y: s.prevY })
          if (s.trail.length > TRAIL_LENGTH) s.trail.pop()
          s.lastTrailAt = vt
        }

        const env = (1 - lifeFrac) ** 1.6
        const flicker =
          0.72 + 0.28 * Math.sin(vt * s.flickerFreq * TAU + s.flickerPhase)
        let popBoost = 0
        if (s.pop && lifeFrac > 0.76 && lifeFrac < 0.9) {
          popBoost = Math.sin(((lifeFrac - 0.76) / 0.14) * Math.PI) * 0.35
        }
        const alpha = Math.min(
          1,
          Math.min(0.55, s.baseAlpha * env * flicker + popBoost) * inten,
        )
        if (alpha < 0.005) continue

        const color = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${alpha})`
        ctx.lineWidth = s.width

        if (s.trail && s.trail.length > 0) {
          let px = s.x
          let py = s.y
          for (const [j, pt] of s.trail.entries()) {
            const fade = 1 - j / (s.trail.length + 1)
            ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${alpha * fade * 0.8})`
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(pt.x, pt.y)
            ctx.stroke()
            px = pt.x
            py = pt.y
          }
          continue
        }

        const dx = s.x - s.prevX
        const dy = s.y - s.prevY
        if (dx * dx + dy * dy < 0.5) {
          // near-stationary sparks: zero-length strokes render nothing
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.width * 0.55, 0, TAU)
          ctx.fill()
        } else {
          ctx.strokeStyle = color
          ctx.beginPath()
          ctx.moveTo(s.prevX, s.prevY)
          ctx.lineTo(s.x, s.y)
          ctx.stroke()
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
