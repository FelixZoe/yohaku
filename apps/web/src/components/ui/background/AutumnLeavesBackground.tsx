'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { isClientSide } from '~/lib/env'

/**
 * Autumn Leaves background (WebGPU instanced quads)
 * Features ginkgo leaves (银杏叶) - the iconic golden fan-shaped leaf
 * - CPU: particle physics (gravity + drag + wind + flutter)
 * - GPU: procedural ginkgo leaf shape + golden autumn colors
 */

const shaderSource = `
struct Uniforms {
  resolutionTime: vec4<f32>,
  leafParams: vec4<f32>,
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
  @location(7) tilt: f32,
};

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
  @location(1) alpha: f32,
  @location(2) seed: f32,
  @location(3) rotation: f32,
  @location(4) blur: f32,
  @location(5) tilt: f32,
};

fn hash11(p: f32) -> f32 {
  var x = fract(p * 0.1031);
  x = x * (x + 33.33);
  x = x * (x + x);
  return fract(x);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return a + (b - a) * t;
}

fn lerp3(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
  return a + (b - a) * t;
}

fn rotate(p: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * p.x - s * p.y, s * p.x + c * p.y);
}

// Ginkgo leaf - fan shape like a small hand fan
// Uses a simpler approach: define the shape directly in cartesian coordinates
fn ginkgoLeafMask(p: vec2<f32>, seed: f32, blur: f32) -> f32 {
  let k1 = hash11(seed * 11.7);
  let k2 = hash11(seed * 19.3);
  let k3 = hash11(seed * 31.1);

  // Coordinate system: stem at bottom (y = -0.4), fan spreads upward
  var q = p;

  // The leaf shape:
  // - Stem: thin rectangle at bottom
  // - Fan: spreads out from stem, wider at top

  // Stem parameters
  let stemBottom = -0.42;
  let stemTop = -0.15 - k1 * 0.05;
  let stemWidth = 0.025 + k2 * 0.01;

  // Fan parameters
  let fanBottom = stemTop;
  let fanTop = 0.38 + k3 * 0.05;
  let fanMaxWidth = 0.42 + k1 * 0.06;

  // Check if in stem region
  var mask = 0.0;

  if (q.y < stemTop && q.y > stemBottom) {
    // Stem region - simple rectangle with slight taper
    let stemTaper = smoothstep(stemBottom, stemTop, q.y);
    let currentStemWidth = stemWidth * (0.7 + stemTaper * 0.3);
    let stemDist = abs(q.x) - currentStemWidth;
    mask = 1.0 - smoothstep(-0.01, 0.01 + blur * 0.03, stemDist);
  }

  if (q.y >= stemTop - 0.02) {
    // Fan region
    // Normalized height within fan (0 at bottom, 1 at top)
    let fanHeight = (q.y - fanBottom) / (fanTop - fanBottom);
    let clampedHeight = clamp(fanHeight, 0.0, 1.0);

    // Fan width increases with height (like opening a fan)
    // Use a curve that starts narrow and expands
    let widthCurve = sqrt(clampedHeight) * 0.9 + clampedHeight * 0.1;
    let currentWidth = fanMaxWidth * widthCurve;

    // The fan edge - check if point is within the fan arc
    let xNorm = q.x / max(currentWidth, 0.001);

    // Top edge: rounded arc
    // The top should be curved like an arc, not flat
    let arcRadius = fanTop - fanBottom;
    let arcCenter = fanBottom;

    // Distance from the arc center
    let distFromCenter = length(vec2<f32>(q.x, q.y - arcCenter));

    // For the fan shape, we want:
    // 1. Left/right edges: straight lines angled outward
    // 2. Top edge: curved arc
    // 3. Smooth transition between them

    // Angle from center (stem point)
    let angle = atan2(q.x, q.y - arcCenter + 0.05);
    let maxAngle = PI * (0.42 + k2 * 0.06);

    // Inside the fan angle?
    let angleOk = abs(angle) < maxAngle;

    // Inside the radius?
    let maxDist = arcRadius * (1.0 + 0.05 * sin(angle * (5.0 + k1 * 3.0)));
    let distOk = distFromCenter < maxDist && q.y > fanBottom - 0.02;

    // Wavy top edge
    let waveAmt = sin(angle * (6.0 + k3 * 4.0) + k1 * 6.28) * 0.03 * clampedHeight;
    let adjustedMaxDist = maxDist + waveAmt;

    // Central notch (characteristic of some ginkgo leaves)
    let hasNotch = k1 > 0.35;
    var notchCut = 0.0;
    if (hasNotch) {
      let notchWidth = 0.08 + k2 * 0.05;
      let notchDepth = 0.12 + k3 * 0.08;
      // Notch is a V-shape at the top center
      let notchDist = abs(q.x) / notchWidth;
      let notchY = fanTop - notchDepth * (1.0 - notchDist);
      if (q.y > notchY && abs(q.x) < notchWidth && q.y > fanTop * 0.7) {
        notchCut = smoothstep(notchY - 0.02, notchY + 0.02, q.y) *
                   smoothstep(notchWidth, notchWidth * 0.3, abs(q.x));
      }
    }

    // Compute fan mask
    let edgeSoftness = 0.02 + blur * 0.04;

    // Distance-based mask for smooth edges
    let distFromEdge = adjustedMaxDist - distFromCenter;
    let angleDist = (maxAngle - abs(angle)) * distFromCenter;
    let bottomDist = q.y - (fanBottom - 0.02);

    let distMask = smoothstep(-edgeSoftness, edgeSoftness, distFromEdge);
    let angleMask = smoothstep(-edgeSoftness * 0.5, edgeSoftness, angleDist);
    let bottomMask = smoothstep(-0.01, 0.03, bottomDist);

    var fanMask = distMask * angleMask * bottomMask;

    // Apply notch
    fanMask = fanMask * (1.0 - notchCut * 0.95);

    // Blend stem and fan
    mask = max(mask, fanMask);
  }

  // Add vein pattern
  if (mask > 0.01) {
    let q2 = vec2<f32>(p.x, p.y + 0.15);
    let veinAngle = atan2(q2.x, q2.y);
    let veinR = length(q2);

    // Radiating veins from stem
    let veinCount = 7.0 + k1 * 4.0;
    let veinPattern = abs(sin(veinAngle * veinCount));
    let veinStrength = smoothstep(0.6, 0.95, veinPattern) * 0.12;

    // Veins fade near edges
    let veinFade = smoothstep(0.05, 0.12, veinR) * smoothstep(0.45, 0.25, veinR);

    mask = mask * (1.0 - veinStrength * veinFade * (1.0 - blur * 0.8));
  }

  return mask;
}

@vertex
fn vsMain(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  var localPos = input.localPos;

  // 3D tilt effect - ginkgo leaves flutter and tumble
  let tiltX = cos(input.tilt);
  let tiltY = cos(input.tilt * 0.7 + 0.5);
  localPos.x = localPos.x * max(0.2, abs(tiltX));
  localPos.y = localPos.y * max(0.35, abs(tiltY));

  let scaled = localPos * input.size;
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
  out.tilt = input.tilt;
  return out;
}

@fragment
fn fsMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var p = input.localPos;
  p = rotate(p, input.rotation);

  let shape = ginkgoLeafMask(p, input.seed, input.blur);

  if (shape < 0.01) {
    discard;
  }

  let k = hash11(input.seed * 23.1);
  let k2 = hash11(input.seed * 37.3);
  let k3 = hash11(input.seed * 47.9);

  // Ginkgo golden yellow palette
  let brightGold = vec3<f32>(1.0, 0.88, 0.25);
  let warmYellow = vec3<f32>(0.98, 0.82, 0.18);
  let deepGold = vec3<f32>(0.95, 0.75, 0.15);
  let paleYellow = vec3<f32>(0.98, 0.92, 0.50);
  let orangeGold = vec3<f32>(0.96, 0.72, 0.20);
  let brownTint = vec3<f32>(0.85, 0.65, 0.25);

  // Color variation per leaf
  var baseColor: vec3<f32>;
  if (k < 0.25) {
    // Bright golden
    baseColor = lerp3(brightGold, paleYellow, k / 0.25);
  } else if (k < 0.5) {
    // Warm yellow
    baseColor = lerp3(warmYellow, brightGold, (k - 0.25) / 0.25);
  } else if (k < 0.75) {
    // Deep gold
    baseColor = lerp3(deepGold, orangeGold, (k - 0.5) / 0.25);
  } else {
    // Some with brown edges (older leaves)
    baseColor = lerp3(orangeGold, brownTint, (k - 0.75) / 0.25);
  }

  // Gradient from stem (slightly green/darker) to edge (golden)
  var q = p;
  q.y = q.y + 0.1;
  let r = length(q);
  let heightGrad = smoothstep(-0.3, 0.3, p.y);

  // Stem area slightly darker/greener
  let stemColor = baseColor * 0.85 + vec3<f32>(-0.05, 0.02, -0.02);
  var color = lerp3(stemColor, baseColor, heightGrad);

  // Edge tint - slightly more saturated
  let edgeGrad = smoothstep(0.15, 0.35, r);
  let edgeColor = baseColor * 1.05;
  color = lerp3(color, edgeColor, edgeGrad * 0.3);

  // Central vein area - slightly lighter
  let centralHighlight = 1.0 - smoothstep(0.0, 0.04, abs(p.x));
  let veinBrightness = centralHighlight * smoothstep(-0.2, 0.1, p.y) * 0.1;
  color = color + vec3<f32>(veinBrightness);

  // Subtle variation across the leaf
  let microVar = hash11(input.seed * 100.0 + p.x * 50.0 + p.y * 30.0);
  color = color + (microVar - 0.5) * 0.03;

  // Apply alpha
  var alpha = input.alpha * shape;
  alpha = alpha * (1.0 - input.blur * 0.2);

  // Distant leaves slightly less saturated
  let gray = dot(color, vec3<f32>(0.299, 0.587, 0.114));
  let grayColor = vec3<f32>(gray * 1.1, gray * 1.05, gray * 0.85);
  color = lerp3(color, grayColor, input.blur * 0.25);

  alpha = min(1.0, alpha * 1.1);

  let premul = color * alpha;
  return vec4<f32>(premul, alpha);
}
`

type GinkgoLeaf = {
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
  flutterPhase: number
}

// Per-instance: [x, y, size, alpha, seed, rotation, blur, tilt]
const INSTANCE_STRIDE = 8
const UNIFORM_FLOATS = 16

const BASE_DRAG = 0.15
const SIZE_DRAG = 0.3
const DRAG_SCALE = 1.1

const quadVertices = new Float32Array([
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
])

type AutumnLeavesBackgroundProps = {
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
  /** Flutter intensity - how much leaves wobble */
  flutter?: number
}

export const AutumnLeavesBackground: FC<AutumnLeavesBackgroundProps> = ({
  windSpeed = 1,
  windDirection = 50,
  speed = 1,
  intensity = 1,
  density = 1,
  volume = 1,
  weight = 1,
  cameraZ = 0.1,
  focusDistance = 0.7,
  aperture = 0.45,
  flutter = 1,
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

  const particlesRef = useRef<GinkgoLeaf[]>([])
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const [dimensions, setDimensions] = useState(() =>
    isClientSide
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  )

  const particleCount = useMemo(() => {
    const area = dimensions.width * dimensions.height
    if (!area) return 0
    const densityScale = Math.max(0, density)
    const baseCount = area / 20000
    const scaledCount = Math.floor(baseCount * densityScale)
    const minCount = Math.floor(45 * densityScale)
    const maxCount = Math.floor(280 * densityScale)
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
    (p: GinkgoLeaf, spawnFromTop = true, overrideY?: number) => {
      const w = dimensions.width
      const h = dimensions.height

      const near = 0.38
      const far = 1.45
      p.z = near + Math.random() * (far - near)

      const halfW = w / 2
      const halfH = h / 2

      if (typeof overrideY === 'number') {
        p.y = overrideY
      } else {
        p.y = spawnFromTop
          ? -halfH - 45 - Math.random() * 70
          : (Math.random() * 2 - 1) * halfH
      }
      p.x = (Math.random() * 2 - 1) * (halfW + 55)

      const zNorm = (p.z - near) / (far - near)

      p.baseSize = 14 + (1 - zNorm) * 20 + Math.random() * 10
      p.opacity = 0.5 + (1 - zNorm) * 0.35 + Math.random() * 0.12

      p.vx = 0
      p.vy = 0

      p.seed = Math.random()
      p.rotation = Math.random() * Math.PI * 2
      p.angularVelocity = (Math.random() * 2 - 1) * 0.8
      p.tilt = Math.random() * Math.PI * 2
      p.tiltVelocity = (Math.random() * 2 - 1) * 1.5
      p.flutterPhase = Math.random() * Math.PI * 2
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
        1100,
        Math.max(320, dimensions.height * 0.85),
      )
      const initialTop = -dimensions.height / 2 - 45

      const needed = particleCount - currentCount
      for (let i = 0; i < needed; i++) {
        const p: GinkgoLeaf = {
          x: 0,
          y: 0,
          z: 1,
          vx: 0,
          vy: 0,
          baseSize: 16,
          opacity: 0.7,
          seed: Math.random(),
          rotation: Math.random() * Math.PI * 2,
          angularVelocity: 0,
          tilt: Math.random() * Math.PI * 2,
          tiltVelocity: 0,
          flutterPhase: Math.random() * Math.PI * 2,
        }
        if (isInitial) {
          const offset = Math.random() * (initialSpawnRange + 70)
          respawn(p, true, initialTop - offset)
        } else {
          const spreadY = (Math.random() * 2 - 1) * (dimensions.height / 2)
          respawn(p, false, spreadY)
        }
        currentParticles.push(p)
      }
    } else if (currentCount > particleCount) {
      currentParticles.length = particleCount
    }
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
    const flutterScale = Math.max(0, flutter)

    const near = 0.38
    const far = 1.45

    const dirRad = (windDirection * 3.1415926) / 180
    const windDirX = Math.cos(dirRad)
    const windDirY = Math.sin(dirRad)

    // Gentle autumn breeze with occasional gusts
    const gustCycle = Math.sin(time * 0.2) * 0.5 + 0.5
    const gust = gustCycle * Math.sin(time * 0.8) * 1.5
    const windMag = Math.max(0, 12 + gust * 4) * windSpeed

    particlesRef.current.forEach((p) => {
      const zNorm = (p.z - near) / (far - near)
      const depthFactor = 1 - zNorm

      const scaledSize = p.baseSize * volumeScale
      const sizeNorm = Math.min(1, Math.max(0, (scaledSize - 14) / 30))
      const drag = BASE_DRAG + sizeNorm * SIZE_DRAG
      const dragScale = 1 / (1 + drag * DRAG_SCALE)

      // Ginkgo leaves fall with a gentle flutter
      const terminalVelocity =
        (28 + depthFactor * 55) *
        speed *
        intensityScale *
        dragScale *
        weightScale

      // Flutter motion - side to side wobble
      const flutterFreq = 0.5 + p.seed * 0.3
      const flutterAmp =
        (18 + depthFactor * 22) * dragScale * inertiaScale * flutterScale
      const flutterX =
        Math.sin(time * flutterFreq + p.flutterPhase) * flutterAmp +
        Math.sin(time * flutterFreq * 1.8 + p.seed * 5) * flutterAmp * 0.4

      // Slight vertical flutter
      const flutterY =
        Math.cos(time * flutterFreq * 0.7 + p.flutterPhase) * flutterAmp * 0.15

      const windEffect =
        windMag * (0.45 + depthFactor * 0.55) * dragScale * inertiaScale
      const wx = windEffect * windDirX
      const wy = windEffect * windDirY

      p.vx = wx + flutterX * 0.4
      p.vy = terminalVelocity + wy + flutterY

      // Minimum fall speed
      const minFallSpeed = 10 * speed * intensityScale * dragScale * weightScale
      if (p.vy < minFallSpeed) p.vy = minFallSpeed

      p.x += p.vx * dt
      p.y += p.vy * dt

      // Rotation follows flutter direction somewhat
      const targetAngVel = flutterX * 0.03
      p.angularVelocity += (targetAngVel - p.angularVelocity) * 0.1
      p.rotation += p.angularVelocity * dt

      // Tilt animation - gentle tumbling
      p.tilt += p.tiltVelocity * dt
      p.tiltVelocity +=
        (Math.sin(time * 1.2 + p.seed * 10) * 0.8 - p.tiltVelocity * 0.08) * dt

      // Respawn
      if (p.y > halfH + 60) {
        respawn(p, true)
      }

      if (p.x < -halfW - 60) p.x = halfW + 60
      if (p.x > halfW + 60) p.x = -halfW - 60
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
    flutter,
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
    const near = 0.38
    const far = 1.45
    const intensityScale = Math.max(0, intensity)
    const volumeScale = Math.max(0, volume)

    const nearZ = near - cameraZ
    const farZ = far - cameraZ
    const focusZ = focusDistance
    const farRange = Math.max(0.001, farZ - focusZ)
    const apertureScale = 0.35 + aperture * 1

    for (let i = 0; i < drawCount; i += 1) {
      const p = particles[i]
      const viewZ = p.z - cameraZ
      const scale = 1 / viewZ
      const px = p.x * scale + halfW
      const py = p.y * scale + halfH

      const zNorm = (viewZ - nearZ) / (farZ - nearZ)
      const depthFactor = 1 - zNorm

      const perspectiveSize = p.baseSize * volumeScale * scale
      const size = Math.max(8, Math.min(50, perspectiveSize))

      const blur = Math.min(
        1,
        Math.max(0, ((viewZ - focusZ) / farRange) * apertureScale),
      )

      const alpha = p.opacity * (0.82 + depthFactor * 0.18) * intensityScale

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
    uniformData[2] = Date.now() / 1000
    uniformData[3] = 0
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
    cameraZ,
    ensureInstanceResources,
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

AutumnLeavesBackground.displayName = 'AutumnLeavesBackground'
