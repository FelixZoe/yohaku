# 粒子背景物理系统技术文档

## 概述

本文档详细描述了 `DaylightBackground` 组件中基于 WebGL 的粒子物理系统，该系统实现了响应页面滚动的动态惯性效果。

## 系统架构

### 核心组件

1. **粒子渲染系统** - 基于 WebGL 的高性能粒子渲染
2. **物理模拟引擎** - 实时物理运动计算
3. **滚动感应系统** - 页面滚动事件监听与速度计算
4. **惯性运动系统** - 基于牛顿力学的粒子运动模拟

## 物理运动模型

### 基础物理原理

系统基于经典牛顿力学构建，遵循以下基本定律：

```
F = ma  (牛顿第二定律)
v = v₀ + at  (运动学方程)
s = s₀ + v₀t + ½at²  (位移方程)
```

### 力的组成

每个粒子受到以下力的作用：

#### 1. 滚动驱动力 (Scroll Force)

```typescript
const scrollForceScale = 0.008
const forceX = (scrollData.velocity * scrollForceScale * 0.3) / particle.mass
const forceY = (scrollData.velocity * scrollForceScale) / particle.mass
```

**设计原理：**

- 力与滚动速度成正比
- 垂直方向力度更强（系数1.0 vs 0.3）
- 反比于粒子质量，体现质量对运动的影响

#### 2. 阻力 (Drag Force)

```typescript
const dragCoefficient = 0.85
particle.velocityX *= dragCoefficient
particle.velocityY *= dragCoefficient
```

**设计原理：**

- 采用线性阻力模型，简化计算
- 每帧保留85%的速度，15%的能量损失
- 模拟空气阻力和能量耗散

#### 3. 恢复力 (Restore Force)

```typescript
const isScrolling = Math.abs(scrollData.velocity) > 5
if (!isScrolling) {
  const restoreForce = 0.02
  const restoreAccelX = -particle.velocityX * restoreForce
  const restoreAccelY = -particle.velocityY * restoreForce
}
```

**设计原理：**

- 仅在停止滚动时生效
- 力的方向与当前速度相反
- 逐渐将粒子拉回原始运动轨道

## 滚动感应系统

### 速度计算算法

```typescript
const deltaTime = (now - scrollDataRef.current.lastTime) / 1000
const deltaY = currentY - scrollDataRef.current.previousY
const instantVelocity = deltaTime > 0 ? deltaY / deltaTime : 0
```

### 速度平滑处理

```typescript
scrollDataRef.current.velocity =
  scrollDataRef.current.velocity * 0.8 + instantVelocity * 0.2
```

**设计原理：**

- 使用指数移动平均 (EMA) 平滑速度变化
- 权重配比 8:2，兼顾响应性和稳定性
- 避免因触控板等输入设备导致的速度抖动

### 速度衰减机制

```typescript
const timeSinceLastScroll = now - scrollDataRef.current.lastScrollTime
if (timeSinceLastScroll > 150) {
  scrollDataRef.current.velocity *= 0.9
  if (Math.abs(scrollDataRef.current.velocity) < 3) {
    scrollDataRef.current.velocity = 0
  }
}
```

## 粒子属性系统

### 粒子数据结构

```typescript
interface DayParticle {
  // 位置与运动
  x: number // X 坐标
  y: number // Y 坐标
  velocityX: number // X 方向惯性速度
  velocityY: number // Y 方向惯性速度

  // 物理属性
  mass: number // 质量 (0.5 + size * 0.5)
  drag: number // 个体阻力系数
  baseSpeed: number // 基础运动速度

  // 视觉属性
  size: number // 粒子大小
  brightness: number // 亮度
  hue: number // 色相值
  fadeOut: number // 渐隐系数
}
```

### 质量分配算法

```typescript
particle.mass = 0.5 + size * 0.5
```

**设计理念：**

- 大粒子质量更大，惯性更强
- 小粒子质量较小，响应更敏感
- 质量范围：0.8 - 1.15（基于粒子大小0.3-1.3）

## 渲染系统

### WebGL 着色器架构

#### 顶点着色器

```glsl
attribute vec2 a_position;
attribute float a_size;
attribute float a_brightness;
attribute float a_hue;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  gl_PointSize = a_size * 12.0;
}
```

#### 片段着色器特性

- HSV 到 RGB 颜色空间转换
- 径向渐变光晕效果
- 动态亮度脉冲
- 软边缘处理

### 颜色系统

#### 色相范围定义

```typescript
const HUE_RANGES = [
  { start: 0, end: 0.08 }, // 红色
  { start: 0.08, end: 0.15 }, // 红橙色
  { start: 0.15, end: 0.22 }, // 橙色
  // ... 14个色相范围，覆盖完整色轮
]
```

**设计原理：**

- 14个预定义色相范围，确保色彩丰富度
- 避免随机色彩导致的视觉噪音
- 色相平滑过渡，视觉和谐

## 性能优化策略

### 粒子密度计算

```typescript
const PARTICLE_DENSITY_BASE = 5000
const particleCount = Math.floor(
  (dimensions.width * dimensions.height) / PARTICLE_DENSITY_BASE,
)
```

**优化策略：**

- 基于屏幕面积动态调整粒子数量
- 密度基数 5000 平衡性能与视觉效果
- 避免固定粒子数在不同屏幕尺寸下的性能差异

### 内容区域优化

#### 智能分布算法

- **80%** 粒子分布在侧边区域（避开内容区域）
- **20%** 粒子在内容区域边缘（增加层次感）
- 内容区域中心自动淡出，避免干扰阅读

#### 渐隐机制

```typescript
const fadeZoneLeft = contentAreaLeft + maxContentWidth * 0.15
const fadeZoneRight = contentAreaRight - maxContentWidth * 0.15

if (isInFadeZone) {
  particle.fadeOut = Math.max(0, particle.fadeOut - 0.015)
}
```

## 参数调优指南

### 关键参数说明

| 参数                 | 当前值 | 影响           | 调优建议                                     |
| -------------------- | ------ | -------------- | -------------------------------------------- |
| `scrollForceScale`   | 0.008  | 滚动响应强度   | 增大：更强烈的惯性效果<br>减小：更温和的响应 |
| `dragCoefficient`    | 0.85   | 速度衰减率     | 增大：更慢的衰减<br>减小：更快停止           |
| `restoreForce`       | 0.02   | 恢复原轨道速度 | 增大：更快回到原位<br>减小：更长的惯性时间   |
| `maxInertiaVelocity` | 4      | 最大惯性速度   | 增大：允许更大幅度运动<br>减小：限制运动范围 |

### 调优场景

#### 增强动感效果

```typescript
scrollForceScale: 0.012 // 更强的驱动力
dragCoefficient: 0.88 // 更慢的衰减
maxInertiaVelocity: 6 // 更大的运动范围
```

#### 更温和的效果

```typescript
scrollForceScale: 0.005 // 更温和的驱动力
dragCoefficient: 0.8 // 更快的衰减
restoreForce: 0.05 // 更快的恢复
```

## 物理计算流程

### 每帧更新步骤

1. **滚动数据获取**

   ```typescript
   const scrollData = scrollDataRef.current
   const deltaTime = 1 / 60 // 假设 60 FPS
   ```

2. **力计算阶段**

   ```typescript
   // 滚动驱动力
   const accelerationX = forceX
   const accelerationY = forceY
   ```

3. **速度更新阶段**

   ```typescript
   // 应用加速度
   particle.velocityX += accelerationX * deltaTime
   particle.velocityY += accelerationY * deltaTime

   // 应用阻力
   particle.velocityX *= dragCoefficient
   particle.velocityY *= dragCoefficient
   ```

4. **恢复力阶段**（仅在停止滚动时）

   ```typescript
   if (!isScrolling) {
     particle.velocityX += restoreAccelX * deltaTime
     particle.velocityY += restoreAccelY * deltaTime
   }
   ```

5. **速度限制**

   ```typescript
   const currentSpeed = Math.hypot(particle.velocityX, particle.velocityY)
   if (currentSpeed > maxInertiaVelocity) {
     const scale = maxInertiaVelocity / currentSpeed
     particle.velocityX *= scale
     particle.velocityY *= scale
   }
   ```

6. **位置更新**

   ```typescript
   const finalVelX = baseVelX + particle.velocityX
   const finalVelY = baseVelY + particle.velocityY

   particle.x += finalVelX
   particle.y += finalVelY
   ```
