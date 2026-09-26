'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { isClientSide } from '~/lib/env'

import { shaderSource } from './AjisaiBackground.shader'

export type AjisaiVariant = 'petal' | 'bokeh' | 'ripple' | 'full'

export type AjisaiBackgroundProps = {
  density?: number
  speed?: number
  intensity?: number
  variant?: AjisaiVariant
}

type RainStreak = {
  x: number
  y: number
  len: number
  vel: number
  alphaScale: number
  groundY: number | null
}

type BokehPatch = {
  x: number
  y: number
  radius: number
  aspect: number
  driftAmpX: number
  driftAmpY: number
  driftFreq: number
  driftPhase: number
  breathFreq: number
  breathPhase: number
  baseAlpha: number
  sprite: HTMLCanvasElement
}

type Ripple = {
  x: number
  y: number
  age: number
  duration: number
  maxRadius: number
  second: boolean
  secondDelay: number
}

type Floret = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  baseSize: number
  opacity: number
  seed: number
  rotation: number
  angularVelocity: number
  tilt: number
  tiltVelocity: number
}

const TAU = Math.PI * 2
const SLANT = Math.tan((8 * Math.PI) / 180)

const INSTANCE_STRIDE = 8
const UNIFORM_FLOATS = 16
const NEAR = 0.5
const FAR = 1.4
const CAMERA_Z = 0.1
const FOCUS_Z = 0.8
const APERTURE_SCALE = 0.88

const quadVertices = new Float32Array([
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
])

const LANDING_RATE = 0.04
const RIPPLE_BAND_TOP = 0.84
const RIPPLE_BAND_RANGE = 0.12
const MAX_RIPPLES = 14

const rollGroundY = (height: number): number | null =>
  Math.random() < LANDING_RATE
    ? height * (RIPPLE_BAND_TOP + Math.random() * RIPPLE_BAND_RANGE)
    : null

const createStreak = (width: number, height: number): RainStreak => {
  const groundY = rollGroundY(height)
  return {
    x: Math.random() * (width + height * SLANT),
    y: Math.random() * (groundY ?? height),
    len: 24 + Math.random() * 16,
    vel: 150 + Math.random() * 130,
    alphaScale: 0.55 + Math.random() * 0.45,
    groundY,
  }
}

const resetStreak = (streak: RainStreak, width: number, height: number) => {
  streak.y = -streak.len
  streak.x = Math.random() * (width + height * SLANT)
  streak.groundY = rollGroundY(height)
}

const createBokehSprite = (
  radius: number,
  hue: number,
  sat: number,
  light: number,
  dpr: number,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  const px = Math.max(2, Math.ceil(radius * 2 * dpr))
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const c = px / 2
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
  gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, 1)`)
  gradient.addColorStop(0.55, `hsla(${hue}, ${sat}%, ${light}%, 0.5)`)
  gradient.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, px, px)
  return canvas
}

const createRippleAt = (x: number, y: number, height: number): Ripple => {
  const depthNorm = Math.min(
    1,
    Math.max(0, (y / height - RIPPLE_BAND_TOP) / RIPPLE_BAND_RANGE),
  )
  return {
    x,
    y,
    age: 0,
    duration: 2.4 + Math.random() * 1.2 - depthNorm * 0.6,
    maxRadius: 30 + Math.random() * 14 + depthNorm * 26,
    second: Math.random() < 0.4,
    secondDelay: 0.4 + Math.random() * 0.2,
  }
}

export const AjisaiBackground: FC<AjisaiBackgroundProps> = ({
  density = 1,
  speed = 1,
  intensity = 1,
  variant = 'petal',
}) => {
  const rainCanvasRef = useRef<HTMLCanvasElement>(null)
  const rainRef = useRef<RainStreak[]>([])
  const bokehRef = useRef<BokehPatch[]>([])
  const ripplesRef = useRef<Ripple[]>([])
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const rainAnimationRef = useRef<number | null>(null)

  const floretCanvasRef = useRef<HTMLCanvasElement>(null)
  const deviceRef = useRef<GPUDevice | null>(null)
  const contextRef = useRef<GPUCanvasContext | null>(null)
  const pipelineRef = useRef<GPURenderPipeline | null>(null)
  const uniformBufferRef = useRef<GPUBuffer | null>(null)
  const bindGroupRef = useRef<GPUBindGroup | null>(null)
  const quadBufferRef = useRef<GPUBuffer | null>(null)
  const instanceBufferRef = useRef<GPUBuffer | null>(null)
  const instanceDataRef = useRef<Float32Array | null>(null)
  const uniformDataRef = useRef<Float32Array>(new Float32Array(UNIFORM_FLOATS))
  const formatRef = useRef<GPUTextureFormat | null>(null)
  const sampleCountRef = useRef(1)
  const msaaTextureRef = useRef<GPUTexture | null>(null)
  const msaaTextureSizeRef = useRef({ width: 0, height: 0 })
  const unsupportedRef = useRef(false)
  const renderRef = useRef<(time: number) => void>((_time: number) => {})
  const updateFloretsRef = useRef<(dt: number, time: number) => void>(
    (_dt: number, _time: number) => {},
  )

  const floretsRef = useRef<Floret[]>([])
  const floretAnimationRef = useRef<number | null>(null)
  const lastRafTsRef = useRef<number>(0)

  const propsRef = useRef({ density, speed, intensity, variant })
  propsRef.current = { density, speed, intensity, variant }

  const [dimensions, setDimensions] = useState(() =>
    isClientSide
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  )
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null)

  const rebuildRain = (width: number, height: number) => {
    const { density: d } = propsRef.current
    rainRef.current = Array.from(
      { length: Math.max(0, Math.round(90 * d)) },
      () => createStreak(width, height),
    )
  }

  const rebuildBokeh = (width: number, height: number, dpr: number) => {
    const { density: d } = propsRef.current
    const count = Math.min(
      12,
      Math.max(
        0,
        Math.round((5 + Math.random() * 3) * (0.6 + 0.4 * Math.max(0, d))),
      ),
    )
    bokehRef.current = Array.from({ length: count }, (_, i) => {
      const radius = 90 + Math.random() * 110
      const hue = 225 + Math.random() * 50
      const sat = 30 + Math.random() * 15
      const light = 60 + Math.random() * 12
      return {
        x: ((i + 0.15 + Math.random() * 0.7) / Math.max(1, count)) * width,
        y: (0.7 + Math.random() * 0.35) * height,
        radius,
        aspect: 0.6 + Math.random() * 0.25,
        driftAmpX: 4 + Math.random() * 6,
        driftAmpY: 2 + Math.random() * 3,
        driftFreq: 0.3 + Math.random() * 0.3,
        driftPhase: Math.random() * TAU,
        breathFreq: TAU / (8 + Math.random() * 6),
        breathPhase: Math.random() * TAU,
        baseAlpha: 0.1 + Math.random() * 0.06,
        sprite: createBokehSprite(radius, hue, sat, light, dpr),
      }
    })
  }

  useIsomorphicLayoutEffect(() => {
    if (!isClientSide) return
    const canvas = rainCanvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { innerWidth: w, innerHeight: h } = window
      sizeRef.current = { width: w, height: h, dpr }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      rebuildRain(w, h)
      const v = propsRef.current.variant
      if (v === 'bokeh' || v === 'full') rebuildBokeh(w, h, dpr)
      setDimensions({ width: w, height: h })
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const { width, height } = sizeRef.current
    if (width && height) rebuildRain(width, height)
  }, [density])

  useEffect(() => {
    const { width, height, dpr } = sizeRef.current
    if (!width || !height) return
    if (variant === 'bokeh' || variant === 'full') {
      rebuildBokeh(width, height, dpr)
    } else {
      bokehRef.current = []
    }
  }, [variant, density])

  useEffect(() => {
    if (!isClientSide) return
    const canvas = rainCanvasRef.current
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
      const { speed: spd, intensity: inten, variant: v } = propsRef.current
      const showBokeh = v === 'bokeh' || v === 'full'
      const showRipple = v === 'ripple' || v === 'full'

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      if (showBokeh) {
        for (const patch of bokehRef.current) {
          const dx =
            Math.sin(t * patch.driftFreq * spd + patch.driftPhase) *
            patch.driftAmpX
          const dy =
            Math.cos(t * patch.driftFreq * 0.8 * spd + patch.driftPhase) *
            patch.driftAmpY
          const breath =
            0.6 + 0.4 * Math.sin(t * patch.breathFreq * spd + patch.breathPhase)
          const alpha = patch.baseAlpha * breath * inten
          if (alpha <= 0.003) continue
          ctx.globalAlpha = Math.min(1, Math.max(0, alpha))
          const dw = patch.radius * 2
          const dh = dw * patch.aspect
          ctx.drawImage(
            patch.sprite,
            patch.x + dx - patch.radius,
            patch.y + dy - dh / 2,
            dw,
            dh,
          )
        }
        ctx.globalAlpha = 1
      }

      if (showRipple) {
        for (const ripple of ripplesRef.current) {
          ripple.age += dt * spd
          const splash01 = ripple.age / 0.24
          if (splash01 < 1) {
            const splashAlpha = 0.6 * inten * (1 - splash01)
            ctx.fillStyle = `hsla(225, 32%, 62%, ${splashAlpha})`
            ctx.beginPath()
            ctx.arc(ripple.x, ripple.y, 1.8 * (1 - splash01 * 0.5), 0, TAU)
            ctx.fill()
            const bounce = 8 * Math.sin(Math.PI * splash01)
            ctx.beginPath()
            ctx.arc(ripple.x + splash01 * 3, ripple.y - bounce, 1.1, 0, TAU)
            ctx.fill()
          }
          const ringWidth = 1 + ((ripple.maxRadius - 30) / 40) * 0.5
          const ringCount = ripple.second ? 2 : 1
          for (let ring = 0; ring < ringCount; ring++) {
            const a01 =
              (ripple.age - (ring === 1 ? ripple.secondDelay : 0)) /
              ripple.duration
            if (a01 <= 0 || a01 >= 1) continue
            const eased = 1 - (1 - a01) ** 2
            const radius = ripple.maxRadius * eased
            const alpha =
              0.4 *
              inten *
              Math.min(1, a01 / 0.04) *
              (1 - a01) ** 1.2 *
              (ring === 1 ? 0.5 : 1)
            if (alpha < 0.004) continue
            ctx.strokeStyle = `hsla(225, 28%, 52%, ${alpha})`
            ctx.lineWidth = ringWidth
            ctx.beginPath()
            ctx.ellipse(ripple.x, ripple.y, radius, radius * 0.3, 0, 0, TAU)
            ctx.stroke()
          }
        }
        ripplesRef.current = ripplesRef.current.filter(
          (r) => r.age <= r.duration + (r.second ? r.secondDelay : 0),
        )
      } else if (ripplesRef.current.length > 0) {
        ripplesRef.current = []
      }

      ctx.lineWidth = 1
      for (const streak of rainRef.current) {
        streak.y += streak.vel * spd * dt
        streak.x -= streak.vel * spd * dt * SLANT
        if (
          showRipple &&
          streak.groundY !== null &&
          streak.y >= streak.groundY
        ) {
          if (ripplesRef.current.length < MAX_RIPPLES) {
            ripplesRef.current.push(
              createRippleAt(
                streak.x - streak.len * SLANT * 0.5,
                streak.groundY,
                height,
              ),
            )
            resetStreak(streak, width, height)
            continue
          }
          streak.groundY = null
        }
        if (streak.y - streak.len > height) {
          resetStreak(streak, width, height)
        }
        const headX = streak.x - streak.len * SLANT * 0.5
        const headY = streak.y
        const tailX = headX + streak.len * SLANT
        const tailY = headY - streak.len
        const peak = Math.min(1, 0.28 * inten * streak.alphaScale)
        const gradient = ctx.createLinearGradient(headX, headY, tailX, tailY)
        gradient.addColorStop(0, 'hsla(225, 28%, 52%, 0)')
        gradient.addColorStop(0.65, `hsla(225, 28%, 52%, ${peak})`)
        gradient.addColorStop(1, `hsla(225, 28%, 52%, ${peak * 0.35})`)
        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(headX, headY)
        ctx.lineTo(tailX, tailY)
        ctx.stroke()
      }

      rainAnimationRef.current = requestAnimationFrame(render)
    }

    rainAnimationRef.current = requestAnimationFrame(render)
    return () => {
      if (rainAnimationRef.current !== null)
        cancelAnimationFrame(rainAnimationRef.current)
    }
  }, [])

  const particleCount = useMemo(() => {
    const area = dimensions.width * dimensions.height
    if (!area) return 0
    const densityScale = Math.max(0, density)
    const scaledCount = Math.floor((area / 90000) * densityScale)
    const minCount = Math.floor(8 * densityScale)
    const maxCount = Math.floor(64 * densityScale)
    return Math.max(minCount, Math.min(maxCount, scaledCount))
  }, [density, dimensions.height, dimensions.width])
  const particleCountRef = useRef(particleCount)
  particleCountRef.current = particleCount

  const destroyGpuResources = useCallback((destroyDevice: boolean) => {
    msaaTextureRef.current?.destroy()
    msaaTextureRef.current = null
    msaaTextureSizeRef.current = { width: 0, height: 0 }
    instanceBufferRef.current?.destroy()
    instanceBufferRef.current = null
    quadBufferRef.current?.destroy()
    quadBufferRef.current = null
    uniformBufferRef.current?.destroy()
    uniformBufferRef.current = null
    contextRef.current?.unconfigure?.()
    if (destroyDevice) {
      deviceRef.current?.destroy()
      deviceRef.current = null
    }
    contextRef.current = null
    pipelineRef.current = null
    bindGroupRef.current = null
    formatRef.current = null
    instanceDataRef.current = null
    sampleCountRef.current = 1
  }, [])

  const initWebGPU = useCallback(async () => {
    if (unsupportedRef.current) return false
    const canvas = floretCanvasRef.current
    if (!canvas) return false

    const failWebGPU = (destroyDevice = false) => {
      unsupportedRef.current = true
      setWebgpuAvailable(false)
      destroyGpuResources(destroyDevice)
      return false
    }

    if (!('gpu' in navigator)) {
      return failWebGPU()
    }

    const context = canvas.getContext('webgpu')
    if (!context) {
      return failWebGPU()
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      return failWebGPU()
    }

    const device = await adapter.requestDevice()
    device.onuncapturederror = (event: GPUUncapturedErrorEvent) => {
      console.error('WebGPU error:', event.error)
    }
    const format = navigator.gpu.getPreferredCanvasFormat()

    context.configure({ device, format, alphaMode: 'premultiplied' })

    deviceRef.current = device
    contextRef.current = context
    formatRef.current = format

    const shaderModule = device.createShaderModule({ code: shaderSource })
    if ('getCompilationInfo' in shaderModule) {
      const info = await shaderModule.getCompilationInfo()
      const errors = info.messages.filter(
        (message: GPUCompilationMessage) => message.type === 'error',
      )
      if (errors.length > 0) {
        console.error('WebGPU shader compilation errors:', errors)
        return failWebGPU(true)
      }
    }

    try {
      let pipeline: GPURenderPipeline
      let sampleCount = 4
      const createPipeline = (count: number) =>
        device.createRenderPipeline({
          layout: 'auto',
          vertex: {
            module: shaderModule,
            entryPoint: 'vsMain',
            buffers: [
              {
                arrayStride: 8,
                attributes: [
                  { shaderLocation: 0, offset: 0, format: 'float32x2' },
                ],
              },
              {
                arrayStride: INSTANCE_STRIDE * 4,
                stepMode: 'instance',
                attributes: [
                  { shaderLocation: 1, offset: 0, format: 'float32x2' },
                  { shaderLocation: 2, offset: 8, format: 'float32' },
                  { shaderLocation: 3, offset: 12, format: 'float32' },
                  { shaderLocation: 4, offset: 16, format: 'float32' },
                  { shaderLocation: 5, offset: 20, format: 'float32' },
                  { shaderLocation: 6, offset: 24, format: 'float32' },
                  { shaderLocation: 7, offset: 28, format: 'float32' },
                ],
              },
            ],
          },
          fragment: {
            module: shaderModule,
            entryPoint: 'fsMain',
            targets: [
              {
                format,
                blend: {
                  color: {
                    srcFactor: 'one',
                    dstFactor: 'one-minus-src-alpha',
                    operation: 'add',
                  },
                  alpha: {
                    srcFactor: 'one',
                    dstFactor: 'one-minus-src-alpha',
                    operation: 'add',
                  },
                },
              },
            ],
          },
          primitive: { topology: 'triangle-list' },
          multisample: { count },
        })
      try {
        pipeline = createPipeline(sampleCount)
      } catch {
        sampleCount = 1
        try {
          pipeline = createPipeline(sampleCount)
        } catch (error1x) {
          console.error('WebGPU pipeline creation failed:', error1x)
          return failWebGPU(true)
        }
      }

      const uniformBuffer = device.createBuffer({
        size: UNIFORM_FLOATS * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      })

      const quadBuffer = device.createBuffer({
        size: quadVertices.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      })
      new Float32Array(quadBuffer.getMappedRange()).set(quadVertices)
      quadBuffer.unmap()

      pipelineRef.current = pipeline
      uniformBufferRef.current = uniformBuffer
      bindGroupRef.current = bindGroup
      quadBufferRef.current = quadBuffer
      sampleCountRef.current = sampleCount
      setWebgpuAvailable(true)

      return true
    } catch (error) {
      console.error('WebGPU initialization failed:', error)
      return failWebGPU(true)
    }
  }, [destroyGpuResources])

  const ensureMsaaTexture = useCallback(() => {
    const device = deviceRef.current
    const format = formatRef.current
    const canvas = floretCanvasRef.current
    const sampleCount = sampleCountRef.current
    if (!device || !format || !canvas || sampleCount <= 1) return null

    const { width } = canvas
    const { height } = canvas
    if (
      !msaaTextureRef.current ||
      msaaTextureSizeRef.current.width !== width ||
      msaaTextureSizeRef.current.height !== height
    ) {
      msaaTextureRef.current?.destroy()
      msaaTextureRef.current = device.createTexture({
        size: { width, height },
        sampleCount,
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      msaaTextureSizeRef.current = { width, height }
    }

    return msaaTextureRef.current
  }, [])

  const ensureInstanceResources = useCallback((count: number) => {
    const device = deviceRef.current
    if (!device || count <= 0) return
    const requiredLength = count * INSTANCE_STRIDE

    if (
      !instanceDataRef.current ||
      instanceDataRef.current.length !== requiredLength
    ) {
      instanceDataRef.current = new Float32Array(requiredLength)
      if (instanceBufferRef.current) {
        instanceBufferRef.current.destroy()
      }
      instanceBufferRef.current = device.createBuffer({
        size: instanceDataRef.current.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      })
    }
  }, [])

  const respawn = useCallback(
    (p: Floret, spawnFromTop = true, overrideY?: number) => {
      const w = dimensions.width
      const h = dimensions.height

      p.z = NEAR + Math.random() * (FAR - NEAR)

      const halfW = w / 2
      const halfH = h / 2

      if (typeof overrideY === 'number') {
        p.y = overrideY
      } else {
        p.y = spawnFromTop
          ? -halfH - 40 - Math.random() * 80
          : (Math.random() * 2 - 1) * halfH
      }
      p.x = (Math.random() * 2 - 1) * (halfW + 40)

      const zNorm = (p.z - NEAR) / (FAR - NEAR)

      p.baseSize = 9 + (1 - zNorm) * 6 + Math.random() * 3
      p.opacity = 0.4 + (1 - zNorm) * 0.3 + Math.random() * 0.12

      p.vx = 0
      p.vy = 0

      p.seed = Math.random()
      p.rotation = Math.random() * TAU
      p.angularVelocity = (Math.random() * 2 - 1) * 0.5
      p.tilt = Math.random() * TAU
      p.tiltVelocity = (Math.random() * 2 - 1) * 1.2
    },
    [dimensions.height, dimensions.width],
  )

  const reconcileParticles = useCallback(
    (count: number) => {
      const currentParticles = floretsRef.current
      if (count <= 0) {
        currentParticles.length = 0
        return
      }
      const currentCount = currentParticles.length

      if (currentCount < count) {
        const isInitial = currentCount === 0
        const needed = count - currentCount
        for (let i = 0; i < needed; i++) {
          const p: Floret = {
            x: 0,
            y: 0,
            z: 1,
            vx: 0,
            vy: 0,
            baseSize: 12,
            opacity: 0.6,
            seed: Math.random(),
            rotation: Math.random() * TAU,
            angularVelocity: 0,
            tilt: Math.random() * TAU,
            tiltVelocity: 0,
          }
          if (isInitial) {
            const spreadY = (Math.random() * 2 - 1) * (dimensions.height / 2)
            respawn(p, false, spreadY)
          } else {
            respawn(p, false)
          }
          currentParticles.push(p)
        }
      } else if (currentCount > count) {
        currentParticles.length = count
      }
    },
    [dimensions.height, respawn],
  )

  const updateFlorets = useCallback(
    (dt: number, time: number) => {
      const { speed, intensity } = propsRef.current
      const halfW = dimensions.width / 2
      const halfH = dimensions.height / 2
      const intensityScale = Math.max(0, intensity)

      const windX = Math.sin(time * 0.22) * 5 + Math.sin(time * 0.6) * 2.5

      floretsRef.current.forEach((p) => {
        const zNorm = (p.z - NEAR) / (FAR - NEAR)
        const depthFactor = 1 - zNorm

        const terminalVelocity =
          (13 + depthFactor * 15) * speed * intensityScale

        const flutterFreq = 0.45 + p.seed * 0.35
        const turbScale = 7 + depthFactor * 9
        const turbX =
          (Math.sin(time * flutterFreq + p.seed * 15) * 1.1 +
            Math.cos(time * flutterFreq * 1.7 + p.y * 0.004) * 0.7) *
          turbScale
        const turbY =
          Math.sin(time * flutterFreq * 0.8 + p.seed * 12) * turbScale * 0.12

        p.vx = windX * (0.4 + depthFactor * 0.6) + turbX
        p.vy = terminalVelocity + turbY

        const minFallSpeed = 5 * speed * intensityScale
        if (p.vy < minFallSpeed) p.vy = minFallSpeed

        p.x += p.vx * dt
        p.y += p.vy * dt

        p.rotation += p.angularVelocity * dt
        p.tilt += p.tiltVelocity * dt

        p.angularVelocity +=
          (Math.sin(time * 1.6 + p.seed * 20) * 0.3 - p.angularVelocity * 0.1) *
          dt
        p.tiltVelocity +=
          (Math.cos(time * 1.2 + p.seed * 15) * 0.6 - p.tiltVelocity * 0.1) * dt

        if (p.y > halfH + 40) {
          respawn(p, true)
        }

        if (p.x < -halfW - 40) p.x = halfW + 40
        if (p.x > halfW + 40) p.x = -halfW - 40
      })
    },
    [dimensions.height, dimensions.width, respawn],
  )

  const render = useCallback(
    (time: number) => {
      const device = deviceRef.current
      const context = contextRef.current
      const pipeline = pipelineRef.current
      const uniformBuffer = uniformBufferRef.current
      const bindGroup = bindGroupRef.current
      const quadBuffer = quadBufferRef.current
      const canvas = floretCanvasRef.current

      if (
        !device ||
        !context ||
        !pipeline ||
        !uniformBuffer ||
        !bindGroup ||
        !quadBuffer ||
        !canvas
      ) {
        return
      }

      if (particleCount <= 0) return
      ensureInstanceResources(particleCount)

      const instanceData = instanceDataRef.current
      const instanceBuffer = instanceBufferRef.current
      if (!instanceData || !instanceBuffer) return

      const particles = floretsRef.current
      const drawCount = Math.min(particles.length, particleCount)

      const w = dimensions.width
      const h = dimensions.height
      if (w <= 0 || h <= 0) return
      const { intensity } = propsRef.current
      const halfW = w / 2
      const halfH = h / 2
      const intensityScale = Math.max(0, intensity)

      const nearZ = NEAR - CAMERA_Z
      const farZ = FAR - CAMERA_Z
      const farRange = Math.max(0.001, farZ - FOCUS_Z)

      for (let i = 0; i < drawCount; i += 1) {
        const p = particles[i]
        const viewZ = p.z - CAMERA_Z
        const scale = 1 / viewZ
        const px = p.x * scale + halfW
        const py = p.y * scale + halfH

        const zNorm = (viewZ - nearZ) / (farZ - nearZ)
        const depthFactor = 1 - zNorm

        const perspectiveSize = p.baseSize * scale
        const size = Math.max(5, Math.min(20, perspectiveSize))

        const blur = Math.min(
          1,
          Math.max(0, ((viewZ - FOCUS_Z) / farRange) * APERTURE_SCALE),
        )

        const alpha = p.opacity * (0.85 + depthFactor * 0.15) * intensityScale

        const offset = i * INSTANCE_STRIDE
        instanceData[offset] = px
        instanceData[offset + 1] = py
        instanceData[offset + 2] = size
        instanceData[offset + 3] = Math.min(1, Math.max(0, alpha))
        instanceData[offset + 4] = p.seed
        instanceData[offset + 5] = p.rotation
        instanceData[offset + 6] = blur
        instanceData[offset + 7] = p.tilt
      }

      device.queue.writeBuffer(
        instanceBuffer,
        0,
        instanceData as unknown as GPUAllowSharedBufferSource,
      )

      const uniformData = uniformDataRef.current
      uniformData[0] = w
      uniformData[1] = h
      uniformData[2] = time
      uniformData[3] = 0
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        uniformData as unknown as GPUAllowSharedBufferSource,
      )

      const encoder = device.createCommandEncoder()
      const currentTextureView = context.getCurrentTexture().createView()
      const msaaTexture = ensureMsaaTexture()
      const colorAttachment: GPURenderPassColorAttachment = msaaTexture
        ? {
            view: msaaTexture.createView(),
            resolveTarget: currentTextureView,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }
        : {
            view: currentTextureView,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [colorAttachment],
      })

      renderPass.setPipeline(pipeline)
      renderPass.setBindGroup(0, bindGroup)
      renderPass.setVertexBuffer(0, quadBuffer)
      renderPass.setVertexBuffer(1, instanceBuffer)
      renderPass.draw(6, drawCount)
      renderPass.end()

      device.queue.submit([encoder.finish()])
    },
    [
      dimensions.height,
      dimensions.width,
      ensureMsaaTexture,
      ensureInstanceResources,
      particleCount,
    ],
  )

  renderRef.current = render
  updateFloretsRef.current = updateFlorets

  const animate = useCallback((ts: number) => {
    const last = lastRafTsRef.current
    const dt = last === 0 ? 0 : Math.min(0.05, Math.max(0, (ts - last) / 1000))
    lastRafTsRef.current = ts
    updateFloretsRef.current(dt, ts / 1000)
    renderRef.current(ts / 1000)
    floretAnimationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (variant !== 'petal') {
      if (floretAnimationRef.current) {
        cancelAnimationFrame(floretAnimationRef.current)
        floretAnimationRef.current = null
      }
      destroyGpuResources(true)
      floretsRef.current.length = 0
      return
    }

    let cancelled = false

    const setup = async () => {
      if (unsupportedRef.current) return
      if (!floretCanvasRef.current || dimensions.width === 0) return

      const canvas = floretCanvasRef.current

      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
      const pixelWidth = Math.max(1, Math.round(dimensions.width * dpr))
      const pixelHeight = Math.max(1, Math.round(dimensions.height * dpr))

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
        msaaTextureRef.current?.destroy()
        msaaTextureRef.current = null
        msaaTextureSizeRef.current = { width: 0, height: 0 }
      }

      if (!deviceRef.current) {
        const ok = await initWebGPU()
        if (!ok || cancelled) return
      } else if (deviceRef.current && contextRef.current && formatRef.current) {
        contextRef.current.configure({
          device: deviceRef.current,
          format: formatRef.current,
          alphaMode: 'premultiplied',
        })
      }

      reconcileParticles(particleCountRef.current)
      ensureInstanceResources(particleCountRef.current)

      if (!floretAnimationRef.current) {
        lastRafTsRef.current = 0
        floretAnimationRef.current = requestAnimationFrame(animate)
      }
    }

    void setup()

    return () => {
      cancelled = true
      if (floretAnimationRef.current) {
        cancelAnimationFrame(floretAnimationRef.current)
        floretAnimationRef.current = null
      }
    }
  }, [
    animate,
    destroyGpuResources,
    dimensions.height,
    dimensions.width,
    ensureInstanceResources,
    initWebGPU,
    reconcileParticles,
    variant,
  ])

  useEffect(() => {
    if (!deviceRef.current) return
    reconcileParticles(particleCount)
    ensureInstanceResources(particleCount)
  }, [ensureInstanceResources, particleCount, reconcileParticles])

  useEffect(
    () => () => {
      if (floretAnimationRef.current) {
        cancelAnimationFrame(floretAnimationRef.current)
        floretAnimationRef.current = null
      }
      destroyGpuResources(true)
    },
    [destroyGpuResources],
  )

  return (
    <>
      <canvas
        className="pointer-events-none fixed inset-0 z-0 size-full"
        ref={rainCanvasRef}
      />
      {variant === 'petal' && webgpuAvailable !== false && (
        <canvas
          className="pointer-events-none fixed inset-0 z-0 size-full"
          ref={floretCanvasRef}
        />
      )}
    </>
  )
}

AjisaiBackground.displayName = 'AjisaiBackground'
