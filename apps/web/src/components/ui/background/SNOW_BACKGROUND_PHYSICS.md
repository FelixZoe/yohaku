# SnowBackground 物理效果文档

## 概述

`SnowBackground` 使用 CPU 进行粒子物理模拟，GPU 负责渲染雪花形状与景深模糊。本文档只聚焦“物理效果”部分（运动、力、重生、分布、速度约束等）。

对应实现文件：`src/components/ui/background/SnowBackground.tsx`

## 坐标与深度模型

- **世界坐标**：以屏幕中心为原点，`x/y` 以像素为单位。
- **深度 z**：`z` 在近远平面之间随机取值（`near = 0.35`, `far = 1.8`）。
- **伪 3D 投影**：屏幕坐标由 `scale = 1 / (z - cameraZ)` 缩放得到，产生视差与近大远小效果。

## 粒子属性

每个粒子包含：

- `x, y, z`：位置与深度。
- `vx, vy`：速度。
- `baseSize`：基础尺寸，和深度相关。
- `opacity`：基础透明度，和深度相关。
- `rotation, angularVelocity`：自旋（视觉运动）。

## 物理力与速度模型

### 1) 重力 / 终端速度

- 终端速度与深度相关，近处更快、远处更慢：

```ts
terminalVelocity =
  (40 + depthFactor * 80) * speed * intensityScale * dragScale * weightScale
```

- `depthFactor = 1 - zNorm`，近处取值更大。
- `speed` 为全局速度倍率。
- `intensity` 会同时影响速度与透明度。

### 2) 风

- 风向由 `windDirection`（角度）确定，风速由 `windSpeed` 控制：

```ts
windMag = max(0, 20 + windNoise) * windSpeed
windEffect = windMag * (0.6 + depthFactor * 0.8) * dragScale * inertiaScale
vx = windEffect * windDirX + turbX
vy = windEffect * windDirY + terminalVelocity + turbY
```

- `windNoise` 使用低频正弦叠加，保证“持续但平稳”的风力变化。
- 深度越近，风的影响越明显（视差）。

### 3) 湍流 / 轻微摆动

- 通过时间和粒子 seed 产生横向和纵向扰动：

```ts
turbScale = (10 + depthFactor * 15) * dragScale * sizeDisturbance * inertiaScale

// x: 更明显的左右摇摆
// y: 垂直扰动被刻意压低
```

- 垂直湍流较小，避免“上升/悬浮感”。

### 4) 空气阻力（体积越大阻力越大）

- 基于粒子大小计算阻力比例：

```ts
scaledSize = baseSize * volumeScale
sizeNorm =
  clamp((scaledSize - 4 * volumeScale) / (18 * max(0.001, volumeScale)), 0, 1)
drag = BASE_DRAG + sizeNorm * SIZE_DRAG

// 统一缩放风、重力、湍流的效果
// 体积越大 -> drag 越高 -> 速度越小

dragScale = 1 / (1 + drag * DRAG_SCALE)
```

- 大雪花：更“粘”空气，速度更慢、横向摆动更小。

### 5) 重量 / 惯性

- `weight` 控制雪花的重量/惯性：

```ts
weightScale = max(0, weight)
inertiaScale = 1 / max(0.2, weightScale)
```

- 结果：
  - **更重**：下落更快、对风和湍流不敏感。
  - **更轻**：下落更慢、横向摆动更明显。

### 6) 尺寸扰动（大小带来的摆动差异）

- 基于大小引入额外扰动系数：

```ts
sizeDisturbance = 1 + (0.5 - sizeNorm) * SIZE_DISTURBANCE
```

- 越小的雪花更容易被扰动，越大的雪花更稳定。

### 7) 最小下落速度（防止反重力）

```ts
minFallSpeed = 15 * speed * intensityScale * dragScale * weightScale
if (vy < minFallSpeed) vy = minFallSpeed
```

- 防止风或湍流导致雪花“倒飞/悬停”。

## 运动积分

- 每帧根据 `dt` 积分：

```ts
x += vx * dt
y += vy * dt
rotation += angularVelocity * dt
```

- `dt` 被限制在 `[0.001, 0.05]`，避免页面切换导致的速度爆炸。

## 边界与重生

- **底部重生**：`y > halfH + 100` 时从顶部重生。
- **水平环绕**：超出左右边界后在另一侧出现。

## 初始生成策略

- 初始创建时，粒子统一从“屏幕顶部上方的一个范围”生成，形成自然的持续降雪：

```ts
initialTop = -height / 2 - 80
spawnY = initialTop - random(0, initialSpawnRange + 120)
```

- 这样不会出现“全屏瞬间有雪”的不自然现象，也避免“首波雪花过后出现断层”。

## 相关参数说明（物理相关）

- `windSpeed`：风速倍率。
- `windDirection`：风向（角度，度）。
- `speed`：整体下落速度倍率。
- `intensity`：强度倍率（同时影响速度与透明度）。
- `density`：粒子数量倍率（影响拥挤程度）。
- `volume`：体积倍率（影响尺寸与空气阻力）。
- `weight`：重量倍率（影响下落速度与惯性）。
- `cameraZ`：影响视差与投影比例。
- `focusDistance` / `aperture`：景深模糊（视觉效果，不改变物理运动）。

## 物理效果总览

- 深度视差：近处更快、更大；远处更慢、更小。
- 终端速度：随深度与强度变化。
- 风：具有方向性与低频变化。
- 湍流：轻微随机摆动，纵向扰动被压低。
- 空气阻力：体积越大阻力越强。
- 重量/惯性：越重越不受风与湍流影响。
- 尺寸扰动：小雪花更容易被扰动。
- 最小下落速度：避免反重力。
- 合理初始生成与边界重生：保证持续、自然的降雪节奏。
