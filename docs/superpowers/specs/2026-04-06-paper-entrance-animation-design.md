# Paper 飘落入场动画设计

> 日期: 2026-04-06
> 状态: approved

## 概述

为 `Paper` 组件（`apps/web/src/components/layout/container/Paper.tsx`）设计一个飘落入场动画。Paper 模拟的是平放在桌面上的手工纸（deckle edge 毛边 + contact shadow 接触阴影），动画表达一张纸从空中飘落到桌面的物理过程。

## 使用场景


| 场景                                    | 当前外层动画                                                    | Paper 自身 |
| ------------------------------------- | --------------------------------------------------------- | -------- |
| Note 详情页                              | `Transition`：`y: 80→0` + opacity, snappy spring           | 无（本次新增）  |
| Peek Modal（NotePreview / PostPreview） | PeekModal 容器 `y: 50→0` + `BottomToUpSmoothTransitionView` | 无（本次新增）  |


新增的 Paper 入场动画需要与外层的 Transition 配合，不冲突。外层控制整体区块的页面级入场，Paper 自身的飘落是更细腻的局部物理效果。

## 物理模型

纸张从极近距离（15px）飘落到桌面，受空气影响带轻微左右摆动和旋转，摆动随接近桌面指数衰减。同时伴随景深模糊收敛和阴影从悬浮态过渡到接触态。

### 确定参数


| 参数         | 值     | 含义                   |
| ---------- | ----- | -------------------- |
| `startY`   | 15px  | 起始偏移，纸从 15px 高处飘下    |
| `duration` | 800ms | 动画总时长                |
| `swayAmp`  | 2.5px | 左右摆动幅度               |
| `swayFreq` | 3Hz   | 摆动频率                 |
| `rotAmp`   | 1.5°  | 旋转幅度（跟随摆动，带 0.5 相位差） |
| `blurMax`  | 0.9px | 起始最大模糊（景深效果）         |
| `opStart`  | 0.8   | 起始透明度                |
| `damping`  | 6.1   | 摆动阻尼系数，控制衰减速度        |


### 物理公式

```
t = elapsed / duration              // 归一化时间 [0, 1]
eased = 1 - (1 - t)³               // cubic ease-out，下落曲线

y = startY * (1 - eased)           // 垂直位移
decay = e^(-damping * t)            // 摆动指数衰减
swayX = swayAmp * sin(elapsed * swayFreq * 2π) * decay
rotation = rotAmp * sin(elapsed * swayFreq * 2π + 0.5) * decay

blur = blurMax * (1 - eased)²      // 模糊随落地二次衰减
opacity = opStart + (1 - opStart) * eased
shadow = f(eased)                   // 阴影从悬浮态连续过渡到接触态
```

### 阴影过渡

起始（空中）：散布大、偏移高、透明度低——纸离桌面有间距。
结束（桌面）：散布小、偏移低、透明度适中——`shadow-paper-contact` 接触阴影。

阴影是 `eased` 的连续函数，不是离散切换。

## 实现方案

### 方式：requestAnimationFrame + ref style

不使用 CSS `@keyframes`（关键帧断点导致机械感），不使用 Motion API（物理公式自定义度更高），用原生 rAF 逐帧计算：

1. 创建 `usePaperEntrance` hook，接受一个 `RefObject<HTMLElement>`，内部用 `requestAnimationFrame` 逐帧驱动
2. 每帧根据物理公式计算 `transform`、`opacity`、`filter`、`boxShadow`，直接写 `ref.current.style`
3. 不触发 React 重渲染，纯 DOM 操作
4. 支持 `prefers-reduced-motion`：退化为简单的 opacity 0.8→1 过渡（300ms，CSS transition）
5. Hook 返回 `replay()` 方法，供调试或特殊场景使用

### 组件改造

Paper 保持 server component 不变。动画通过使用方注入：

- 新增 `PaperWithEntrance` client component wrapper，内部使用 `usePaperEntrance` hook + ref
- Note 详情页和 Peek Modal 中将 `<Paper>` 替换为 `<PaperWithEntrance>`
- `PaperWithEntrance` 渲染 `<Paper>` 并将 ref 绑定到最外层容器，hook 在挂载时自动播放

动画应用在 Paper 的**最外层容器**上，让整张纸（包括背景和内容）作为一个整体飘落。blur 从 0.9px 在 800ms 内收敛到 0，因为幅度极小且衰减快，内容可读性不受影响。

### 触发时机

- 组件挂载时自动播放一次
- 通过 `lcpOptimization` 机制：首次 hydration 时跳过动画（与现有 `isHydrationEnded` 逻辑对齐），避免影响 LCP
- Peek Modal 场景：数据加载完成后 Paper 挂载时播放

### 与外层 Transition 的关系

Note 详情页的外层 `Transition`（y: 80→0, snappy spring）控制整体区块的页面级位移。Paper 飘落动画是叠加在其上的局部效果。两者的 Y 方向位移会叠加，但 Paper 的 15px 相对于外层的 80px 很小，视觉上是外层带着 Paper 整体上移的过程中，Paper 自身有一个额外的微妙飘落质感。

Peek Modal 场景中外层已有 `BottomToUpSmoothTransitionView`，同理叠加即可。

## prefers-reduced-motion

当用户开启减少动画时，跳过物理模拟，只保留 300ms 的 opacity 0.8→1 过渡。

## 移动端

移动端保留动画但去掉 blur（`filter: blur` 在移动端性能开销大），只保留 Y 位移 + opacity + 阴影变化。摆动和旋转幅度减半。

## 文件变更清单


| 文件                                                               | 变更                            |
| ---------------------------------------------------------------- | ----------------------------- |
| `apps/web/src/components/layout/container/Paper.tsx`             | 不变，保持 server component        |
| `apps/web/src/components/layout/container/PaperWithEntrance.tsx` | 新建 client component wrapper   |
| `apps/web/src/components/layout/container/usePaperEntrance.ts`   | 新建 hook，封装物理模拟                |
| `apps/web/src/components/layout/container/paper-entrance.ts`     | 新建，物理参数常量和计算函数                |
| `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx`  | `Paper` → `PaperWithEntrance` |
| `apps/web/src/components/modules/peek/NotePreview.tsx`           | `Paper` → `PaperWithEntrance` |
| `apps/web/src/components/modules/peek/PostPreview.tsx`           | `Paper` → `PaperWithEntrance` |


