'use client'

import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { clsxm } from '~/lib/helper'

const TAU = Math.PI * 2

const PHASES = {
  fallStart: 0,
  fallEnd: 0.15,
  mergeStart: 0.15,
  mergeEnd: 0.24,
  ring1Start: 0.15,
  ring1End: 1,
  ring2Start: 0.44,
  ring2End: 1,
}
const FALL_EXP = 2.2
const MERGE_EXP = 2.2
const BASELINE_RATIO = 0.68
const DROP_RADIUS_RATIO = 0.135
const FALL_START_MULTIPLIER = -4
const PANCAKE_SCALE_X_MAX = 1.68
const RING_ASPECT = 0.32
const RING_EASE_EXP = 1.8
const RING_ALPHA_EXP = 1.2
const SECONDARY_RING_SCALE = 0.75
const SECONDARY_RING_ALPHA = 0.6
const DROP_STOP_RY = 0.5
const RING_MAX_RATIO = 0.43
const RING_PEAK_ALPHA = 0.72

type RingCount = 1 | 2

type Instance = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  cycle: number
  rings: RingCount
  cssW: number
  cssH: number
  dpr: number
}

type Tone = {
  core: string
  highlight: string
  shoulder: string
  edge: string
  ring: (alpha: number) => string
}

let instances: Instance[] = []
let rafId: number | null = null
let startTime = 0

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const easeOut = (p: number, exp: number) => 1 - (1 - p) ** exp

function parseRgb(value: string) {
  const body = value.match(/rgba?\((.*)\)/)?.[1]
  if (!body) return { r: 20, g: 19, b: 18 }
  const tokens = body
    .replaceAll('/', ' ')
    .split(/[\s,]+/)
    .filter(Boolean)

  const channel = (token: string) => {
    if (token.endsWith('%')) return Math.round((parseFloat(token) / 100) * 255)
    return Math.round(parseFloat(token))
  }
  const r = channel(tokens[0])
  const g = channel(tokens[1])
  const b = channel(tokens[2])
  if (![r, g, b].every(Number.isFinite)) return { r: 20, g: 19, b: 18 }

  return {
    r: clamp01(r / 255) * 255,
    g: clamp01(g / 255) * 255,
    b: clamp01(b / 255) * 255,
  }
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }

  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h = Math.round(h * 60)
  if (h < 0) h += 360

  return { h, s, l }
}

function makeTone(canvas: HTMLCanvasElement): Tone {
  const rgb = parseRgb(getComputedStyle(canvas).color)
  const hsl = rgbToHsl(rgb)
  const sat = Math.round(clamp01(hsl.s + 0.04) * 100)
  const light = (delta: number) => Math.round(clamp01(hsl.l + delta) * 100)
  const hsla = (delta: number, alpha = 1) =>
    `hsla(${hsl.h}, ${sat}%, ${light(delta)}%, ${clamp01(alpha)})`

  return {
    core: hsla(0, 1),
    highlight: hsla(hsl.l < 0.5 ? 0.52 : 0.18, 0.72),
    shoulder: hsla(hsl.l < 0.5 ? 0.18 : 0.06, 0.96),
    edge: hsla(hsl.l > 0.58 ? -0.34 : -0.16, 1),
    ring: (alpha: number) =>
      `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(
        rgb.b,
      )}, ${clamp01(alpha)})`,
  }
}

function resize(inst: Instance) {
  const c = inst.canvas
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = c.clientWidth
  const h = c.clientHeight
  if (!w || !h) return false
  const pw = Math.round(w * dpr)
  const ph = Math.round(h * dpr)
  if (c.width !== pw || c.height !== ph) {
    c.width = pw
    c.height = ph
  }
  inst.cssW = w
  inst.cssH = h
  inst.dpr = dpr
  return true
}

function strokeRing(
  ctx: CanvasRenderingContext2D,
  tone: Tone,
  cx: number,
  baselineY: number,
  radius: number,
  p: number,
  peakAlpha: number,
  maxWidth: number,
) {
  if (radius <= 0) return
  const alpha = peakAlpha * (1 - p) ** RING_ALPHA_EXP
  if (alpha < 0.003) return

  const lineWidth = lerp(
    Math.max(0.35, maxWidth * 0.35),
    maxWidth,
    (1 - p) ** 0.9,
  )
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = tone.ring(alpha)
  ctx.beginPath()
  ctx.ellipse(cx, baselineY, radius, radius * RING_ASPECT, 0, 0, TAU)
  ctx.stroke()
}

function fillDrop(
  ctx: CanvasRenderingContext2D,
  tone: Tone,
  cx: number,
  centerY: number,
  rx: number,
  ry: number,
) {
  if (ry < DROP_STOP_RY) return

  const gradientRadius = Math.max(rx, ry) * 1.22
  const gradient = ctx.createRadialGradient(
    cx - rx * 0.38,
    centerY - ry * 0.52,
    Math.max(0.15, Math.min(rx, ry) * 0.06),
    cx + rx * 0.16,
    centerY + ry * 0.1,
    gradientRadius,
  )
  gradient.addColorStop(0, tone.highlight)
  gradient.addColorStop(0.22, tone.shoulder)
  gradient.addColorStop(0.68, tone.core)
  gradient.addColorStop(1, tone.edge)

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(cx, centerY, rx, ry, 0, 0, TAU)
  ctx.fill()
}

function drawInstance(inst: Instance, now: number) {
  if (!resize(inst)) return

  const { canvas, ctx, cssW, cssH, dpr, cycle, rings } = inst
  const t = ((now - startTime) % cycle) / cycle

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  const cx = cssW / 2
  const baselineY = cssH * BASELINE_RATIO
  const size = Math.min(cssW, cssH)
  const dropRadius = size * DROP_RADIUS_RATIO
  const tone = makeTone(canvas)
  const ring1MaxRadius = size * RING_MAX_RATIO
  const ring2MaxRadius = ring1MaxRadius * SECONDARY_RING_SCALE
  const maxLineWidth = Math.max(0.65, size * 0.036)

  if (t >= PHASES.fallStart && t < PHASES.mergeEnd) {
    let centerY: number
    let rx: number
    let ry: number
    if (t < PHASES.fallEnd) {
      const p = (t - PHASES.fallStart) / (PHASES.fallEnd - PHASES.fallStart)
      const e = p ** FALL_EXP
      const startCenterY = FALL_START_MULTIPLIER * dropRadius
      const endCenterY = baselineY - dropRadius
      centerY = startCenterY + (endCenterY - startCenterY) * e
      rx = dropRadius
      ry = dropRadius
    } else {
      const p = (t - PHASES.mergeStart) / (PHASES.mergeEnd - PHASES.mergeStart)
      const spread = easeOut(p, 2)
      const scaleX = lerp(1, PANCAKE_SCALE_X_MAX, spread)
      const scaleY = (1 - p) ** MERGE_EXP
      rx = dropRadius * scaleX
      ry = dropRadius * scaleY
      centerY = baselineY - ry
    }
    fillDrop(ctx, tone, cx, centerY, rx, ry)
  }

  if (t >= PHASES.ring1Start && t < PHASES.ring1End) {
    const p = (t - PHASES.ring1Start) / (PHASES.ring1End - PHASES.ring1Start)
    const radius = ring1MaxRadius * easeOut(p, RING_EASE_EXP)
    strokeRing(
      ctx,
      tone,
      cx,
      baselineY,
      radius,
      p,
      RING_PEAK_ALPHA,
      maxLineWidth,
    )
  }

  if (rings >= 2 && t >= PHASES.ring2Start && t < PHASES.ring2End) {
    const p = (t - PHASES.ring2Start) / (PHASES.ring2End - PHASES.ring2Start)
    const radius = ring2MaxRadius * easeOut(p, RING_EASE_EXP)
    strokeRing(
      ctx,
      tone,
      cx,
      baselineY,
      radius,
      p,
      RING_PEAK_ALPHA * SECONDARY_RING_ALPHA,
      maxLineWidth * 0.78,
    )
  }
}

function tick(now: number) {
  for (const inst of instances) drawInstance(inst, now)
  rafId = requestAnimationFrame(tick)
}

function startTicker() {
  if (rafId !== null) return
  startTime = performance.now()
  rafId = requestAnimationFrame(tick)
}

function stopTicker() {
  if (rafId === null) return
  cancelAnimationFrame(rafId)
  rafId = null
}

const SIZE_MAP = { sm: 18, md: 30, lg: 60 } as const
type SizeKey = keyof typeof SIZE_MAP

interface LoadingMarkProps {
  className?: string
  cycle?: number
  rings?: RingCount
  size?: SizeKey | number
}

export const LoadingMark: FC<LoadingMarkProps> = ({
  size = 'md',
  cycle = 2600,
  rings = 2,
  className,
}) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const px = typeof size === 'number' ? size : SIZE_MAP[size]

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const instance: Instance = {
      canvas,
      ctx,
      cycle,
      rings,
      cssW: 0,
      cssH: 0,
      dpr: 1,
    }
    instances.push(instance)
    if (instances.length === 1) startTicker()
    return () => {
      instances = instances.filter((i) => i !== instance)
      if (instances.length === 0) stopTicker()
    }
  }, [cycle, rings])

  return (
    <canvas
      aria-hidden
      className={clsxm('inline-block shrink-0 align-middle', className)}
      ref={ref}
      style={{ width: px, height: px }}
    />
  )
}

LoadingMark.displayName = 'LoadingMark'
