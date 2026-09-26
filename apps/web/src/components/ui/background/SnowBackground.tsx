'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { isClientSide } from '~/lib/env'

/**
 * Snow background (WebGPU instanced quads)
 * - CPU: particle physics (gravity + drag + wind + turbulence + respawn)
 * - GPU: procedural snowflake shape + depth-based DOF-like blur
 *
 * Notes:
 * - WebGPU does not support point sprites, so we draw instanced quads.
 * - Uses pseudo-3D: particles have a z depth projected to screen.
 */

const shaderSource = `
struct Uniforms {
  resolutionTime: vec4<f32>,
  armWidthRange: vec2<f32>,
  branchWidthRange: vec2<f32>,
  branchWaveRange: vec2<f32>,
  baseOuterRange: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265;

struct VertexInput {
  @location(0) localPos: vec2<f32>,
  @location(1) instancePos: vec2<f32>,
  @location(2) size: f32,
  @location(3) alpha: f32,
  @location(4) seed: f32,
  @location(5) rotation: f32,
  @location(6) blur: f32,
};

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
  @location(1) alpha: f32,
  @location(2) seed: f32,
  @location(3) rotation: f32,
  @location(4) blur: f32,
};

fn hash11(p: f32) -> f32 {
  var x = fract(p * 0.1031);
  x = x * (x + 33.33);
  x = x * (x + x);
  return fract(x);
}

fn hash21(p: vec2<f32>) -> f32 {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return a + (b - a) * t;
}

fn lerp3(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
  return a + (b - a) * t;
}

fn noise2(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0));
  let d = hash21(i + vec2<f32>(1.0, 1.0));
  return lerp(lerp(a, b, u.x), lerp(c, d, u.x), u.y);
}

fn atan2f(y: f32, x: f32) -> f32 {
  let ax = abs(x);
  let ay = abs(y);
  var angle = atan(ay / max(ax, 1e-6));
  if (x < 0.0) {
    angle = PI - angle;
  }
  if (y < 0.0) {
    angle = -angle;
  }
  return angle;
}

fn rotate(p: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn hexDist(p: vec2<f32>) -> f32 {
  let q = abs(p);
  return max(q.x * 0.8660254 + q.y * 0.5, q.y);
}

fn hexMask(p: vec2<f32>, radius: f32, soft: f32) -> f32 {
  let d = hexDist(p);
  return 1.0 - smoothstep(radius, radius + soft, d);
}

fn snowflakeMask(p: vec2<f32>, seed: f32, blur: f32) -> f32 {
  let k1 = hash11(seed * 11.7 + 1.0);
  let k2 = hash11(seed * 19.3 + 2.0);
  let k3 = hash11(seed * 29.1 + 3.0);
  let k4 = hash11(seed * 41.9 + 4.0);

  let warpNoise = noise2(p * (6.0 + k3 * 4.0) + vec2<f32>(seed * 13.7, seed * 9.2));
  let warp = (warpNoise - 0.5) * 0.12;
  let pWarp = p + p * warp;
  let r = length(pWarp);
  let a = atan2f(pWarp.y, pWarp.x);

  let edgeNoise = noise2(vec2<f32>(a * 3.2, seed * 7.7));
  var baseOuter = lerp(uniforms.baseOuterRange.x, uniforms.baseOuterRange.y, k1);
  baseOuter = baseOuter + (edgeNoise - 0.5) * 0.04;
  baseOuter = clamp(
    baseOuter,
    uniforms.baseOuterRange.x - 0.06,
    uniforms.baseOuterRange.y + 0.06,
  );
  let baseInner = lerp(0.10, 0.18, k2);
  let envelopeSoftness = uniforms.resolutionTime.w;
  let envelope = 1.0 - smoothstep(baseOuter, baseOuter + envelopeSoftness, r);

  let asym = edgeNoise - 0.5;
  let six = abs(cos(3.0 * (a + asym * 0.15) + seed * 0.2));
  var armWidth = lerp(uniforms.armWidthRange.x, uniforms.armWidthRange.y, k2);
  armWidth = clamp(armWidth * (0.85 + asym * 0.4), 0.03, 0.2);
  let arm = smoothstep(1.0 - armWidth, 1.0, six);
  let armFalloff =
    smoothstep(baseInner, baseInner + 0.08, r) *
    (1.0 - smoothstep(baseOuter - 0.02, baseOuter + 0.04, r));
  let armBody = arm * armFalloff;

  var branchWidth = lerp(uniforms.branchWidthRange.x, uniforms.branchWidthRange.y, k3);
  branchWidth = clamp(branchWidth * (0.9 + asym * 0.3), 0.04, 0.22);
  let branchAxis = smoothstep(
    1.0 - branchWidth,
    1.0,
    abs(cos(3.0 * a + 1.5708))
  );
  let branchBand =
    smoothstep(0.18, 0.30, r) *
    (1.0 - smoothstep(baseOuter - 0.10, baseOuter + 0.02, r));
  var branchWave = abs(
    sin(r * (uniforms.branchWaveRange.x + k4 * uniforms.branchWaveRange.y) + seed * 6.0)
  );
  branchWave = smoothstep(0.35, 0.9, branchWave);
  let branchBreak = smoothstep(0.2, 0.85, warpNoise);
  let branches = branchAxis * branchBand * branchWave * branchBreak;

  let coreSize = lerp(0.10, 0.16, k4);
  let core = hexMask(pWarp, coreSize, 0.015);
  let innerCut = 1.0 - hexMask(pWarp, coreSize * 0.45, 0.02);
  let coreAdjusted = core * lerp(0.85, 1.0, innerCut);

  let qa = floor((a + 3.14159) * 18.0);
  let qr = floor(r * 20.0);
  let n = hash11(seed * 17.0 + qa + qr);
  let edge = 1.0 - smoothstep(baseOuter - 0.06, baseOuter + 0.02, r + (n - 0.5) * 0.02);

  let variant = floor(hash11(seed * 9.7 + 5.0) * 3.0);
  var detailed = 0.0;
  if (variant < 0.5) {
    detailed = max(coreAdjusted, armBody * 0.6);
    detailed = max(detailed, branches * 0.35);
  } else if (variant < 1.5) {
    detailed = max(coreAdjusted * 0.6, armBody * 0.9);
    detailed = max(detailed, branches);
  } else {
    let sector =
      smoothstep(0.12, 0.22, r) *
      (1.0 - smoothstep(baseOuter - 0.04, baseOuter + 0.04, r));
    let ribs = smoothstep(0.5, 0.9, six);
    detailed = max(coreAdjusted, sector * (0.55 + 0.45 * ribs));
    detailed = max(detailed, armBody * 0.5);
  }

  detailed = detailed * envelope;
  detailed = detailed * (0.85 + 0.15 * edge);

  let circle = 1.0 - smoothstep(0.16, 0.52, r);

  let blurMix = clamp(blur, 0.0, 1.0);
  return lerp(detailed, circle, blurMix);
}

@vertex
fn vsMain(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let scaled = input.localPos * input.size;
  let pos = input.instancePos + scaled;
  let res = uniforms.resolutionTime.xy;
  let clip = vec2<f32>(
    (pos.x / res.x) * 2.0 - 1.0,
    1.0 - (pos.y / res.y) * 2.0
  );
  out.Position = vec4<f32>(clip, 0.0, 1.0);
  out.localPos = input.localPos;
  out.alpha = input.alpha;
  out.seed = input.seed;
  out.rotation = input.rotation;
  out.blur = input.blur;
  return out;
}

@fragment
fn fsMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var p = input.localPos;
  p = rotate(p, input.rotation);

  let shape = snowflakeMask(p, input.seed, input.blur);

  let r = length(p);
  let soft = 1.0 - smoothstep(0.45 - input.blur * 0.12, 0.55, r);
  let softened = shape * lerp(1.0, soft, 0.7);

  let time = uniforms.resolutionTime.z;
  let twinkle = 0.85 + 0.15 * sin(time * 0.8 + input.seed * 12.0);

  var alpha = input.alpha * softened * twinkle;
  alpha = alpha * (1.0 - input.blur * 0.1);

  let core = 1.0 - smoothstep(0.0, 0.18 + input.blur * 0.08, r);
  let edgeColor = vec3<f32>(0.62, 0.68, 0.78);
  let highlight = vec3<f32>(0.97, 0.985, 1.0);
  let color = lerp3(edgeColor, highlight, core);

  alpha = min(1.0, alpha * 1.35);
  let premul = color * alpha;
  return vec4<f32>(premul, alpha);
}
`

type SnowParticle = {
  // world space around screen center, with a pseudo z depth
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
}

// Default snowflake shape ranges (normalized radius space, passed to WGSL uniforms)
const DEFAULT_ARM_WIDTH_RANGE: [number, number] = [0.06, 0.12] // main arm thickness
const DEFAULT_BRANCH_WIDTH_RANGE: [number, number] = [0.08, 0.14] // side-branch thickness
const DEFAULT_BRANCH_WAVE_RANGE: [number, number] = [8, 6] // branch waviness (frequency base, variation)
const DEFAULT_BASE_OUTER_RANGE: [number, number] = [0.52, 0.62] // outer radius (envelope size)

// Per-instance vertex data layout (float32):
// [x, y, size, alpha, seed, rotation, blur]
const INSTANCE_STRIDE = 7

// Uniform buffer float count.
// WGSL struct uses 12 floats, but we keep 16 for 16-byte alignment / padding safety.
const UNIFORM_FLOATS = 16

// Motion damping (bigger flakes get more drag)
const BASE_DRAG = 0.15
const SIZE_DRAG = 0.55
const DRAG_SCALE = 1.5
// Size-based turbulence variation (smaller flakes sway more).
const SIZE_DISTURBANCE = 0.6

// A unit quad made of 2 triangles, centered at origin (local space)
const quadVertices = new Float32Array([
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
])

export type SnowBackgroundProps = {
  /**
   * Wind speed multiplier.
   * - 0: no wind
   * - 1: default
   */
  windSpeed?: number
  /**
   * Wind direction in degrees.
   * - 0: blow to right
   * - 90: blow to bottom
   * - 180: blow to left
   * - 270: blow to top
   */
  windDirection?: number
  /**
   * Gravity/fall speed multiplier.
   * - 1: default
   */
  speed?: number
  /**
   * Snowfall intensity multiplier.
   * Scales fall speed and opacity.
   * - 1: default
   * - 0: no visible snow
   */
  intensity?: number
  /**
   * Snowflake density multiplier.
   * Scales the number of particles on screen.
   * - 1: default
   * - 0: no snow
   */
  density?: number
  /**
   * Snowflake volume multiplier.
   * Scales base size and drag.
   * - 1: default
   */
  volume?: number
  /**
   * Snowflake weight multiplier.
   * Heavier flakes fall faster and resist wind/turbulence.
   * - 1: default
   */
  weight?: number
  /**
   * Camera Z position (depth offset).
   * Controls the perspective projection.
   * - Default: 0.1
   */
  cameraZ?: number
  /**
   * Focus distance for depth-of-field effect.
   * Particles beyond this distance will be blurred.
   * - Default: 0.78
   */
  focusDistance?: number
  /**
   * Aperture size for depth-of-field blur intensity.
   * Higher values increase blur amount.
   * - Default: 0.6
   */
  aperture?: number
  /**
   * Arm width range for snowflake arms.
   * [min, max] - controls the thickness variation of the main arms.
   * - Default: [0.06, 0.12]
   */
  armWidthRange?: [number, number]
  /**
   * Branch width range for side branches.
   * [min, max] - controls the thickness variation of side branches.
   * - Default: [0.08, 0.14]
   */
  branchWidthRange?: [number, number]
  /**
   * Branch wave parameters for branch pattern.
   * [baseFrequency, frequencyVariation] - controls the wave pattern of branches.
   * - Default: [8.0, 6.0]
   */
  branchWaveRange?: [number, number]
  /**
   * Base outer radius range for snowflake size.
   * [min, max] - controls the overall size variation of snowflakes.
   * - Default: [0.52, 0.62]
   */
  baseOuterRange?: [number, number]
  /**
   * Envelope softness for the outer edge fade.
   * Controls how smoothly the snowflake fades at the edges.
   * - Default: 0.06
   */
  envelopeSoftness?: number
}

export const SnowBackground: FC<SnowBackgroundProps> = ({
  windSpeed = 1,
  windDirection = 0,
  speed = 1,
  intensity = 1,
  density = 1,
  volume = 1,
  weight = 1,
  cameraZ = 0.1,
  focusDistance = 0.78,
  aperture = 0.6,
  armWidthRange = DEFAULT_ARM_WIDTH_RANGE,
  branchWidthRange = DEFAULT_BRANCH_WIDTH_RANGE,
  branchWaveRange = DEFAULT_BRANCH_WAVE_RANGE,
  baseOuterRange = DEFAULT_BASE_OUTER_RANGE,
  envelopeSoftness = 0.06,
}) => {
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
  const unsupportedRef = useRef(false)

  const particlesRef = useRef<SnowParticle[]>([])
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const [dimensions, setDimensions] = useState(() =>
    isClientSide
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  )

  // Density tuning: more pixels => more snow, but keep bounded (scaled by density).
  const particleCount = useMemo(() => {
    const area = dimensions.width * dimensions.height
    if (!area) return 0
    const densityScale = Math.max(0, density)
    const baseCount = area / 12000
    const scaledCount = Math.floor(baseCount * densityScale)
    const minCount = Math.floor(120 * densityScale)
    const maxCount = Math.floor(700 * densityScale)
    return Math.max(minCount, Math.min(maxCount, scaledCount))
  }, [density, dimensions.height, dimensions.width])

  const initWebGPU = useCallback(async () => {
    if (unsupportedRef.current) return false
    const canvas = canvasRef.current
    if (!canvas) return false

    if (!('gpu' in navigator)) {
      console.warn('WebGPU not supported')
      unsupportedRef.current = true
      return false
    }

    const context = canvas.getContext('webgpu')
    if (!context) {
      console.warn('WebGPU context not available')
      unsupportedRef.current = true
      return false
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      console.warn('WebGPU adapter not available')
      unsupportedRef.current = true
      return false
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
        unsupportedRef.current = true
        return false
      }
    }

    let pipeline: GPURenderPipeline
    try {
      pipeline = device.createRenderPipeline({
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
      })
    } catch (error) {
      console.error('WebGPU pipeline creation failed:', error)
      unsupportedRef.current = true
      return false
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

    return true
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
    (p: SnowParticle, spawnFromTop = true, overrideY?: number) => {
      // pseudo world space: origin at center
      const w = dimensions.width
      const h = dimensions.height

      // depth in (near..far), smaller => closer
      const near = 0.35
      const far = 1.8
      p.z = near + Math.random() * (far - near)

      const halfW = w / 2
      const halfH = h / 2

      // spawn slightly above top to allow fall-in
      if (typeof overrideY === 'number') {
        p.y = overrideY
      } else {
        p.y = spawnFromTop
          ? -halfH - 80 - Math.random() * 120
          : (Math.random() * 2 - 1) * halfH
      }
      p.x = (Math.random() * 2 - 1) * (halfW + 60)

      const zNorm = (p.z - near) / (far - near) // 0 near, 1 far

      // closer flakes are bigger and a bit faster
      p.baseSize = 4 + (1 - zNorm) * 12 + Math.random() * 6
      p.opacity = 0.25 + (1 - zNorm) * 0.55 + Math.random() * 0.15

      // physics
      p.vx = 0
      p.vy = 0

      // visuals
      p.seed = Math.random()
      p.rotation = Math.random() * Math.PI * 2
      p.angularVelocity = (Math.random() * 2 - 1) * (0.6 + (1 - zNorm) * 1.2)
    },
    [dimensions.height, dimensions.width],
  )

  const reconcileParticles = useCallback(() => {
    if (particleCount <= 0) return

    const currentParticles = particlesRef.current
    const currentCount = currentParticles.length

    if (currentCount < particleCount) {
      const isInitial = currentCount === 0
      const initialSpawnRange = Math.min(
        1600,
        Math.max(500, dimensions.height * 1.1),
      )
      const initialTop = -dimensions.height / 2 - 80
      // Add more particles
      const needed = particleCount - currentCount
      for (let i = 0; i < needed; i++) {
        const p: SnowParticle = {
          x: 0,
          y: 0,
          z: 1,
          vx: 0,
          vy: 0,
          baseSize: 10,
          opacity: 0.8,
          seed: Math.random(),
          rotation: Math.random() * Math.PI * 2,
          angularVelocity: 0,
        }
        if (isInitial) {
          const offset = Math.random() * (initialSpawnRange + 120)
          respawn(p, true, initialTop - offset)
        } else {
          // Spawn anywhere (spreadY calculated below)
          const spreadY = (Math.random() * 2 - 1) * (dimensions.height / 2)
          respawn(p, false, spreadY)
        }
        currentParticles.push(p)
      }
    } else if (currentCount > particleCount) {
      // Remove excess particles
      currentParticles.length = particleCount
    }
    // If equal, do nothing (keep existing particles)
  }, [dimensions.height, particleCount, respawn])

  useIsomorphicLayoutEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const updateParticles = useCallback(() => {
    const now = Date.now()
    // Cap dt to avoid huge jumps if tab was inactive
    const dt = Math.min(
      0.05,
      Math.max(0.001, (now - lastTimeRef.current) / 1000),
    )
    lastTimeRef.current = now

    const time = now / 1000

    const w = dimensions.width
    const h = dimensions.height
    const halfW = w / 2
    const halfH = h / 2
    const intensityScale = Math.max(0, intensity)
    const volumeScale = Math.max(0, volume)
    const weightScale = Math.max(0, weight)
    const inertiaScale = 1 / Math.max(0.2, weightScale)
    const sizeBase = 4 * volumeScale
    const sizeRange = 18 * Math.max(0.001, volumeScale)

    const near = 0.35
    const far = 1.8

    // Wind direction vector (degrees -> radians)
    const dirRad = (windDirection * 3.1415926) / 180
    const windDirX = Math.cos(dirRad)
    const windDirY = Math.sin(dirRad)

    // Wind Noise:
    // We use a strictly positive magnitude so wind always blows in 'windDirection'.
    // Base: 20, Variation: +0 to +20. Range [20, 40] * speed.
    // Slower oscillation for stability.
    // Reduced noise amplitude to prevent "surging" speed perception.
    // Further reduced: Base 20, Noise +/- 1.5 (approx 7.5% variance).
    const windNoise = Math.sin(time * 0.5) * 1 + Math.sin(time * 1.5) * 0.5
    // Make sure it's always positive magnitude
    const windMag = Math.max(0, 20 + windNoise) * windSpeed

    particlesRef.current.forEach((p) => {
      const zNorm = (p.z - near) / (far - near)
      const depthFactor = 1 - zNorm // 1 close, 0 far

      const scaledSize = p.baseSize * volumeScale
      const sizeNorm = Math.min(
        1,
        Math.max(0, (scaledSize - sizeBase) / sizeRange),
      )
      const sizeDisturbance = 1 + (0.5 - sizeNorm) * SIZE_DISTURBANCE
      const drag = BASE_DRAG + sizeNorm * SIZE_DRAG
      const dragScale = 1 / (1 + drag * DRAG_SCALE)

      // 1. Base Terminal Velocity (Gravity)
      // Far flakes fall slower (parallax effect)
      // Range: 40px/s to 120px/s
      const terminalVelocity =
        (40 + depthFactor * 80) *
        speed *
        intensityScale *
        dragScale *
        weightScale

      // 2. Turbulence (Sway)
      // Randomized per particle and position.
      // We scale turbulence by depth so close flakes move more.
      const turbScale =
        (10 + depthFactor * 15) * dragScale * sizeDisturbance * inertiaScale
      const turbX =
        (Math.sin(time * 0.8 + p.seed * 10) +
          Math.cos(time * 1.3 + p.y * 0.002)) *
        turbScale
      const turbY =
        (Math.sin(time * 1.1 + p.seed * 12) +
          Math.cos(time * 0.9 + p.x * 0.002)) *
        (turbScale * 0.2) // Significantly reduced vertical turbulence

      // 3. Apply Wind (Scaled by depth for parallax)
      const windEffect =
        windMag * (0.6 + depthFactor * 0.8) * dragScale * inertiaScale
      const wx = windEffect * windDirX
      const wy = windEffect * windDirY

      // 4. Resolve Velocities
      p.vx = wx + turbX
      p.vy = terminalVelocity + wy + turbY

      // 5. Anti-Gravity Guard
      // Ensure particles don't completely stop or rise due to turbulence/updrafts
      // unless wind is extremely strong upwards (which is rare).
      // We force a minimum fall speed of 15px/s.
      const minFallSpeed = 15 * speed * intensityScale * dragScale * weightScale
      if (p.vy < minFallSpeed) p.vy = minFallSpeed

      // Integrate
      p.x += p.vx * dt
      p.y += p.vy * dt

      // Rotation
      p.rotation += p.angularVelocity * dt

      // Respawn checks
      // Bottom boundary
      if (p.y > halfH + 100) {
        respawn(p, true)
      }

      // Horizontal wrap
      if (p.x < -halfW - 100) p.x = halfW + 100
      if (p.x > halfW + 100) p.x = -halfW - 100
    })
  }, [
    dimensions.height,
    dimensions.width,
    respawn,
    windDirection,
    intensity,
    windSpeed,
    speed,
    volume,
    weight,
  ])

  const render = useCallback(() => {
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

    const w = canvas.width
    const h = canvas.height
    const halfW = w / 2
    const halfH = h / 2
    const near = 0.35
    const far = 1.8
    const intensityScale = Math.max(0, intensity)
    const volumeScale = Math.max(0, volume)

    // Camera + DOF controls (only blur farther than focus distance).
    const nearZ = near - cameraZ
    const farZ = far - cameraZ
    const focusZ = focusDistance
    const farRange = Math.max(0.001, farZ - focusZ)
    const apertureScale = 0.45 + aperture * 1.35

    for (let i = 0; i < drawCount; i += 1) {
      const p = particles[i]
      const viewZ = p.z - cameraZ
      const scale = 1 / viewZ
      const px = p.x * scale + halfW
      const py = p.y * scale + halfH

      const zNorm = (viewZ - nearZ) / (farZ - nearZ)
      const depthFactor = 1 - zNorm

      const perspectiveSize = p.baseSize * volumeScale * scale
      const size = Math.max(2, Math.min(32, perspectiveSize))

      const blur = Math.min(
        1,
        Math.max(0, ((viewZ - focusZ) / farRange) * apertureScale),
      )

      const alpha = p.opacity * (0.9 + depthFactor * 0.1) * intensityScale

      const offset = i * INSTANCE_STRIDE
      instanceData[offset] = px
      instanceData[offset + 1] = py
      instanceData[offset + 2] = size
      instanceData[offset + 3] = Math.min(1, Math.max(0, alpha))
      instanceData[offset + 4] = p.seed
      instanceData[offset + 5] = p.rotation
      instanceData[offset + 6] = blur
    }

    device.queue.writeBuffer(
      instanceBuffer,
      0,
      instanceData as unknown as GPUAllowSharedBufferSource,
    )

    const uniformData = uniformDataRef.current
    uniformData[0] = w
    uniformData[1] = h
    uniformData[2] = Date.now() / 1000
    uniformData[3] = envelopeSoftness
    uniformData[4] = armWidthRange[0]
    uniformData[5] = armWidthRange[1]
    uniformData[6] = branchWidthRange[0]
    uniformData[7] = branchWidthRange[1]
    uniformData[8] = branchWaveRange[0]
    uniformData[9] = branchWaveRange[1]
    uniformData[10] = baseOuterRange[0]
    uniformData[11] = baseOuterRange[1]
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      uniformData as unknown as GPUAllowSharedBufferSource,
    )

    const encoder = device.createCommandEncoder()
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.setVertexBuffer(0, quadBuffer)
    renderPass.setVertexBuffer(1, instanceBuffer)
    renderPass.draw(6, drawCount)
    renderPass.end()

    device.queue.submit([encoder.finish()])
  }, [
    armWidthRange,
    baseOuterRange,
    branchWidthRange,
    branchWaveRange,
    cameraZ,
    ensureInstanceResources,
    envelopeSoftness,
    focusDistance,
    intensity,
    particleCount,
    aperture,
    volume,
  ])

  const animate = useCallback(() => {
    updateParticles()
    render()
    animationRef.current = requestAnimationFrame(animate)
  }, [render, updateParticles])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      if (unsupportedRef.current) return
      if (!canvasRef.current || dimensions.width === 0) return

      const canvas = canvasRef.current

      if (
        canvas.width !== dimensions.width ||
        canvas.height !== dimensions.height
      ) {
        canvas.width = dimensions.width
        canvas.height = dimensions.height
      }

      if (!deviceRef.current) {
        const ok = await initWebGPU()
        if (!ok || cancelled) return
        lastTimeRef.current = Date.now()
      } else if (deviceRef.current && contextRef.current && formatRef.current) {
        contextRef.current.configure({
          device: deviceRef.current,
          format: formatRef.current,
          alphaMode: 'premultiplied',
        })
      }

      reconcileParticles()
      ensureInstanceResources(particleCount)

      if (!animationRef.current) {
        animate()
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
    particleCount,
    reconcileParticles,
  ])

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}

SnowBackground.displayName = 'SnowBackground'
