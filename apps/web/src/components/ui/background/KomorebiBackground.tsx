'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { isClientSide } from '~/lib/env'

export type KomorebiBackgroundProps = {
  spotCount?: number
  driftSpeed?: number
  pulseSpeed?: number
  intensity?: number
  warmth?: number
  sizeScale?: number
}

const VERTEX_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SOURCE = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_driftTime;
uniform float u_pulseTime;
uniform float u_gust;
uniform float u_intensity;
uniform float u_warmth;
uniform float u_density;
uniform float u_cellSize;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

// each octave drifts at its own velocity for canopy parallax
float fbm(vec2 p, float t) {
  float v = 0.5 * vnoise(p + vec2(t * 0.030, t * 0.018));
  p *= 2.03;
  v += 0.3 * vnoise(p + vec2(-t * 0.052, t * 0.034));
  p *= 1.97;
  v += 0.2 * vnoise(p + vec2(t * 0.071, -t * 0.046));
  return v;
}

vec3 hsl2rgb(vec3 hsl) {
  vec3 rgb = clamp(abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return hsl.z + hsl.y * (rgb - 0.5) * (1.0 - abs(2.0 * hsl.z - 1.0));
}

void main() {
  vec2 p = gl_FragCoord.xy / u_cellSize;
  p *= sqrt(clamp(u_density, 0.1, 4.0));
  p.x += u_gust * 0.3 * sin(u_pulseTime * 0.5 + p.y * 1.4);

  float t = u_driftTime;
  vec2 q = vec2(fbm(p, t), fbm(p + vec2(4.7, 9.2), t));
  float n = fbm(p + (q - 0.5) * 2.6, t * 0.7);

  float thr = mix(0.70, 0.56, clamp(u_density * 0.5, 0.0, 1.0));
  thr += 0.025 * sin(u_pulseTime * 0.35 + n * 3.0);
  // gust flicker: jitter the iso-threshold along field contours so patches twinkle
  thr -= u_gust * 0.045 * sin(u_pulseTime * 7.0 + n * 43.0);

  float halo = smoothstep(thr - 0.18, thr + 0.10, n);
  float core = smoothstep(thr + 0.06, thr + 0.16, n);

  vec2 screen = gl_FragCoord.xy / u_resolution;
  vec2 edge = smoothstep(0.0, 0.16, screen) * smoothstep(1.0, 0.84, screen);
  float vignette = edge.x * edge.y;

  float hue = 44.0 + 8.0 * (u_warmth - 1.0) + (q.x - 0.5) * 14.0 * u_warmth;
  float sat = clamp(0.60 * u_warmth, 0.0, 1.0);
  vec3 haloColor = hsl2rgb(vec3(hue / 360.0, sat, 0.90));
  vec3 coreColor = hsl2rgb(vec3(hue / 360.0, sat * 0.75, 0.96));

  float haloAlpha = halo * 0.085 * u_intensity * vignette;
  float coreAlpha = core * 0.27 * u_intensity * vignette;
  gl_FragColor = vec4(haloColor * haloAlpha + coreColor * coreAlpha, haloAlpha + coreAlpha);
}
`

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export const KomorebiBackground: FC<KomorebiBackgroundProps> = ({
  spotCount = 14,
  driftSpeed = 1,
  pulseSpeed = 1,
  intensity = 1,
  warmth = 1,
  sizeScale = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const animationRef = useRef<number | null>(null)

  const propsRef = useRef({
    spotCount,
    driftSpeed,
    pulseSpeed,
    intensity,
    warmth,
    sizeScale,
  })
  propsRef.current = {
    spotCount,
    driftSpeed,
    pulseSpeed,
    intensity,
    warmth,
    sizeScale,
  }

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

    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    }
    const gl = (canvas.getContext('webgl2', contextOptions) ||
      canvas.getContext(
        'webgl',
        contextOptions,
      )) as WebGLRenderingContext | null
    if (!gl) return

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SOURCE,
    )
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const loc = (name: string) => gl.getUniformLocation(program, name)
    const resolutionLocation = loc('u_resolution')
    const driftTimeLocation = loc('u_driftTime')
    const pulseTimeLocation = loc('u_pulseTime')
    const gustLocation = loc('u_gust')
    const intensityLocation = loc('u_intensity')
    const warmthLocation = loc('u_warmth')
    const densityLocation = loc('u_density')
    const cellSizeLocation = loc('u_cellSize')

    let driftTime = 0
    let pulseTime = 0
    let gustClock = 0
    let gustSmooth = 0
    let lastNow = performance.now()

    const render = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.1)
      lastNow = now
      const {
        spotCount: count,
        driftSpeed: drift,
        pulseSpeed: pulse,
        intensity: inten,
        warmth: warm,
        sizeScale: scale,
      } = propsRef.current

      gustClock += dt
      const swell =
        0.5 +
        (Math.sin(gustClock * 0.4) +
          Math.sin(gustClock * 0.16 + 2) +
          Math.sin(gustClock * 0.07 + 5)) /
          6
      const gustTarget = swell ** 3
      gustSmooth += (gustTarget - gustSmooth) * Math.min(1, dt * 1.2)

      driftTime += dt * drift * (1 + 1.5 * gustSmooth)
      pulseTime += dt * pulse

      const { width, height, dpr } = sizeRef.current
      const pixelWidth = Math.floor(width * dpr)
      const pixelHeight = Math.floor(height * dpr)

      gl.viewport(0, 0, pixelWidth, pixelHeight)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.uniform2f(resolutionLocation, pixelWidth, pixelHeight)
      gl.uniform1f(driftTimeLocation, driftTime)
      gl.uniform1f(pulseTimeLocation, pulseTime)
      gl.uniform1f(gustLocation, gustSmooth)
      gl.uniform1f(intensityLocation, inten)
      gl.uniform1f(warmthLocation, warm)
      gl.uniform1f(densityLocation, count / 14)
      gl.uniform1f(cellSizeLocation, 300 * scale * dpr)

      gl.drawArrays(gl.TRIANGLES, 0, 3)
      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    return () => {
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}
