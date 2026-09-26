'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { isClientSide } from '~/lib/env'

export type UmeBackgroundProps = {
  density?: number
  speed?: number
  intensity?: number
}

type DepthLayer = {
  sizeMul: number
  alphaMul: number
  speedMul: number
}

type Particle = {
  kind: 'petal' | 'snow'
  layer: DepthLayer
  baseX: number
  y: number
  size: number
  alpha: number
  fall: number
  hue: number
  sat: number
  light: number
  swayAmp1: number
  swayFreq1: number
  swayPhase1: number
  swayAmp2: number
  swayFreq2: number
  swayPhase2: number
  rotation: number
  rotVel: number
  tilt: number
  tiltVel: number
  spriteIndex: number
}

const TAU = Math.PI * 2
const SPRITE_SIZE = 64
const PETAL_RATIO = 0.7

const DEPTH_LAYERS: DepthLayer[] = [
  { sizeMul: 0.6, alphaMul: 0.6, speedMul: 0.55 },
  { sizeMul: 0.8, alphaMul: 0.85, speedMul: 0.78 },
  { sizeMul: 1, alphaMul: 1, speedMul: 1 },
]

const randBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const pickLayer = () => {
  const r = Math.random()
  if (r < 0.4) return DEPTH_LAYERS[0]
  if (r < 0.75) return DEPTH_LAYERS[1]
  return DEPTH_LAYERS[2]
}

// Rounded-obovate plum petal: pinched base at +L, blunt round tip at -L,
// shaded lighter toward the rim and deeper toward the base.
const createPetalSprite = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const hue = randBetween(348, 355)
  const sat = randBetween(45, 65)
  const light = randBetween(45, 62)
  const half = SPRITE_SIZE / 2
  const length = half * 0.82
  const width = length * randBetween(0.56, 0.72)

  ctx.translate(half, half)
  ctx.beginPath()
  ctx.moveTo(0, length)
  ctx.bezierCurveTo(
    width * 1.05,
    length * 0.7,
    width * 1.12,
    -length * 0.52,
    0,
    -length,
  )
  ctx.bezierCurveTo(
    -width * 1.12,
    -length * 0.52,
    -width * 1.05,
    length * 0.7,
    0,
    length,
  )
  ctx.closePath()

  const gradient = ctx.createRadialGradient(
    0,
    -length * 0.25,
    length * 0.12,
    0,
    0,
    length * 1.35,
  )
  gradient.addColorStop(
    0,
    `hsl(${hue}, ${Math.max(sat - 8, 30)}%, ${Math.min(light + 12, 72)}%)`,
  )
  gradient.addColorStop(0.55, `hsl(${hue}, ${sat}%, ${light}%)`)
  gradient.addColorStop(
    1,
    `hsl(${hue}, ${Math.min(sat + 8, 70)}%, ${light - 9}%)`,
  )
  ctx.fillStyle = gradient
  ctx.fill()

  return canvas
}

const createParticle = (
  width: number,
  height: number,
  spriteCount: number,
): Particle => {
  const kind = Math.random() < PETAL_RATIO ? 'petal' : 'snow'
  const isPetal = kind === 'petal'
  const layer = pickLayer()

  return {
    kind,
    layer,
    baseX: Math.random() * width,
    y: Math.random() * height,
    size: isPetal
      ? randBetween(13, 20) * layer.sizeMul
      : randBetween(2, 4) * layer.sizeMul,
    alpha: isPetal ? randBetween(0.4, 0.65) : randBetween(0.25, 0.42),
    fall: isPetal ? randBetween(34, 55) : randBetween(14, 25),
    hue: randBetween(205, 215),
    sat: randBetween(15, 25),
    light: randBetween(70, 80),
    swayAmp1: isPetal ? randBetween(6, 13) : randBetween(12, 22),
    swayFreq1: isPetal ? randBetween(0.05, 0.1) : randBetween(0.04, 0.08),
    swayPhase1: Math.random() * TAU,
    swayAmp2: isPetal ? randBetween(2, 5) : randBetween(4, 8),
    swayFreq2: isPetal ? randBetween(0.14, 0.26) : randBetween(0.12, 0.2),
    swayPhase2: Math.random() * TAU,
    rotation: Math.random() * TAU,
    rotVel: randBetween(0.2, 0.55) * (Math.random() < 0.5 ? -1 : 1),
    tilt: Math.random() * TAU,
    tiltVel: randBetween(0.35, 0.8) * (Math.random() < 0.5 ? -1 : 1),
    spriteIndex: Math.floor(Math.random() * Math.max(spriteCount, 1)),
  }
}

export const UmeBackground: FC<UmeBackgroundProps> = ({
  density = 1,
  speed = 1,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const spritesRef = useRef<HTMLCanvasElement[]>([])
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const animationRef = useRef<number | null>(null)

  const propsRef = useRef({ density, speed, intensity })
  propsRef.current = { density, speed, intensity }

  const rebuildParticles = (width: number, height: number) => {
    const count = Math.max(
      8,
      Math.min(
        90,
        Math.round(((width * height) / 45000) * propsRef.current.density),
      ),
    )
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(width, height, spritesRef.current.length),
    )
  }

  useIsomorphicLayoutEffect(() => {
    if (!isClientSide) return
    const canvas = canvasRef.current
    if (!canvas) return

    if (spritesRef.current.length === 0) {
      spritesRef.current = Array.from({ length: 4 }, () => createPetalSprite())
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { innerWidth: w, innerHeight: h } = window
      sizeRef.current = { width: w, height: h, dpr }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      rebuildParticles(w, h)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const { width, height } = sizeRef.current
    if (width && height) rebuildParticles(width, height)
  }, [density])

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
      const { speed: spd, intensity: inten } = propsRef.current

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const ts = t * spd
      const particles = particlesRef.current
      const sprites = spritesRef.current

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.y += p.fall * p.layer.speedMul * spd * dt
        p.rotation += p.rotVel * spd * dt
        p.tilt += p.tiltVel * spd * dt

        const margin = p.size + 30
        if (p.y - margin > height) {
          const fresh = createParticle(width, height, sprites.length)
          fresh.y = -fresh.size - randBetween(0, 60)
          particles[i] = fresh
          continue
        }

        const x =
          p.baseX +
          Math.sin(ts * p.swayFreq1 * TAU + p.swayPhase1) * p.swayAmp1 +
          Math.sin(ts * p.swayFreq2 * TAU + p.swayPhase2) * p.swayAmp2

        const alpha = Math.min(1, p.alpha * p.layer.alphaMul * inten)
        if (alpha <= 0.005) continue

        if (p.kind === 'petal') {
          if (sprites.length === 0) continue
          const sprite = sprites[p.spriteIndex % sprites.length]
          ctx.save()
          ctx.translate(x, p.y)
          ctx.rotate(p.rotation)
          const foreshorten = 0.65 + 0.35 * Math.abs(Math.cos(p.tilt))
          ctx.scale(foreshorten, 1)
          ctx.globalAlpha = alpha
          ctx.drawImage(sprite, -p.size / 2, -p.size / 2, p.size, p.size)
          ctx.restore()
        } else {
          const glowRadius = p.size * 2.1
          const gradient = ctx.createRadialGradient(
            x,
            p.y,
            0,
            x,
            p.y,
            glowRadius,
          )
          gradient.addColorStop(
            0,
            `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`,
          )
          gradient.addColorStop(
            0.55,
            `hsla(${p.hue}, ${p.sat + 5}%, ${p.light - 8}%, ${alpha * 0.8})`,
          )
          gradient.addColorStop(1, `hsla(${p.hue}, ${p.sat}%, ${p.light}%, 0)`)
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(x, p.y, glowRadius, 0, TAU)
          ctx.fill()
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
