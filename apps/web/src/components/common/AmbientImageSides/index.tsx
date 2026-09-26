'use client'

import { useReducedMotion } from 'motion/react'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { useIsClient } from '~/hooks/common/use-is-client'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { jotaiStore } from '~/lib/store'
import { useLexicalImageList } from '~/providers/article/LexicalImageRecordProvider'
import { pageScrollLocationAtom } from '~/providers/root/page-scroll-info-provider'

import { inkPairOf } from './colors'
import type { AmbientOptions } from './constants'
import {
  AMBIENT_DEFAULTS,
  AMBIENT_SCOPE_CLASS,
  AMBIENT_VELOCITY,
} from './constants'
import type { Lab, Rgb } from './oklab'
import { labToRgb, rgbToLab } from './oklab'
import { AMBIENT_FRAGMENT_SHADER, AMBIENT_VERTEX_SHADER } from './shader'

export interface AmbientDebug {
  alpha: number
  envelope: number
  gate: number
  velocity: number
}

const FADE_IN_MS = 700

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const decay = (dt: number, tau: number) => 1 - Math.exp(-dt / Math.max(tau, 1))

/**
 * 不同图片取到的主色在感知强度上差异极大（深绿 vs 浅天蓝）。HSL 的 S/L 都不是
 * 感知量，按它归一化仍然一张重一张轻。这里在 OKLab 里把明度与彩度钉成常量，
 * 只让色相跟着图片走，强度才在所有配图之间一致。原图本就接近无彩时按比例
 * 衰减，灰调照片不会被硬塞进一个色相。
 */
const GRAY_CUTOFF = 0.04

const shapeTint = (rgb: Rgb, chroma: number, light: number): Rgb => {
  const [, a, b] = rgbToLab(rgb)
  const c = Math.hypot(a, b)
  if (c < 1e-4) return labToRgb([light, 0, 0])
  const hue = Math.atan2(b, a)
  const target = chroma * Math.min(1, c / GRAY_CUTOFF)
  return labToRgb([light, Math.cos(hue) * target, Math.sin(hue) * target])
}

export const AmbientImageSides: FC<{
  onDebug?: (debug: AmbientDebug) => void
  options?: Partial<AmbientOptions>
}> = ({ options, onDebug }) => {
  const images = useLexicalImageList()
  const isMobile = useIsMobile()
  const isDark = useIsDark()
  const isClient = useIsClient()
  const reduceMotion = useReducedMotion()

  const anchorRef = useRef<HTMLSpanElement>(null)
  const optionsRef = useRef(options)
  const debugRef = useRef(onDebug)
  const isDarkRef = useRef(isDark)
  const kickRef = useRef<(() => void) | null>(null)
  optionsRef.current = options
  debugRef.current = onDebug
  isDarkRef.current = isDark

  const enabled = isClient && !isMobile && !reduceMotion && images.length > 0

  useEffect(() => {
    if (!enabled) return
    const scope = anchorRef.current?.closest<HTMLElement>(
      `.${AMBIENT_SCOPE_CLASS}`,
    )
    if (!scope) return

    const canvas = document.createElement('canvas')
    canvas.className = 'pointer-events-none fixed inset-0 -z-10 size-full'
    canvas.setAttribute('aria-hidden', 'true')
    canvas.dataset.hidePrint = 'true'
    document.body.append(canvas)

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    })
    if (!gl) {
      canvas.remove()
      return
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, AMBIENT_VERTEX_SHADER))
    gl.attachShader(
      program,
      compile(gl.FRAGMENT_SHADER, AMBIENT_FRAGMENT_SHADER),
    )
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.remove()
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
    const aP = gl.getAttribLocation(program, 'aP')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uRes = u('uRes')
    const uColor = u('uColor')
    const uAlpha = u('uAlpha')
    const uDepth = u('uDepth')
    const uCell = u('uCell')
    const uSolid = u('uSolid')
    const uExponent = u('uExponent')
    const uDensity = u('uDensity')

    const resolved: AmbientOptions = { ...AMBIENT_DEFAULTS }
    const opts = (): AmbientOptions =>
      Object.assign(resolved, AMBIENT_DEFAULTS, optionsRef.current)

    const tintCache = new Map<number, Lab>()
    let appliedDark: boolean | null = null
    const tintOf = (index: number): Lab | null => {
      const image = images[index]
      if (!image) return null
      const cached = tintCache.get(index)
      if (cached) return cached
      const o = opts()
      const pair = inkPairOf(image)
      const mid = pair.top.map(
        (v, i) => (v + pair.bottom[i]) / 2,
      ) as unknown as Rgb
      const lab = rgbToLab(
        shapeTint(
          mid,
          o.tintChroma,
          isDarkRef.current ? o.tintLightDark : o.tintLight,
        ),
      )
      tintCache.set(index, lab)
      return lab
    }

    let figures: { el: HTMLElement; index: number }[] = []
    const collect = () => {
      const found = [...scope.querySelectorAll<HTMLElement>('figure')].filter(
        (fig) => fig.querySelector('img'),
      )
      figures = found.map((el, i) => ({ el, index: i }))
    }
    collect()
    const observer = new MutationObserver(() => {
      collect()
      kickRef.current?.()
    })
    observer.observe(scope, { childList: true, subtree: true })

    const cur: Lab = [0.6, 0, 0]
    let seeded = false
    let amp = 0
    let gate = 1
    let velocity = 0
    let lastScroll = jotaiStore.get(pageScrollLocationAtom)
    let lastFrame = 0
    let idle = 0
    let running = false
    let frame = 0

    const started = performance.now()
    let fade = 0

    const step = (dt: number) => {
      const o = opts()
      fade = Math.min(1, (performance.now() - started) / FADE_IN_MS)
      if (isDarkRef.current !== appliedDark) {
        appliedDark = isDarkRef.current
        tintCache.clear()
      }

      const scrollY = jotaiStore.get(pageScrollLocationAtom)
      const raw = dt > 0 ? (Math.abs(scrollY - lastScroll) / dt) * 1000 : 0
      lastScroll = scrollY
      velocity += (raw - velocity) * decay(dt, AMBIENT_VELOCITY.velocityTau)

      const vh = window.innerHeight
      let bestWeight = 0
      let bestIndex = -1
      for (const fig of figures) {
        const rect = fig.el.getBoundingClientRect()
        const t = (vh - rect.top) / (vh + rect.height)
        if (t <= 0 || t >= 1) continue
        const weight = (Math.sin(Math.PI * t) ** 2) ** o.envelope
        if (weight > bestWeight) {
          bestWeight = weight
          bestIndex = fig.index
        }
      }

      const target = bestIndex >= 0 ? tintOf(bestIndex) : null
      if (target) {
        const ramp = smoothstep(
          AMBIENT_VELOCITY.tauLo,
          AMBIENT_VELOCITY.tauHi,
          velocity,
        )
        const tau = o.tauSlow + (o.tauFast - o.tauSlow) * ramp
        const k = seeded ? decay(dt, tau) : 1
        seeded = true
        for (let i = 0; i < 3; i++) cur[i] += (target[i] - cur[i]) * k
      }

      amp += (bestWeight - amp) * decay(dt, AMBIENT_VELOCITY.ampTau)

      const gateTarget =
        1 -
        o.fadeStrength *
          smoothstep(AMBIENT_VELOCITY.fadeLo, AMBIENT_VELOCITY.fadeHi, velocity)
      gate +=
        (gateTarget - gate) *
        decay(
          dt,
          gateTarget < gate
            ? AMBIENT_VELOCITY.fadeOutTau
            : AMBIENT_VELOCITY.fadeInTau,
        )

      const alpha =
        amp * (isDarkRef.current ? o.peakDark : o.peak) * gate * fade

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(window.innerWidth * dpr)
      const h = Math.round(window.innerHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uRes, w, h)
      gl.uniform3fv(uColor, labToRgb(cur))
      gl.uniform1f(uAlpha, seeded ? alpha : 0)
      gl.uniform1f(uDepth, (w * o.depth) / 100)
      gl.uniform1f(uCell, (o.grainScale / 128) * dpr)
      gl.uniform1f(uSolid, o.solid)
      gl.uniform1f(uExponent, 1 / o.grainDensity - 1)
      gl.uniform1f(uDensity, o.grainDensity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      const settled =
        fade === 1 && velocity < 1 && Math.abs(bestWeight - amp) < 0.002
      idle = settled ? idle + 1 : 0

      debugRef.current?.({ velocity, gate, envelope: amp, alpha })
    }

    const loop = (ms: number) => {
      const dt = lastFrame ? Math.min(64, ms - lastFrame) : 16
      lastFrame = ms
      step(dt)
      if (idle > 30) {
        running = false
        lastFrame = 0
        return
      }
      frame = requestAnimationFrame(loop)
    }
    const kick = () => {
      if (running) return
      running = true
      lastFrame = 0
      idle = 0
      frame = requestAnimationFrame(loop)
    }
    kickRef.current = kick

    kick()

    const unsubscribeScroll = jotaiStore.sub(pageScrollLocationAtom, kick)
    window.addEventListener('resize', kick)
    const onLost = () => {
      running = false
      cancelAnimationFrame(frame)
    }
    canvas.addEventListener('webglcontextlost', onLost)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribeScroll()
      window.removeEventListener('resize', kick)
      canvas.removeEventListener('webglcontextlost', onLost)
      kickRef.current = null
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      canvas.remove()
    }
  }, [enabled, images])

  useEffect(() => {
    kickRef.current?.()
  }, [isDark])

  if (!enabled) return null

  return <span aria-hidden hidden ref={anchorRef} />
}
