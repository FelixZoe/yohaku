'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { isClientSide } from '~/lib/env'

import {
  createMinamoClickRipple,
  fillMinamoClickBatch,
  getMinamoClickBatchCount,
  MINAMO_CLICK_BATCH_SIZE,
  type MinamoClickRipple,
  retainActiveMinamoClickRipples,
} from './MinamoBackground.interaction'
import {
  fragmentSource,
  rippleAccumulationFragmentSource,
  vertexSource,
} from './MinamoBackground.shader'

export type MinamoBackgroundProps = {
  speed?: number
  intensity?: number
  sizeScale?: number
  density?: number
}

type MinamoGL = WebGLRenderingContext | WebGL2RenderingContext

type HeightFieldFormat = {
  internalFormat: number
  format: number
  type: number
  encoded: boolean
  clearValue: number
  filter: number
  heightRange: number
}

type HeightFieldTarget = {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
}

const compileShader = (
  gl: MinamoGL,
  type: number,
  source: string,
  label: string,
) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Minamo] ${label} shader compilation failed`, {
        log: gl.getShaderInfoLog(shader),
      })
    }
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const createProgram = (
  gl: MinamoGL,
  fragmentShaderSource: string,
  label: string,
) => {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    vertexSource,
    `${label} vertex`,
  )
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
    `${label} fragment`,
  )
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader)
    if (fragmentShader) gl.deleteShader(fragmentShader)
    return null
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return null
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Minamo] ${label} program linking failed`, {
        log: gl.getProgramInfoLog(program),
      })
    }
    gl.deleteProgram(program)
    return null
  }
  return program
}

export const MinamoBackground: FC<MinamoBackgroundProps> = ({
  speed = 1,
  intensity = 1,
  sizeScale = 1,
  density = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const animationRef = useRef<number | null>(null)
  const clickRipplesRef = useRef<MinamoClickRipple[]>([])
  const clickSeedRef = useRef(0)

  const propsRef = useRef({ speed, intensity, sizeScale, density })
  propsRef.current = { speed, intensity, sizeScale, density }

  useIsomorphicLayoutEffect(() => {
    if (!isClientSide) return
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { innerWidth: width, innerHeight: height } = window
      sizeRef.current = { width, height, dpr }
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
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
    const gl =
      canvas.getContext('webgl2', contextOptions) ||
      canvas.getContext('webgl', contextOptions)
    if (!gl) return

    const accumulationProgram = createProgram(
      gl,
      rippleAccumulationFragmentSource,
      'ripple accumulation',
    )
    const compositionProgram = createProgram(gl, fragmentSource, 'composition')
    if (!accumulationProgram || !compositionProgram) {
      if (accumulationProgram) gl.deleteProgram(accumulationProgram)
      if (compositionProgram) gl.deleteProgram(compositionProgram)
      return
    }

    const buffer = gl.createBuffer()
    if (!buffer) {
      gl.deleteProgram(accumulationProgram)
      gl.deleteProgram(compositionProgram)
      return
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )

    const accumulationPositionLocation = gl.getAttribLocation(
      accumulationProgram,
      'a_position',
    )
    const compositionPositionLocation = gl.getAttribLocation(
      compositionProgram,
      'a_position',
    )
    const bindPosition = (location: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
    }

    const previousHeightLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_previousHeight',
    )
    const extentLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_extent',
    )
    const accumulationTimeLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_time2',
    )
    const accumulationEncodedHeightLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_encodedHeight',
    )
    const accumulationHeightRangeLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_heightRange',
    )
    const clickRipplesLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_clickRipples[0]',
    )
    const clickProfilesLocation = gl.getUniformLocation(
      accumulationProgram,
      'u_clickProfiles[0]',
    )

    const resolutionLocation = gl.getUniformLocation(
      compositionProgram,
      'u_resolution',
    )
    const timeLocation = gl.getUniformLocation(compositionProgram, 'u_time')
    const time2Location = gl.getUniformLocation(compositionProgram, 'u_time2')
    const intensityLocation = gl.getUniformLocation(
      compositionProgram,
      'u_intensity',
    )
    const cellSizeLocation = gl.getUniformLocation(
      compositionProgram,
      'u_cellSize',
    )
    const densityLocation = gl.getUniformLocation(
      compositionProgram,
      'u_density',
    )
    const clickHeightLocation = gl.getUniformLocation(
      compositionProgram,
      'u_clickHeight',
    )
    const clickTexelLocation = gl.getUniformLocation(
      compositionProgram,
      'u_clickTexel',
    )
    const compositionEncodedHeightLocation = gl.getUniformLocation(
      compositionProgram,
      'u_encodedHeight',
    )
    const compositionHeightRangeLocation = gl.getUniformLocation(
      compositionProgram,
      'u_heightRange',
    )

    const getHeightFieldFormats = (): HeightFieldFormat[] => {
      const formats: HeightFieldFormat[] = []
      const isWebGL2 =
        typeof WebGL2RenderingContext !== 'undefined' &&
        gl instanceof WebGL2RenderingContext

      if (isWebGL2 && gl.getExtension('EXT_color_buffer_float')) {
        const gl2 = gl as WebGL2RenderingContext
        formats.push({
          internalFormat: gl2.RGBA16F,
          format: gl.RGBA,
          type: gl2.HALF_FLOAT,
          encoded: false,
          clearValue: 0,
          filter: gl.LINEAR,
          heightRange: 1,
        })
      }

      if (!isWebGL2) {
        const halfFloat = gl.getExtension('OES_texture_half_float') as {
          HALF_FLOAT_OES: number
        } | null
        const colorHalfFloat = gl.getExtension('EXT_color_buffer_half_float')
        if (halfFloat && colorHalfFloat) {
          formats.push({
            internalFormat: gl.RGBA,
            format: gl.RGBA,
            type: halfFloat.HALF_FLOAT_OES,
            encoded: false,
            clearValue: 0,
            filter: gl.getExtension('OES_texture_half_float_linear')
              ? gl.LINEAR
              : gl.NEAREST,
            heightRange: 1,
          })
        }
      }

      formats.push({
        internalFormat: gl.RGBA,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        encoded: true,
        clearValue: 0.5,
        filter: gl.LINEAR,
        heightRange: 8,
      })
      return formats
    }

    const createHeightFieldTarget = (
      width: number,
      height: number,
      format: HeightFieldFormat,
    ): HeightFieldTarget | null => {
      const texture = gl.createTexture()
      const framebuffer = gl.createFramebuffer()
      if (!texture || !framebuffer) {
        if (texture) gl.deleteTexture(texture)
        if (framebuffer) gl.deleteFramebuffer(framebuffer)
        return null
      }

      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, format.filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, format.filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format.internalFormat,
        width,
        height,
        0,
        format.format,
        format.type,
        null,
      )
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0,
      )
      const isComplete =
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.bindTexture(gl.TEXTURE_2D, null)
      if (!isComplete) {
        gl.deleteFramebuffer(framebuffer)
        gl.deleteTexture(texture)
        return null
      }
      return { texture, framebuffer }
    }

    const deleteHeightFieldTarget = (target: HeightFieldTarget) => {
      gl.deleteFramebuffer(target.framebuffer)
      gl.deleteTexture(target.texture)
    }

    let fieldWidth = 0
    let fieldHeight = 0
    let fieldFormat: HeightFieldFormat | null = null
    let fieldTargets: HeightFieldTarget[] = []
    let reportedFieldFailure = false
    const ensureHeightField = (width: number, height: number) => {
      if (fieldWidth === width && fieldHeight === height) {
        return fieldTargets.length === 2 && fieldFormat !== null
      }

      for (const target of fieldTargets) deleteHeightFieldTarget(target)
      fieldTargets = []
      fieldFormat = null
      fieldWidth = width
      fieldHeight = height

      for (const format of getHeightFieldFormats()) {
        const firstTarget = createHeightFieldTarget(width, height, format)
        if (!firstTarget) continue
        const secondTarget = createHeightFieldTarget(width, height, format)
        if (!secondTarget) {
          deleteHeightFieldTarget(firstTarget)
          continue
        }
        fieldTargets = [firstTarget, secondTarget]
        fieldFormat = format
        reportedFieldFailure = false
        return true
      }

      if (!reportedFieldFailure && process.env.NODE_ENV === 'development') {
        console.error(
          '[Minamo] click height-field creation failed; rendering base water',
        )
        reportedFieldFailure = true
      }
      return false
    }

    const neutralTexture = gl.createTexture()
    if (neutralTexture) {
      gl.bindTexture(gl.TEXTURE_2D, neutralTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([128, 0, 0, 255]),
      )
      gl.bindTexture(gl.TEXTURE_2D, null)
    }

    const clickData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
    const profileData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)

    // The caustic clock remains deliberately slow. The event clock preserves
    // the existing speed prop behavior for click expansion and lifetime.
    let causticTime = 0
    let eventTime = 0
    let lastNow = performance.now()

    // The canvas remains pointer-events-none; page-level clicks create waves.
    const onPointerDown = (event: PointerEvent) => {
      clickRipplesRef.current.push(
        createMinamoClickRipple({
          clientX: event.clientX,
          clientY: event.clientY,
          start: eventTime,
          seed: clickSeedRef.current++,
        }),
      )
    }
    window.addEventListener('pointerdown', onPointerDown)

    const render = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.1)
      lastNow = now
      const {
        intensity: currentIntensity,
        speed: currentSpeed,
        sizeScale: currentScale,
        density: currentDensity,
      } = propsRef.current
      causticTime += dt * 0.12 * currentSpeed
      eventTime += dt * currentSpeed

      const { width, height, dpr } = sizeRef.current
      const pixelWidth = Math.floor(width * dpr)
      const pixelHeight = Math.floor(height * dpr)
      if (pixelWidth < 1 || pixelHeight < 1) {
        animationRef.current = requestAnimationFrame(render)
        return
      }

      const cellSize = 220 * currentScale * dpr
      clickRipplesRef.current = retainActiveMinamoClickRipples(
        clickRipplesRef.current,
        eventTime,
      )

      const desiredFieldWidth = Math.max(1, Math.ceil(width * 0.5))
      const desiredFieldHeight = Math.max(1, Math.ceil(height * 0.5))
      const hasHeightField = ensureHeightField(
        desiredFieldWidth,
        desiredFieldHeight,
      )

      let clickTexture = neutralTexture
      let clickTexelX = 1
      let clickTexelY = 1
      let encodedHeight = 1
      let heightRange = 8

      if (hasHeightField && fieldFormat) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTargets[0].framebuffer)
        gl.viewport(0, 0, fieldWidth, fieldHeight)
        gl.clearColor(fieldFormat.clearValue, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        let readIndex = 0
        const batchCount = getMinamoClickBatchCount(
          clickRipplesRef.current.length,
        )
        for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
          fillMinamoClickBatch({
            ripples: clickRipplesRef.current,
            batchIndex,
            dpr,
            pixelHeight,
            cellSize,
            clickData,
            profileData,
          })
          const writeIndex = 1 - readIndex
          gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            fieldTargets[writeIndex].framebuffer,
          )
          gl.viewport(0, 0, fieldWidth, fieldHeight)
          gl.useProgram(accumulationProgram)
          bindPosition(accumulationPositionLocation)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, fieldTargets[readIndex].texture)
          gl.uniform1i(previousHeightLocation, 0)
          gl.uniform2f(
            extentLocation,
            pixelWidth / cellSize,
            pixelHeight / cellSize,
          )
          gl.uniform1f(accumulationTimeLocation, eventTime)
          gl.uniform1f(
            accumulationEncodedHeightLocation,
            fieldFormat.encoded ? 1 : 0,
          )
          gl.uniform1f(accumulationHeightRangeLocation, fieldFormat.heightRange)
          gl.uniform4fv(clickRipplesLocation, clickData)
          gl.uniform4fv(clickProfilesLocation, profileData)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          readIndex = writeIndex
        }

        clickTexture = fieldTargets[readIndex].texture
        clickTexelX = 1 / fieldWidth
        clickTexelY = 1 / fieldHeight
        encodedHeight = fieldFormat.encoded ? 1 : 0
        heightRange = fieldFormat.heightRange
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, pixelWidth, pixelHeight)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(compositionProgram)
      bindPosition(compositionPositionLocation)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, clickTexture)
      gl.uniform1i(clickHeightLocation, 0)
      gl.uniform2f(clickTexelLocation, clickTexelX, clickTexelY)
      gl.uniform1f(compositionEncodedHeightLocation, encodedHeight)
      gl.uniform1f(compositionHeightRangeLocation, heightRange)
      gl.uniform2f(resolutionLocation, pixelWidth, pixelHeight)
      gl.uniform1f(timeLocation, causticTime)
      gl.uniform1f(time2Location, eventTime)
      gl.uniform1f(intensityLocation, currentIntensity)
      gl.uniform1f(cellSizeLocation, cellSize)
      gl.uniform1f(densityLocation, currentDensity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
      for (const target of fieldTargets) deleteHeightFieldTarget(target)
      if (neutralTexture) gl.deleteTexture(neutralTexture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(accumulationProgram)
      gl.deleteProgram(compositionProgram)
    }
  }, [])

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}
