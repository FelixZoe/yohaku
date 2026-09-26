'use client'

import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { isClientSide } from '~/lib/env'

// Particle density calculation base value
const PARTICLE_DENSITY_BASE = 5000

// Color palette for daytime particles - expanded vibrant, diverse colors
const HUE_RANGES = [
  { start: 0.83, end: 0.89 }, // Soft pink (around 300°-320°)
  { start: 0.75, end: 0.82 }, // Lavender purple (around 270°-295°)
  { start: 0.47, end: 0.53 }, // Baby blue (around 170°-190°)
  { start: 0.33, end: 0.39 }, // Mint green (around 120°-140°)
  { start: 0.97, end: 1 }, // Peachy pink (around 350°-360°)
  { start: 0.08, end: 0.14 }, // Coral peach (around 30°-50°)
  { start: 0.22, end: 0.28 }, // Creamy yellow (around 80°-100°)
]

// WebGL shader sources for daytime particles
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_brightness;
  attribute float a_hue;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  
  varying float v_brightness;
  varying float v_size;
  varying float v_hue;
  
  void main() {
    vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    
    gl_PointSize = a_size * 12.0;
    v_brightness = a_brightness;
    v_size = a_size;
    v_hue = a_hue;
  }
`

const fragmentShaderSource = `
  precision mediump float;
  
  uniform float u_time;
  
  varying float v_brightness;
  varying float v_size;
  varying float v_hue;
  
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Create soft circular glow with falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = smoothstep(0.0, 1.0, alpha); // Smoother transition
    
    // Apply brightness and gentle pulsing effect
    float pulse = sin(u_time * v_brightness * 1.5 + v_hue * 6.28) * 0.3 + 0.7;
    alpha *= v_brightness * pulse;
    
    // Create core and glow with different intensities
    float core = 1.0 - smoothstep(0.0, 0.2, dist);
    float glow = 1.0 - smoothstep(0.2, 0.5, dist);
    
    // Enhanced HSV color with higher saturation and varied brightness
    float saturation = 0.8 + sin(u_time * 0.5 + v_hue * 6.28) * 0.2;
    float value = 0.85 + cos(u_time * 0.7 + v_hue * 6.28) * 0.15;
    vec3 color = hsv2rgb(vec3(v_hue, saturation, value));
    
    // Different color intensities for core and glow
    vec3 coreColor = color * 1.2;
    vec3 glowColor = color * 0.8;
    
    // Combine core and glow with their respective colors
    vec3 finalColor = coreColor * core + glowColor * glow * 0.6;
    float finalAlpha = (core + glow * 0.5) * alpha * 0.9;
    
    // Ensure minimum visibility
    finalAlpha = max(finalAlpha, 0.1 * alpha);
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`

interface DayParticle {
  angle: number
  baseSpeed: number
  brightness: number
  drag: number
  fadeOut: number
  glowIntensity: number
  hue: number
  mass: number
  size: number
  speed: number
  swayOffset: number
  velocityX: number
  velocityY: number
  x: number
  y: number
}

export const ParticlePhysics: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const particlesRef = useRef<DayParticle[]>([])
  const animationRef = useRef<number | null>(null)

  // 滚动相关状态 - 使用 ref 避免重新渲染
  const scrollDataRef = useRef({
    currentY: 0,
    previousY: 0,
    velocity: 0,
    acceleration: 0,
    lastTime: Date.now(),
    lastScrollTime: Date.now(), // 上次真正滚动的时间
  })

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

  // 直接监听滚动事件，不存储到 state
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const now = Date.now()
          const currentY = window.scrollY
          const deltaTime = (now - scrollDataRef.current.lastTime) / 1000 // 转换为秒
          const deltaY = currentY - scrollDataRef.current.previousY

          // 计算滚动速度 (像素/秒)
          const instantVelocity = deltaTime > 0 ? deltaY / deltaTime : 0

          // 只有当真正发生滚动时才更新速度
          if (Math.abs(deltaY) > 0.1) {
            scrollDataRef.current.lastScrollTime = now

            // 计算加速度 (像素/秒²)
            const acceleration =
              deltaTime > 0
                ? (instantVelocity - scrollDataRef.current.velocity) / deltaTime
                : 0

            // 平滑速度和加速度，避免抖动
            scrollDataRef.current.velocity =
              scrollDataRef.current.velocity * 0.8 + instantVelocity * 0.2
            scrollDataRef.current.acceleration =
              scrollDataRef.current.acceleration * 0.7 + acceleration * 0.3
          } else {
            // 如果没有真正滚动，检查是否应该停止
            const timeSinceLastScroll =
              now - scrollDataRef.current.lastScrollTime
            if (timeSinceLastScroll > 100) {
              // 100ms 后认为滚动已停止
              // 快速衰减速度
              scrollDataRef.current.velocity *= 0.85
              scrollDataRef.current.acceleration *= 0.85

              // 当速度很小时直接归零
              if (Math.abs(scrollDataRef.current.velocity) < 5) {
                scrollDataRef.current.velocity = 0
                scrollDataRef.current.acceleration = 0
              }
            }
          }

          scrollDataRef.current.currentY = currentY
          scrollDataRef.current.previousY = currentY
          scrollDataRef.current.lastTime = now

          ticking = false
        })
        ticking = true
      }
    }

    // 定时器：持续检查并衰减滚动速度
    const decayInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastScroll = now - scrollDataRef.current.lastScrollTime

      // 如果超过 150ms 没有滚动，强制衰减速度
      if (timeSinceLastScroll > 150) {
        scrollDataRef.current.velocity *= 0.9
        scrollDataRef.current.acceleration *= 0.9

        // 当速度很小时直接归零
        if (Math.abs(scrollDataRef.current.velocity) < 3) {
          scrollDataRef.current.velocity = 0
          scrollDataRef.current.acceleration = 0
        }
      }
    }, 16) // 每 16ms 检查一次（约 60 FPS）

    // 初始化滚动数据
    scrollDataRef.current.currentY = window.scrollY
    scrollDataRef.current.previousY = window.scrollY
    scrollDataRef.current.lastTime = Date.now()
    scrollDataRef.current.lastScrollTime = Date.now()

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(decayInterval)
    }
  }, [])

  const initializeParticles = useCallback(() => {
    const particleCount = Math.floor(
      (dimensions.width * dimensions.height) / PARTICLE_DENSITY_BASE,
    )

    const maxContentWidth = Math.min(1280, dimensions.width * 0.9)
    const contentAreaLeft = (dimensions.width - maxContentWidth) / 2
    const contentAreaRight = contentAreaLeft + maxContentWidth
    const sideAreaWidth = contentAreaLeft

    const particles: DayParticle[] = []

    for (let i = 0; i < particleCount; i++) {
      let x, y

      const isInSideArea = Math.random() < 0.8

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
        if (relativeX < 0.3) {
          adjustedX = relativeX * 0.4
        } else if (relativeX > 0.7) {
          adjustedX = 0.7 + (relativeX - 0.7) * 0.6
        } else {
          if (Math.random() < 0.8) {
            i--
            continue
          }
          adjustedX = relativeX
        }

        x = contentAreaLeft + adjustedX * contentWidth

        const relativeY = Math.random()
        if (relativeY < 0.2) {
          y = ((relativeY * dimensions.height) / 0.2) * 0.3
        } else if (relativeY > 0.8) {
          y =
            dimensions.height -
            (((1 - relativeY) * dimensions.height) / 0.2) * 0.3
        } else {
          if (Math.random() < 0.9) {
            i--
            continue
          }
          y = relativeY * dimensions.height
        }
      }

      // Select random hue range
      const hueRange = HUE_RANGES[Math.floor(Math.random() * HUE_RANGES.length)]
      const hue =
        hueRange.start + Math.random() * (hueRange.end - hueRange.start)

      const baseSpeed = 0.15 + Math.random() * 0.25
      const size = Math.random() * 0.8 + 0.3

      particles.push({
        x,
        y,
        size,
        brightness: Math.min(Math.random() * 0.6 + 0.4, 1),
        speed: baseSpeed,
        baseSpeed,
        angle: Math.random() * Math.PI * 2,
        glowIntensity: 0.8 + Math.random() * 0.4,
        fadeOut: 1,
        hue,
        swayOffset: Math.random() * Math.PI * 2,
        velocityX: 0,
        velocityY: 0,
        mass: 0.5 + size * 0.5,
        drag: 0.98 + Math.random() * 0.015,
      })
    }

    particlesRef.current = particles
  }, [dimensions])

  const updateParticles = useCallback(() => {
    const maxContentWidth = Math.min(1280, dimensions.width * 0.9)
    const contentAreaLeft = (dimensions.width - maxContentWidth) / 2
    const contentAreaRight = contentAreaLeft + maxContentWidth
    const time = Date.now() / 1000

    // 获取当前滚动数据
    const scrollData = scrollDataRef.current
    const deltaTime = 1 / 60 // 假设 60 FPS

    particlesRef.current.forEach((particle) => {
      // 基础浮动运动
      const sway = Math.sin(time * 0.5 + particle.swayOffset) * 0.3
      particle.angle += (Math.random() - 0.5) * 0.05 + sway * 0.02

      const baseVelX = Math.cos(particle.angle) * particle.baseSpeed
      const baseVelY = Math.sin(particle.angle) * particle.baseSpeed * 0.7 - 0.1

      // 计算滚动产生的力 - 增强效果
      const scrollForceScale = 0.008 // 大幅增加力度
      const forceX =
        (scrollData.velocity * scrollForceScale * 0.3) / particle.mass
      const forceY = (scrollData.velocity * scrollForceScale) / particle.mass

      // 物理模拟：力 -> 加速度 -> 速度变化
      const accelerationX = forceX
      const accelerationY = forceY

      // 更新惯性速度：v = v + a * dt
      particle.velocityX += accelerationX * deltaTime
      particle.velocityY += accelerationY * deltaTime

      // 简化的阻力模拟：线性阻力，更容易控制
      const dragCoefficient = 0.85 // 每帧保留 85% 的速度
      particle.velocityX *= dragCoefficient
      particle.velocityY *= dragCoefficient

      // 渐进式恢复力：当没有滚动时，轻微地拉回原位
      const isScrolling = Math.abs(scrollData.velocity) > 5
      if (!isScrolling) {
        const restoreForce = 0.02 // 恢复力系数
        const restoreAccelX = -particle.velocityX * restoreForce
        const restoreAccelY = -particle.velocityY * restoreForce

        particle.velocityX += restoreAccelX * deltaTime
        particle.velocityY += restoreAccelY * deltaTime
      }

      // 限制最大惯性速度（避免过度运动）
      const maxInertiaVelocity = 4
      const currentSpeed = Math.hypot(particle.velocityX, particle.velocityY)
      if (currentSpeed > maxInertiaVelocity) {
        const scale = maxInertiaVelocity / currentSpeed
        particle.velocityX *= scale
        particle.velocityY *= scale
      }

      // 当惯性速度非常小时，逐渐归零（避免无限小的振动）
      const minSpeed = 0.01
      if (Math.abs(particle.velocityX) < minSpeed) particle.velocityX = 0
      if (Math.abs(particle.velocityY) < minSpeed) particle.velocityY = 0

      // 计算最终速度：基础运动速度 + 惯性速度
      const finalVelX = baseVelX + particle.velocityX
      const finalVelY = baseVelY + particle.velocityY

      // 更新位置
      particle.x += finalVelX
      particle.y += finalVelY

      // 保持粒子原始大小，不受滚动影响
      // 移除滚动对视觉效果的影响，保持粒子稳定的外观

      // Fade logic in content area
      const fadeZoneLeft = contentAreaLeft + maxContentWidth * 0.15
      const fadeZoneRight = contentAreaRight - maxContentWidth * 0.15
      const fadeZoneTop = dimensions.height * 0.15
      const fadeZoneBottom = dimensions.height * 0.85

      const isInFadeZone =
        particle.x > fadeZoneLeft &&
        particle.x < fadeZoneRight &&
        particle.y > fadeZoneTop &&
        particle.y < fadeZoneBottom

      if (isInFadeZone) {
        particle.fadeOut = Math.max(0, particle.fadeOut - 0.015)

        if (particle.fadeOut <= 0) {
          // Respawn particle
          const sideAreaWidth = contentAreaLeft

          if (sideAreaWidth > 50) {
            const spawnOnLeft = Math.random() < 0.5

            if (spawnOnLeft) {
              particle.x = Math.random() * contentAreaLeft
            } else {
              particle.x =
                contentAreaRight +
                Math.random() * (dimensions.width - contentAreaRight)
            }

            particle.y = Math.random() * dimensions.height
            const newSize = Math.random() * 0.8 + 0.3
            particle.size = newSize
            particle.brightness = Math.min(Math.random() * 0.6 + 0.4, 1)
            const newBaseSpeed = 0.15 + Math.random() * 0.25
            particle.speed = newBaseSpeed
            particle.baseSpeed = newBaseSpeed
            particle.angle = Math.random() * Math.PI * 2
            particle.glowIntensity = 0.8 + Math.random() * 0.4
            particle.fadeOut = 1
            particle.swayOffset = Math.random() * Math.PI * 2

            // 重置物理属性
            particle.velocityX = 0
            particle.velocityY = 0
            particle.mass = 0.5 + newSize * 0.5
            particle.drag = 0.98 + Math.random() * 0.015

            // Reassign color
            const hueRange =
              HUE_RANGES[Math.floor(Math.random() * HUE_RANGES.length)]
            particle.hue =
              hueRange.start + Math.random() * (hueRange.end - hueRange.start)
          }
        }
      } else {
        particle.fadeOut = Math.min(1, particle.fadeOut + 0.03)
      }

      // Boundary check and respawn
      if (
        particle.x < -20 ||
        particle.x > dimensions.width + 20 ||
        particle.y < -20 ||
        particle.y > dimensions.height + 20
      ) {
        const sideAreaWidth = contentAreaLeft
        const spawnInSideArea = Math.random() < 0.8

        if (spawnInSideArea && sideAreaWidth > 50) {
          const spawnOnLeft = Math.random() < 0.5

          if (spawnOnLeft) {
            particle.x = Math.random() * contentAreaLeft
          } else {
            particle.x =
              contentAreaRight +
              Math.random() * (dimensions.width - contentAreaRight)
          }

          // Mostly spawn from bottom or sides
          const edge = Math.floor(Math.random() * 4)
          switch (edge) {
            case 0: {
              particle.y = dimensions.height + 10
              particle.angle = Math.PI + Math.random() * Math.PI
              break
            }
            case 1: {
              if (!spawnOnLeft) {
                particle.x = dimensions.width + 10
                particle.y = Math.random() * dimensions.height
                particle.angle = Math.PI / 2 + Math.random() * Math.PI
              } else {
                particle.y = Math.random() * dimensions.height
                particle.angle = Math.random() * Math.PI * 2
              }
              break
            }
            case 2: {
              particle.y = -10
              particle.angle = Math.random() * Math.PI
              break
            }
            case 3: {
              if (spawnOnLeft) {
                particle.x = -10
                particle.y = Math.random() * dimensions.height
                particle.angle = Math.random() * Math.PI - Math.PI / 2
              } else {
                particle.y = Math.random() * dimensions.height
                particle.angle = Math.random() * Math.PI * 2
              }
              break
            }
          }
        } else {
          const relativeX = Math.random()
          let adjustedX

          if (relativeX < 0.4) {
            adjustedX = relativeX * 0.5
          } else {
            adjustedX = 0.5 + (relativeX - 0.4) * 0.8
          }

          particle.x = contentAreaLeft + adjustedX * maxContentWidth

          if (Math.random() < 0.7) {
            particle.y = dimensions.height + 10
            particle.angle = Math.PI + Math.random() * Math.PI
          } else {
            particle.y = -10
            particle.angle = Math.random() * Math.PI
          }
        }

        const newSize = Math.random() * 0.8 + 0.3
        particle.size = newSize
        particle.brightness = Math.min(Math.random() * 0.6 + 0.4, 1)
        const newBaseSpeed = 0.15 + Math.random() * 0.25
        particle.speed = newBaseSpeed
        particle.baseSpeed = newBaseSpeed
        particle.glowIntensity = 0.8 + Math.random() * 0.4
        particle.fadeOut = 1
        particle.swayOffset = Math.random() * Math.PI * 2

        // 重置物理属性
        particle.velocityX = 0
        particle.velocityY = 0
        particle.mass = 0.5 + newSize * 0.5
        particle.drag = 0.98 + Math.random() * 0.015

        // Reassign color
        const hueRange =
          HUE_RANGES[Math.floor(Math.random() * HUE_RANGES.length)]
        particle.hue =
          hueRange.start + Math.random() * (hueRange.end - hueRange.start)
      }

      // Update brightness with gentle pulsing only (no scroll influence)
      particle.brightness = Math.abs(
        Math.sin(time * particle.glowIntensity * 0.7) * 0.3 + 0.7,
      )
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
    const hueLocation = gl.getAttribLocation(program, 'a_hue')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const timeLocation = gl.getUniformLocation(program, 'u_time')

    // Set uniforms
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
    gl.uniform1f(timeLocation, Date.now() / 1000)

    // Prepare vertex data
    const particles = particlesRef.current
    const positions = new Float32Array(particles.length * 2)
    const sizes = new Float32Array(particles.length)
    const brightnesses = new Float32Array(particles.length)
    const hues = new Float32Array(particles.length)

    particles.forEach((particle, i) => {
      positions[i * 2] = particle.x
      positions[i * 2 + 1] = particle.y
      sizes[i] = particle.size
      brightnesses[i] = particle.brightness * particle.fadeOut
      hues[i] = particle.hue
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

    const hueBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, hueBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, hues, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(hueLocation)
    gl.vertexAttribPointer(hueLocation, 1, gl.FLOAT, false, 0, 0)

    // Draw points
    gl.drawArrays(gl.POINTS, 0, particles.length)

    // Clean up
    gl.deleteBuffer(positionBuffer)
    gl.deleteBuffer(sizeBuffer)
    gl.deleteBuffer(brightnessBuffer)
    gl.deleteBuffer(hueBuffer)
  }, [])

  const animate = useCallback(() => {
    updateParticles()
    render()
    animationRef.current = requestAnimationFrame(animate)
  }, [updateParticles, render])

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return

    const canvas = canvasRef.current
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    if (!initWebGL()) {
      console.error('Failed to initialize WebGL')
      return
    }

    if (particlesRef.current.length === 0) {
      initializeParticles()
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, initWebGL, initializeParticles, animate])

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0 size-full"
      ref={canvasRef}
    />
  )
}

ParticlePhysics.displayName = 'ParticlePhysics'
