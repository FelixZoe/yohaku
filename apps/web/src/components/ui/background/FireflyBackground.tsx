'use client'
import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { isClientSide } from '~/lib/env'

// WebGL shader sources
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_brightness;
  attribute vec3 a_color;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  
  varying float v_brightness;
  varying float v_size;
  varying vec3 v_color;
  
  void main() {
    vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    
    gl_PointSize = a_size * 10.0;
    v_brightness = a_brightness;
    v_size = a_size;
    v_color = a_color;
  }
`

const fragmentShaderSource = `
  precision mediump float;
  
  uniform float u_time;
  
  varying float v_brightness;
  varying float v_size;
  varying vec3 v_color;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Create soft circular glow
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= alpha; // Squared for softer falloff
    
    // Apply brightness and pulsing effect
    float pulse = sin(u_time * v_brightness * 2.0) * 0.3 + 0.7;
    alpha *= v_brightness * pulse;
    
    // Create core and glow
    float core = 1.0 - smoothstep(0.0, 0.1, dist);
    float glow = 1.0 - smoothstep(0.1, 0.5, dist);
    
    vec3 color = v_color;
    float finalAlpha = (core + glow * 0.3) * alpha;
    
    gl_FragColor = vec4(color, finalAlpha);
  }
`

interface Firefly {
  angle: number
  brightness: number
  color: [number, number, number]
  fadeOut: number
  glowIntensity: number
  scared: number
  size: number
  speed: number
  x: number
  y: number
}

const fireflyColors: [number, number, number][] = [
  [0.8, 1, 0.4], // yellow-green
  [0.4, 1, 0.4], // green
  [0.4, 0.8, 1], // light-blue
]
const getRandomColor = () =>
  fireflyColors[Math.floor(Math.random() * fireflyColors.length)]

export const FireflyBackground: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const fireflyRef = useRef<Firefly[]>([])
  const animationRef = useRef<number | null>(null)

  const [dimensions, setDimensions] = useState(() =>
    isClientSide
      ? {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      : { width: 0, height: 0 },
  )

  // WebGL setup
  const createShader = useCallback(
    (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null

      gl.shaderSource(shader, source)
      gl.compileShader(shader)

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }

      return shader
    },
    [],
  )

  const createProgram = useCallback(
    (
      gl: WebGLRenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader,
    ) => {
      const program = gl.createProgram()
      if (!program) return null

      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
      }

      return program
    },
    [],
  )

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const gl = canvas.getContext('webgl')
    if (!gl) {
      console.error('WebGL not supported')
      return false
    }

    glRef.current = gl

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    )

    if (!vertexShader || !fragmentShader) return false

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader)
    if (!program) return false

    programRef.current = program

    // Enable blending for transparency
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    return true
  }, [createShader, createProgram])

  useIsomorphicLayoutEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const handleMouseDown = useCallback((event: MouseEvent) => {
    const scareRadius = 150
    fireflyRef.current.forEach((firefly) => {
      const dx = firefly.x - event.clientX
      const dy = firefly.y - event.clientY
      const distance = Math.hypot(dx, dy)

      if (distance < scareRadius) {
        firefly.scared = 60 + Math.random() * 30 // Scare for 60-90 frames
        firefly.angle = Math.atan2(dy, dx) // Angle to run away
      }
    })
  }, [])

  useIsomorphicLayoutEffect(() => {
    window.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleMouseDown])

  const initializeFireflies = useCallback(() => {
    const countRatio = 6
    const fireflyCount = Math.min(
      100,
      Math.floor((dimensions.width * dimensions.height) / 10000 / countRatio),
    )

    const maxContentWidth = Math.min(1280, dimensions.width * 0.9)
    const contentAreaLeft = (dimensions.width - maxContentWidth) / 2
    const contentAreaRight = contentAreaLeft + maxContentWidth
    const sideAreaWidth = contentAreaLeft

    const fireflies: Firefly[] = []

    for (let i = 0; i < fireflyCount; i++) {
      let x, y

      const isInSideArea = Math.random() < 0.85

      if (isInSideArea && sideAreaWidth > 50) {
        const isLeftSide = Math.random() < 0.5

        if (isLeftSide) {
          x = Math.random() * contentAreaLeft
        } else {
          x =
            contentAreaRight +
            Math.random() * (dimensions.width - contentAreaRight)
        }

        y = Math.random() * dimensions.height
      } else {
        const contentWidth = maxContentWidth
        const relativeX = Math.random()

        let adjustedX
        if (relativeX < 0.4) {
          adjustedX = relativeX * 0.5
        } else if (relativeX > 0.6) {
          adjustedX = 0.8 + (relativeX - 0.6) * 0.5
        } else {
          if (Math.random() < 0.7) {
            i--
            continue
          }
          adjustedX = relativeX
        }

        x = contentAreaLeft + adjustedX * contentWidth

        const relativeY = Math.random()
        if (relativeY < 0.3) {
          y = ((relativeY * dimensions.height) / 0.3) * 0.25
        } else if (relativeY > 0.7) {
          y =
            dimensions.height -
            (((1 - relativeY) * dimensions.height) / 0.3) * 0.25
        } else {
          if (Math.random() < 0.8) {
            i--
            continue
          }
          y = relativeY * dimensions.height
        }
      }

      fireflies.push({
        x,
        y,
        size: Math.random() * 1 + 0.4,
        brightness: Math.min(Math.random() + 0.5, 1),
        speed: 0.2 + Math.random() * 0.3,
        angle: Math.random() * Math.PI * 2,
        glowIntensity: 0.5 + Math.random() * 0.5,
        fadeOut: 1,
        scared: 0,
        color: getRandomColor(),
      })
    }

    fireflyRef.current = fireflies
  }, [dimensions])

  const updateFireflies = useCallback(() => {
    const maxContentWidth = Math.min(1280, dimensions.width * 0.9)
    const contentAreaLeft = (dimensions.width - maxContentWidth) / 2
    const contentAreaRight = contentAreaLeft + maxContentWidth

    fireflyRef.current.forEach((firefly) => {
      if (firefly.scared && firefly.scared > 0) {
        const scaredSpeed = firefly.speed * 3
        firefly.x += Math.cos(firefly.angle) * scaredSpeed
        firefly.y += Math.sin(firefly.angle) * scaredSpeed
        firefly.scared--
      } else {
        // Update position
        firefly.angle += (Math.random() - 0.5) * 0.1
        firefly.x += Math.cos(firefly.angle) * firefly.speed
        firefly.y += Math.sin(firefly.angle) * firefly.speed

        // Fade logic
        const fadeZoneLeft = contentAreaLeft + maxContentWidth * 0.2
        const fadeZoneRight = contentAreaRight - maxContentWidth * 0.2
        const fadeZoneTop = dimensions.height * 0.2
        const fadeZoneBottom = dimensions.height * 0.8

        const isInFadeZone =
          firefly.x > fadeZoneLeft &&
          firefly.x < fadeZoneRight &&
          firefly.y > fadeZoneTop &&
          firefly.y < fadeZoneBottom

        if (isInFadeZone) {
          firefly.fadeOut = Math.max(0, firefly.fadeOut - 0.02)

          if (firefly.fadeOut <= 0) {
            const sideAreaWidth = contentAreaLeft

            if (sideAreaWidth > 50) {
              const spawnOnLeft = Math.random() < 0.5

              if (spawnOnLeft) {
                firefly.x = Math.random() * contentAreaLeft
              } else {
                firefly.x =
                  contentAreaRight +
                  Math.random() * (dimensions.width - contentAreaRight)
              }

              firefly.y = Math.random() * dimensions.height
              firefly.size = Math.random() * 1 + 0.4
              firefly.brightness = Math.min(Math.random() + 0.5, 1)
              firefly.speed = 0.2 + Math.random() * 0.3
              firefly.angle = Math.random() * Math.PI * 2
              firefly.glowIntensity = 0.5 + Math.random() * 0.5
              firefly.fadeOut = 1
              firefly.scared = 0
              firefly.color = getRandomColor()
            }
          }
        } else {
          firefly.fadeOut = Math.min(1, firefly.fadeOut + 0.05)
        }

        // Boundary check and respawn
        if (
          firefly.x < -10 ||
          firefly.x > dimensions.width + 10 ||
          firefly.y < -10 ||
          firefly.y > dimensions.height + 10
        ) {
          const sideAreaWidth = contentAreaLeft
          const spawnInSideArea = Math.random() < 0.85

          if (spawnInSideArea && sideAreaWidth > 50) {
            const spawnOnLeft = Math.random() < 0.5

            if (spawnOnLeft) {
              firefly.x = Math.random() * contentAreaLeft
            } else {
              firefly.x =
                contentAreaRight +
                Math.random() * (dimensions.width - contentAreaRight)
            }

            const edge = Math.floor(Math.random() * 4)
            switch (edge) {
              case 0: {
                firefly.y = -5
                firefly.angle = Math.random() * Math.PI
                break
              }
              case 1: {
                if (!spawnOnLeft) {
                  firefly.x = dimensions.width + 5
                  firefly.y = Math.random() * dimensions.height
                  firefly.angle = Math.PI / 2 + Math.random() * Math.PI
                } else {
                  firefly.y = Math.random() * dimensions.height
                  firefly.angle = Math.random() * Math.PI * 2
                }
                break
              }
              case 2: {
                firefly.y = dimensions.height + 5
                firefly.angle = Math.PI + Math.random() * Math.PI
                break
              }
              case 3: {
                if (spawnOnLeft) {
                  firefly.x = -5
                  firefly.y = Math.random() * dimensions.height
                  firefly.angle = Math.random() * Math.PI - Math.PI / 2
                } else {
                  firefly.y = Math.random() * dimensions.height
                  firefly.angle = Math.random() * Math.PI * 2
                }
                break
              }
            }
          } else {
            const relativeX = Math.random()
            let adjustedX

            if (relativeX < 0.5) {
              adjustedX = relativeX * 0.4
            } else {
              adjustedX = 0.6 + (relativeX - 0.5) * 0.8
            }

            firefly.x = contentAreaLeft + adjustedX * maxContentWidth

            if (Math.random() < 0.5) {
              firefly.y = -5
              firefly.angle = Math.random() * Math.PI
            } else {
              firefly.y = dimensions.height + 5
              firefly.angle = Math.PI + Math.random() * Math.PI
            }
          }

          firefly.size = Math.random() * 1 + 0.4
          firefly.brightness = Math.min(Math.random() + 0.5, 1)
          firefly.speed = 0.2 + Math.random() * 0.3
          firefly.glowIntensity = 0.5 + Math.random() * 0.5
          firefly.fadeOut = 1
          firefly.scared = 0
          firefly.color = getRandomColor()
        }

        // Update brightness with pulsing effect
        firefly.brightness = Math.abs(
          Math.sin((Date.now() / 1000) * firefly.glowIntensity),
        )
      }
    })
  }, [dimensions])

  const render = useCallback(() => {
    const gl = glRef.current
    const program = programRef.current
    const canvas = canvasRef.current

    if (!gl || !program || !canvas) return

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const sizeLocation = gl.getAttribLocation(program, 'a_size')
    const brightnessLocation = gl.getAttribLocation(program, 'a_brightness')
    const colorLocation = gl.getAttribLocation(program, 'a_color')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const timeLocation = gl.getUniformLocation(program, 'u_time')

    // Set uniforms
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
    gl.uniform1f(timeLocation, Date.now() / 1000)

    // Prepare vertex data
    const fireflies = fireflyRef.current
    const positions = new Float32Array(fireflies.length * 2)
    const sizes = new Float32Array(fireflies.length)
    const brightnesses = new Float32Array(fireflies.length)
    const colors = new Float32Array(fireflies.length * 3)

    fireflies.forEach((firefly, i) => {
      positions[i * 2] = firefly.x
      positions[i * 2 + 1] = firefly.y
      sizes[i] = firefly.size
      brightnesses[i] = firefly.brightness * firefly.fadeOut
      colors[i * 3] = firefly.color[0]
      colors[i * 3 + 1] = firefly.color[1]
      colors[i * 3 + 2] = firefly.color[2]
    })

    // Create and bind buffers
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const sizeBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(sizeLocation)
    gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0)

    const brightnessBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, brightnessBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, brightnesses, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(brightnessLocation)
    gl.vertexAttribPointer(brightnessLocation, 1, gl.FLOAT, false, 0, 0)

    const colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(colorLocation)
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0)

    // Draw points
    gl.drawArrays(gl.POINTS, 0, fireflies.length)

    // Clean up
    gl.deleteBuffer(positionBuffer)
    gl.deleteBuffer(sizeBuffer)
    gl.deleteBuffer(brightnessBuffer)
    gl.deleteBuffer(colorBuffer)
  }, [])

  const animate = useCallback(() => {
    updateFireflies()
    render()
    // eslint-disable-next-line react-hooks/immutability
    animationRef.current = requestAnimationFrame(() => animate())
  }, [updateFireflies, render])

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return

    const canvas = canvasRef.current
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    if (!initWebGL()) {
      console.error('Failed to initialize WebGL')
      return
    }

    if (fireflyRef.current.length === 0) {
      initializeFireflies()
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, initWebGL, initializeFireflies, animate])

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}
