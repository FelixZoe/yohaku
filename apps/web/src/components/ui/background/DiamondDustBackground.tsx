'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { isClientSide } from '~/lib/env'

export type DiamondDustBackgroundProps = {
  density?: number
  speed?: number
  intensity?: number
}

type Mote = {
  x: number
  y: number
  radius: number
  baseAlpha: number
  hue: number
  sat: number
  light: number
  ax1: number
  ax2: number
  ay1: number
  ay2: number
  fx1: number
  fx2: number
  fy1: number
  fy2: number
  px1: number
  px2: number
  py1: number
  py2: number
  fall: number
  glintStart: number
  glintDur: number
  flareLen: number
  flareAngle: number
  tint: { h: number; s: number; l: number }
}

const TAU = Math.PI * 2
const BASE_MOTES = 70
const MAX_GLINTS = 6
const TINTS = [
  { h: 195, s: 45, l: 72 },
  { h: 348, s: 38, l: 76 },
  { h: 46, s: 48, l: 70 },
]

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const createMote = (width: number, height: number): Mote => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radius: randBetween(0.8, 2.2),
  baseAlpha: randBetween(0.12, 0.28),
  hue: randBetween(202, 214),
  sat: randBetween(18, 30),
  light: randBetween(68, 78),
  ax1: randBetween(1.2, 3),
  ax2: randBetween(0.5, 1.5),
  ay1: randBetween(1, 2.4),
  ay2: randBetween(0.4, 1.2),
  fx1: randBetween(0.05, 0.16),
  fx2: randBetween(0.18, 0.4),
  fy1: randBetween(0.04, 0.14),
  fy2: randBetween(0.15, 0.35),
  px1: Math.random() * TAU,
  px2: Math.random() * TAU,
  py1: Math.random() * TAU,
  py2: Math.random() * TAU,
  fall: randBetween(0.8, 2),
  glintStart: -1,
  glintDur: 0,
  flareLen: 0,
  flareAngle: 0,
  tint: TINTS[0],
})

const glintEnvelope = (phase: number) =>
  Math.sin(clamp(phase, 0, 1) * Math.PI) ** 1.5

const driftOffset = (mote: Mote, t: number, speed: number) => {
  const s = Math.sqrt(speed)
  return {
    dx:
      mote.ax1 * s * Math.sin(t * mote.fx1 * speed * TAU + mote.px1) +
      mote.ax2 * s * Math.sin(t * mote.fx2 * speed * TAU + mote.px2),
    dy:
      mote.ay1 * s * Math.sin(t * mote.fy1 * speed * TAU + mote.py1) +
      mote.ay2 * s * Math.sin(t * mote.fy2 * speed * TAU + mote.py2) +
      mote.fall * speed * t,
  }
}

const drawFlare = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mote: Mote,
  env: number,
  intensity: number,
) => {
  const len = mote.flareLen * env
  if (len < 0.5) return
  const { h, s, l } = mote.tint
  const alpha = 0.38 * env * intensity
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(mote.flareAngle)
  ctx.lineWidth = 1
  for (let i = 0; i < 2; i++) {
    const grad = ctx.createLinearGradient(-len, 0, len, 0)
    grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, 0)`)
    grad.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, ${alpha})`)
    grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`)
    ctx.strokeStyle = grad
    ctx.beginPath()
    ctx.moveTo(-len, 0)
    ctx.lineTo(len, 0)
    ctx.stroke()
    ctx.rotate(Math.PI / 2)
  }
  ctx.restore()
}

export const DiamondDustBackground: FC<DiamondDustBackgroundProps> = ({
  density = 1,
  speed = 1,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motesRef = useRef<Mote[]>([])
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
    let nextGlint =
      randBetween(0.6, 2) / Math.max(propsRef.current.density, 0.01)

    const render = (now: number) => {
      const t = (now - start) / 1000
      const { width, height, dpr } = sizeRef.current
      const { density: dens, speed: spd, intensity: glow } = propsRef.current

      const target = Math.round(BASE_MOTES * dens)
      const motes = motesRef.current
      while (motes.length < target) motes.push(createMote(width, height))
      if (motes.length > target) motes.length = target

      let active = 0
      for (const mote of motes) {
        if (mote.glintStart >= 0 && t - mote.glintStart < mote.glintDur)
          active++
      }

      if (t >= nextGlint) {
        if (active < MAX_GLINTS && motes.length > 0) {
          const mote = motes[Math.floor(Math.random() * motes.length)]
          if (mote.glintStart < 0 || t - mote.glintStart >= mote.glintDur) {
            mote.glintStart = t
            mote.glintDur = randBetween(0.9, 1.6)
            mote.flareLen = randBetween(6, 14)
            mote.flareAngle = Math.random() < 0.5 ? 0 : Math.PI / 4
            mote.tint = TINTS[Math.floor(Math.random() * TINTS.length)]
          }
        }
        nextGlint = t + randBetween(0.6, 2) / Math.max(dens, 0.01)
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      for (const mote of motes) {
        const { dx, dy } = driftOffset(mote, t, spd)
        const x = (((mote.x + dx) % width) + width) % width
        const y = (((mote.y + dy) % height) + height) % height

        let env = 0
        if (mote.glintStart >= 0) {
          const phase = (t - mote.glintStart) / mote.glintDur
          if (phase < 1) env = glintEnvelope(phase)
        }

        if (env > 0.01) {
          drawFlare(ctx, x, y, mote, env, glow)
          const { h, s, l } = mote.tint
          const coreAlpha =
            (mote.baseAlpha + (0.6 - mote.baseAlpha) * env) * glow
          ctx.fillStyle = `hsla(${h}, ${s}%, ${Math.min(l + 14 * env, 92)}%, ${coreAlpha})`
        } else {
          ctx.fillStyle = `hsla(${mote.hue}, ${mote.sat}%, ${mote.light}%, ${mote.baseAlpha * glow})`
        }

        ctx.beginPath()
        ctx.arc(x, y, mote.radius * (1 + 0.4 * env), 0, TAU)
        ctx.fill()
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
