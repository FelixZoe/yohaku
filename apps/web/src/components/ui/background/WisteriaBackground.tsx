'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'
import { isClientSide } from '~/lib/env'

import { shaderSource } from './WisteriaBackground.shader'

type WisteriaParticle = {
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

const INSTANCE_STRIDE = 8
const UNIFORM_FLOATS = 16

const BASE_DRAG = 0.2
const SIZE_DRAG = 0.4
const DRAG_SCALE = 1.2
const SIZE_DISTURBANCE = 0.9

const quadVertices = new Float32Array([
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
])

export type WisteriaBackgroundProps = {
  windSpeed?: number
  windDirection?: number
  speed?: number
  intensity?: number
  density?: number
  volume?: number
  weight?: number
  cameraZ?: number
  focusDistance?: number
  aperture?: number
  petalLength?: number
  petalWidth?: number
  taper?: number
  flutter?: number
}

type WisteriaRuntimeProps = {
  windSpeed: number
  windDirection: number
  speed: number
  intensity: number
  volume: number
  weight: number
  cameraZ: number
  focusDistance: number
  aperture: number
  petalLength: number
  petalWidth: number
  taper: number
  flutter: number
}

export const WisteriaBackground: FC<WisteriaBackgroundProps> = ({
  windSpeed = 1,
  windDirection = 30,
  speed = 1,
  intensity = 1,
  density = 1,
  volume = 1,
  weight = 1,
  cameraZ = 0.1,
  focusDistance = 0.75,
  aperture = 0.5,
  petalLength = 0.5,
  petalWidth = 0.22,
  taper = 0.6,
  flutter = 1.2,
}) => {
  const isDark = useIsDark()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const canvasRef = useRef<HTMLCanvasElement>(null)
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
  const updateParticlesRef = useRef<(dt: number, time: number) => void>(
    (_dt: number, _time: number) => {},
  )

  const particlesRef = useRef<WisteriaParticle[]>([])
  const animationRef = useRef<number | null>(null)
  const lastRafTsRef = useRef<number>(0)
  const propsRef = useRef<WisteriaRuntimeProps>({
    windSpeed,
    windDirection,
    speed,
    intensity,
    volume,
    weight,
    cameraZ,
    focusDistance,
    aperture,
    petalLength,
    petalWidth,
    taper,
    flutter,
  })

  const [dimensions, setDimensions] = useState(() =>
    isClientSide
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  )
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null)

  propsRef.current = {
    windSpeed,
    windDirection,
    speed,
    intensity,
    volume,
    weight,
    cameraZ,
    focusDistance,
    aperture,
    petalLength,
    petalWidth,
    taper,
    flutter,
  }

  const particleCount = useMemo(() => {
    const area = dimensions.width * dimensions.height
    if (!area) return 0
    const densityScale = Math.max(0, density)
    const baseCount = area / 20000
    const scaledCount = Math.floor(baseCount * densityScale)
    const minCount = Math.floor(50 * densityScale)
    const maxCount = Math.floor(340 * densityScale)
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
    const canvas = canvasRef.current
    if (!canvas) return false

    const failWebGPU = (destroyDevice = false) => {
      unsupportedRef.current = true
      setWebgpuAvailable(false)
      destroyGpuResources(destroyDevice)
      return false
    }

    if (!('gpu' in navigator)) {
      console.warn('WebGPU not supported')
      return failWebGPU()
    }

    const context = canvas.getContext('webgpu')
    if (!context) {
      console.warn('WebGPU context not available')
      return failWebGPU()
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      console.warn('WebGPU adapter not available')
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
      } catch (error4x) {
        console.warn(
          'WebGPU 4x MSAA pipeline creation failed, falling back to 1x:',
          error4x,
        )
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
    const canvas = canvasRef.current
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
    (p: WisteriaParticle, spawnFromTop = true, overrideY?: number) => {
      const w = dimensions.width
      const h = dimensions.height

      const near = 0.35
      const far = 1.6
      p.z = near + Math.random() * (far - near)

      const halfW = w / 2
      const halfH = h / 2

      if (typeof overrideY === 'number') {
        p.y = overrideY
      } else {
        p.y = spawnFromTop
          ? -halfH - 60 - Math.random() * 100
          : (Math.random() * 2 - 1) * halfH
      }
      p.x = (Math.random() * 2 - 1) * (halfW + 80)

      const zNorm = (p.z - near) / (far - near)

      p.baseSize = 7 + (1 - zNorm) * 16 + Math.random() * 9
      p.opacity = 0.32 + (1 - zNorm) * 0.45 + Math.random() * 0.15

      p.vx = 0
      p.vy = 0

      p.seed = Math.random()
      p.rotation = Math.random() * Math.PI * 2
      p.angularVelocity = (Math.random() * 2 - 1) * (0.9 + (1 - zNorm) * 1)
      p.tilt = Math.random() * Math.PI * 2
      p.tiltVelocity = (Math.random() * 2 - 1) * 1.7
    },
    [dimensions.height, dimensions.width],
  )

  const reconcileParticles = useCallback(
    (count: number) => {
      const currentParticles = particlesRef.current
      if (count <= 0) {
        currentParticles.length = 0
        return
      }
      const currentCount = currentParticles.length

      if (currentCount < count) {
        const isInitial = currentCount === 0
        const initialSpawnRange = Math.min(
          1400,
          Math.max(400, dimensions.height * 1),
        )
        const initialTop = -dimensions.height / 2 - 60

        const needed = count - currentCount
        for (let i = 0; i < needed; i++) {
          const p: WisteriaParticle = {
            x: 0,
            y: 0,
            z: 1,
            vx: 0,
            vy: 0,
            baseSize: 13,
            opacity: 0.7,
            seed: Math.random(),
            rotation: Math.random() * Math.PI * 2,
            angularVelocity: 0,
            tilt: Math.random() * Math.PI * 2,
            tiltVelocity: 0,
          }
          if (isInitial) {
            const offset = Math.random() * (initialSpawnRange + 100)
            respawn(p, true, initialTop - offset)
          } else {
            const spreadY = (Math.random() * 2 - 1) * (dimensions.height / 2)
            respawn(p, false, spreadY)
          }
          currentParticles.push(p)
        }
      } else if (currentCount > count) {
        currentParticles.length = count
      }
    },
    [dimensions.height, respawn],
  )

  useIsomorphicLayoutEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const updateParticles = useCallback(
    (dt: number, time: number) => {
      const {
        windSpeed,
        windDirection,
        speed,
        intensity,
        volume,
        weight,
        flutter,
      } = propsRef.current
      const w = dimensions.width
      const h = dimensions.height
      const halfW = w / 2
      const halfH = h / 2
      const intensityScale = Math.max(0, intensity)
      const volumeScale = Math.max(0, volume)
      const weightScale = Math.max(0, weight)
      const inertiaScale = 1 / Math.max(0.2, weightScale)
      const flutterScale = Math.max(0, flutter)
      const sizeBase = 7 * volumeScale
      const sizeRange = 25 * Math.max(0.001, volumeScale)

      const near = 0.35
      const far = 1.6

      const dirRad = (windDirection * 3.1415926) / 180
      const windDirX = Math.cos(dirRad)
      const windDirY = Math.sin(dirRad)

      const windNoise =
        Math.sin(time * 0.3) * 1.6 +
        Math.sin(time * 0.8) * 0.9 +
        Math.sin(time * 1.5) * 0.4
      const windMag = Math.max(0, 14 + windNoise) * windSpeed

      particlesRef.current.forEach((p) => {
        const zNorm = (p.z - near) / (far - near)
        const depthFactor = 1 - zNorm

        const scaledSize = p.baseSize * volumeScale
        const sizeNorm = Math.min(
          1,
          Math.max(0, (scaledSize - sizeBase) / sizeRange),
        )
        const sizeDisturbance = 1 + (0.5 - sizeNorm) * SIZE_DISTURBANCE
        const drag = BASE_DRAG + sizeNorm * SIZE_DRAG
        const dragScale = 1 / (1 + drag * DRAG_SCALE)

        const terminalVelocity =
          (22 + depthFactor * 46) *
          speed *
          intensityScale *
          dragScale *
          weightScale

        const flutterFreq = 0.65 + p.seed * 0.45
        const turbScale =
          (17 + depthFactor * 22) *
          dragScale *
          sizeDisturbance *
          inertiaScale *
          flutterScale
        const turbX =
          (Math.sin(time * flutterFreq + p.seed * 15) * 1.3 +
            Math.cos(time * flutterFreq * 1.7 + p.y * 0.003) * 0.9 +
            Math.sin(time * flutterFreq * 0.5 + p.seed * 8) * 0.55) *
          turbScale
        const turbY =
          (Math.sin(time * flutterFreq * 0.8 + p.seed * 12) +
            Math.cos(time * flutterFreq * 0.6 + p.x * 0.002)) *
          (turbScale * 0.15)

        const windEffect =
          windMag * (0.5 + depthFactor * 0.7) * dragScale * inertiaScale
        const wx = windEffect * windDirX
        const wy = windEffect * windDirY

        p.vx = wx + turbX
        p.vy = terminalVelocity + wy + turbY

        const minFallSpeed =
          7 * speed * intensityScale * dragScale * weightScale
        if (p.vy < minFallSpeed) p.vy = minFallSpeed

        p.x += p.vx * dt
        p.y += p.vy * dt

        p.rotation += p.angularVelocity * dt
        p.tilt += p.tiltVelocity * dt

        p.angularVelocity +=
          (Math.sin(time * 2 + p.seed * 20) * 0.55 - p.angularVelocity * 0.1) *
          dt
        p.tiltVelocity +=
          (Math.cos(time * 1.5 + p.seed * 15) * 0.9 - p.tiltVelocity * 0.1) * dt

        if (p.y > halfH + 80) {
          respawn(p, true)
        }

        if (p.x < -halfW - 80) p.x = halfW + 80
        if (p.x > halfW + 80) p.x = -halfW - 80
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
      const canvas = canvasRef.current

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

      const particles = particlesRef.current
      const drawCount = Math.min(particles.length, particleCount)

      const w = dimensions.width
      const h = dimensions.height
      if (w <= 0 || h <= 0) return
      const {
        intensity,
        volume,
        cameraZ,
        focusDistance,
        aperture,
        petalLength,
        petalWidth,
        taper,
      } = propsRef.current
      const halfW = w / 2
      const halfH = h / 2
      const near = 0.35
      const far = 1.6
      const intensityScale = Math.max(0, intensity)
      const volumeScale = Math.max(0, volume)

      const nearZ = near - cameraZ
      const farZ = far - cameraZ
      const focusZ = focusDistance
      const farRange = Math.max(0.001, farZ - focusZ)
      const apertureScale = 0.4 + aperture * 1.2

      for (let i = 0; i < drawCount; i += 1) {
        const p = particles[i]
        const viewZ = p.z - cameraZ
        const scale = 1 / viewZ
        const px = p.x * scale + halfW
        const py = p.y * scale + halfH

        const zNorm = (viewZ - nearZ) / (farZ - nearZ)
        const depthFactor = 1 - zNorm

        const perspectiveSize = p.baseSize * volumeScale * scale
        const size = Math.max(4, Math.min(40, perspectiveSize))

        const blur = Math.min(
          1,
          Math.max(0, ((viewZ - focusZ) / farRange) * apertureScale),
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
      uniformData[4] = petalLength
      uniformData[5] = petalWidth
      uniformData[6] = taper
      uniformData[7] = 0
      uniformData[8] = isDarkRef.current ? 1 : 0
      uniformData[9] = 0
      uniformData[10] = 0
      uniformData[11] = 0
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
  updateParticlesRef.current = updateParticles

  const animate = useCallback((ts: number) => {
    const last = lastRafTsRef.current
    const dt = last === 0 ? 0 : Math.min(0.05, Math.max(0, (ts - last) / 1000))
    lastRafTsRef.current = ts
    updateParticlesRef.current(dt, ts / 1000)
    renderRef.current(ts / 1000)
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      if (unsupportedRef.current) return
      if (!canvasRef.current || dimensions.width === 0) return

      const canvas = canvasRef.current

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

      if (!animationRef.current) {
        lastRafTsRef.current = 0
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    void setup()

    return () => {
      cancelled = true
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [
    animate,
    dimensions.height,
    dimensions.width,
    ensureInstanceResources,
    initWebGPU,
    reconcileParticles,
  ])

  useEffect(() => {
    if (!deviceRef.current) return
    reconcileParticles(particleCount)
    ensureInstanceResources(particleCount)
  }, [ensureInstanceResources, particleCount, reconcileParticles])

  useEffect(
    () => () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      destroyGpuResources(true)
    },
    [destroyGpuResources],
  )

  if (webgpuAvailable === false) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(180,150,220,0.30),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(110,80,170,0.18),_transparent_60%)]"
      />
    )
  }

  return (
    <canvas
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}

WisteriaBackground.displayName = 'WisteriaBackground'
