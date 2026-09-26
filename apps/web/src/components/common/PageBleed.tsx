'use client'

import type { FC } from 'react'
import { useEffect, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'

import { RootPortal } from '../ui/portal'

const VERTEX = `#version 300 es
in vec2 aP;
void main(){ gl_Position = vec4(aP, 0.0, 1.0); }
`

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec2 uAlpha;

float hash(float n){ return fract(sin(n) * 43758.5453); }

float lineAA(float d, float w){
  float aa = fwidth(d) * 1.2;
  return 1.0 - smoothstep(w - aa, w + aa, d);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;

  vec2 att = vec2(0.5 + 0.30 * sin(uTime * 0.045 + uSeed * 6.2831), 0.30);
  vec3 col = vec3(0.0);
  float a = 0.0;

  for (int i = 0; i < 6; i++) {
    float base = 0.10 + float(i) * 0.135;
    float dx = uv.x - att.x;
    float dy = base - att.y;
    float pull = 0.115 * exp(-dx * dx * 11.0) / (1.0 + dy * dy * 26.0);

    float h = hash(uSeed * 12.9898 + float(i) * 78.233);
    float p = clamp((uTime - (0.10 + h * 0.42)) / (1.05 + fract(h * 7.3) * 0.8), 0.0, 1.0);
    float head = (1.0 - pow(1.0 - p, 3.0)) * 1.06;
    float nib = 1.0 + 0.9 * exp(-pow((uv.x - head) / 0.045, 2.0)) * (1.0 - step(1.0, p));
    float drawn = smoothstep(head, head - 0.055, uv.x) * nib;

    float m = lineAA(abs(uv.y - (base - pull)), 0.0032);
    bool key = i == 2;
    float alpha = m * drawn * (1.0 - base * 0.5) * (key ? uAlpha.y : uAlpha.x);
    col = mix(col, key ? uAccent : uInk, alpha > 0.0 ? alpha / max(a + alpha, 1e-4) : 0.0);
    a = a + alpha - a * alpha;
  }

  fragColor = vec4(col, a * smoothstep(1.0, 0.32, uv.y));
}
`

const OVERPRINT_FRAGMENT = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform vec3 uAccent;
uniform vec2 uPlateAlpha;

float edgeY(float x, float t, float seed, float base){
  return base
    + 0.085 * sin(x * 2.0 + seed * 6.2831 + t * 0.050)
    + 0.045 * sin(x * 3.6 - seed * 3.0000 - t * 0.037)
    + 0.022 * sin(x * 6.4 + t * 0.029);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;

  float soft = 0.16;
  float e1 = edgeY(uv.x, uTime, uSeed, 0.54);
  float e2 = edgeY(uv.x + 0.06, uTime, uSeed + 0.37, 0.46);

  float a = (1.0 - smoothstep(e1 - soft, e1 + soft, uv.y)) * uPlateAlpha.x;
  float b = (1.0 - smoothstep(e2 - soft, e2 + soft, uv.y)) * uPlateAlpha.y;

  fragColor = vec4(uAccent, a + b - a * b);
}
`

const hslToRgb = (
  h: number,
  s: number,
  l: number,
): [number, number, number] => {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

/** `--color-accent` 是每篇文章注入的 oklch()，交给 2d canvas 去转 sRGB */
const readColor = (
  name: string,
  fallback: [number, number, number],
): [number, number, number] => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  if (!raw) return fallback
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return fallback
  ctx.fillStyle = '#000'
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  return shader
}

export const PageBleed: FC<{ hue: number; seed?: number }> = ({
  hue,
  seed = 0.5,
}) => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!canvas) return
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    })
    if (!gl) return

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(
      program,
      compile(gl, gl.FRAGMENT_SHADER, isMobile ? OVERPRINT_FRAGMENT : FRAGMENT),
    )
    gl.bindAttribLocation(program, 0, 'aP')
    gl.linkProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(program)

    const u = {
      res: gl.getUniformLocation(program, 'uRes'),
      time: gl.getUniformLocation(program, 'uTime'),
      seed: gl.getUniformLocation(program, 'uSeed'),
      ink: gl.getUniformLocation(program, 'uInk'),
      accent: gl.getUniformLocation(program, 'uAccent'),
      alpha: gl.getUniformLocation(program, 'uAlpha'),
      plateAlpha: gl.getUniformLocation(program, 'uPlateAlpha'),
    }

    const isDark = () =>
      document.documentElement.dataset.theme === 'dark' ||
      document.documentElement.classList.contains('dark')

    let ink: [number, number, number] = [0, 0, 0]
    let accent: [number, number, number] = [0, 0, 0]
    const alpha: [number, number] = [0.45, 0.66]
    let plateAlpha: [number, number] = [0.15, 0.09]

    const syncAccent = () => {
      const dark = isDark()
      accent = readColor(
        '--color-accent',
        hslToRgb(hue, 0.42, dark ? 0.64 : 0.48),
      )
      plateAlpha = dark ? [0.13, 0.08] : [0.15, 0.09]
      ink = readColor(
        '--color-neutral-6',
        dark ? [0.66, 0.66, 0.66] : [0.47, 0.46, 0.44],
      )
    }
    syncAccent()

    const themeObserver = new MutationObserver(syncAccent)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let visible = true
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
      },
      { rootMargin: '80px' },
    )
    io.observe(canvas)

    let raf = 0
    let start = 0
    const render = (ms: number) => {
      raf = requestAnimationFrame(render)
      if (!visible || document.hidden) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(u.res, canvas.width, canvas.height)
      if (!start) start = ms
      gl.uniform1f(u.time, reduceMotion.matches ? 12 : (ms - start) / 1000)
      gl.uniform1f(u.seed, seed)
      gl.uniform3fv(u.ink, ink)
      gl.uniform3fv(u.accent, accent)
      gl.uniform2fv(u.alpha, alpha)
      gl.uniform2fv(u.plateAlpha, plateAlpha)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      themeObserver.disconnect()
    }
  }, [canvas, hue, seed, isMobile])

  return (
    <RootPortal>
      <div aria-hidden className="page-bleed">
        <canvas className="size-full" ref={setCanvas} />
      </div>
    </RootPortal>
  )
}
