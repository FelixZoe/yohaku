# SakuraBackground Rendering Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix confirmed rendering, projection, and lifecycle defects in `SakuraBackground.tsx` — notably particles projecting off-screen due to broken perspective, GPU resources leaking on unmount, animation loop restarting on every prop change, petals filling only ~42% of their instanced quad, and several dead-code/unused-uniform issues.

**Architecture:** Three-phase refactor on a single file. Phase 1 stabilizes the React lifecycle: a `propsRef` pattern removes closure-based restarts, a full `destroy()` cleanup releases GPU objects on unmount, and `rAF` timestamp drives `dt`. Phase 2 rewrites the projection model: particle `x/y` stored in world-space (pixel units at the reference depth), a tight z-range with a `baseZ` reference plane produces `scale ∈ [~0.77, ~1.25]` so near particles no longer fly off-screen, and `cameraZ` is removed. Phase 3 improves rendering quality (SDF scaled to fill the quad, depth sort, tilt used in fragment, WebGPU fallback) and cleans dead shader code (`hash21`, unused `colorParams`, uniform buffer size, color-channel clamp).

**Tech Stack:** React 19 (client component), WebGPU (WGSL), Next.js 16 App Router, TypeScript, Tailwind CSS.

**Spec source:** Derived from the 2026-04-20 review conversation; no separate design doc was produced because this is a targeted bug-fix refactor, not a feature spec.

**Testing note:** This component has no unit tests today and WebGPU shader output is not practically unit-testable in this repo. Verification for each task uses:

1. `pnpm --filter @yohaku/web lint` — TypeScript + ESLint on changed files only (per `CLAUDE.md` scope rule).
2. Manual visual inspection via `pnpm --filter @yohaku/web dev` at `http://localhost:2323` on any page that mounts `<SakuraBackground />` (search the codebase for usage; if none, add a temporary mount in `apps/web/src/app/page.tsx` and revert before final commit).
3. Chrome DevTools → Performance → WebGPU frame timing for regressions.

Standard TDD "write failing test first" steps are replaced with "write verification expectation first, confirm current behavior diverges, implement, re-verify". Commit after each phase.

---

## File Structure

- **Modify:** `apps/web/src/components/ui/background/SakuraBackground.tsx`

Single-file refactor. No new files. No new dependencies.

---

## Phase 1: Lifecycle & Closure Stabilization

Rationale: Without stable refs, every prop change (user drags a slider) tears down the animation loop and rebuilds callbacks. Without full cleanup, unmount leaks the GPU device, buffers, and MSAA texture. These are invisible in the happy path but drain memory in SPA navigation.

### Task 1: Add `propsRef` + sync effect

**Files:**
- Modify: `apps/web/src/components/ui/background/SakuraBackground.tsx` — add new ref and sync effect inside component body, before existing refs around line 454–472.

- [ ] **Step 1: Write the verification expectation**

Expectation: after this task, `propsRef.current` holds every runtime prop, updated synchronously on each render. `render()` and `updateParticles()` will be migrated to read from it in Task 2. Type check must stay green.

- [ ] **Step 2: Add the type and ref declaration**

Insert immediately after `export const SakuraBackground: FC<SakuraBackgroundProps> = ({ ... }) => {` destructuring block, before the first existing `useRef` (around line 454):

```tsx
type SakuraRuntimeProps = {
  windSpeed: number
  windDirection: number
  speed: number
  intensity: number
  volume: number
  weight: number
  focusDistance: number
  aperture: number
  petalLength: number
  petalWidth: number
  notchDepth: number
  flutter: number
}

const propsRef = useRef<SakuraRuntimeProps>({
  windSpeed,
  windDirection,
  speed,
  intensity,
  volume,
  weight,
  focusDistance,
  aperture,
  petalLength,
  petalWidth,
  notchDepth,
  flutter,
})

propsRef.current = {
  windSpeed,
  windDirection,
  speed,
  intensity,
  volume,
  weight,
  focusDistance,
  aperture,
  petalLength,
  petalWidth,
  notchDepth,
  flutter,
}
```

Note: `cameraZ` intentionally omitted — will be removed entirely in Phase 2 (Task 6). `density` stays as a `useMemo` dep for `particleCount` (discrete count changes, not a continuous animation value).

The direct assignment (not in `useEffect`) ensures the ref reads the current props within the same render pass, avoiding a one-frame stale read.

- [ ] **Step 3: Verify compile**

Run: `pnpm --filter @yohaku/web lint -- apps/web/src/components/ui/background/SakuraBackground.tsx`

Expected: PASS, no new errors or warnings. `SakuraRuntimeProps` may be reported as "declared but never used" — that is expected until Task 2 consumes it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "refactor(sakura): introduce propsRef pattern for runtime params"
```

---

### Task 2: Migrate `render` and `updateParticles` to read from `propsRef`

**Files:**
- Modify: `SakuraBackground.tsx` — `updateParticles` useCallback (lines 781–901) and `render` useCallback (lines 903–1051).

- [ ] **Step 1: Write the verification expectation**

Expectation: `useCallback` deps for `updateParticles` and `render` contain only truly static inputs (`dimensions.width`, `dimensions.height`, `respawn`, `particleCount`, `ensureMsaaTexture`, `ensureInstanceResources`). All prop-derived values come from `propsRef.current`. Dragging any runtime slider in dev must NOT cancel and restart the animation (verifiable via a temporary `console.log("animate")` once; should print at rAF rate continuously, not reset).

- [ ] **Step 2: Rewrite `updateParticles`**

Replace the entire `updateParticles = useCallback(() => { ... }, [...])` body. Read all prop-derived scalars from `propsRef.current` at function entry:

```tsx
const updateParticles = useCallback(() => {
  const now = Date.now()
  const dt = Math.min(
    0.05,
    Math.max(0.001, (now - lastTimeRef.current) / 1000),
  )
  lastTimeRef.current = now

  const time = now / 1000
  const {
    windSpeed,
    windDirection,
    speed,
    intensity,
    volume,
    weight,
    flutter,
  } = propsRef.current

  const w = dimensions.width
  const h = dimensions.height
  const halfW = w / 2
  const halfH = h / 2
  const intensityScale = Math.max(0, intensity)
  const volumeScale = Math.max(0, volume)
  const weightScale = Math.max(0, weight)
  const inertiaScale = 1 / Math.max(0.2, weightScale)
  const flutterScale = Math.max(0, flutter)
  const sizeBase = 8 * volumeScale
  const sizeRange = 28 * Math.max(0.001, volumeScale)

  const near = 0.35
  const far = 1.6

  const dirRad = (windDirection * 3.1415926) / 180
  const windDirX = Math.cos(dirRad)
  const windDirY = Math.sin(dirRad)

  const windNoise =
    Math.sin(time * 0.3) * 1.5 +
    Math.sin(time * 0.8) * 0.8 +
    Math.sin(time * 1.5) * 0.3
  const windMag = Math.max(0, 15 + windNoise) * windSpeed

  particlesRef.current.forEach((p) => {
    // ... body unchanged from lines 817–889 ...
  })
}, [dimensions.height, dimensions.width, respawn])
```

Keep the `particlesRef.current.forEach` body identical to the current lines 817–889. Remove `windDirection`, `intensity`, `windSpeed`, `speed`, `volume`, `weight`, `flutter` from the `useCallback` dependency array. Final deps: `[dimensions.height, dimensions.width, respawn]`.

- [ ] **Step 3: Rewrite `render`**

Apply the same pattern. Read from `propsRef.current`:

```tsx
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

  const {
    intensity,
    volume,
    focusDistance,
    aperture,
    petalLength,
    petalWidth,
    notchDepth,
  } = propsRef.current

  // ... rest of body unchanged from lines 931–1036 except: remove `cameraZ` reads
  //     (Task 6 will remove cameraZ entirely; for this task just reference propsRef
  //     for all prop-derived scalars in the body) ...
}, [
  dimensions.height,
  dimensions.width,
  ensureMsaaTexture,
  ensureInstanceResources,
  particleCount,
])
```

Remove `petalLength, petalWidth, notchDepth, cameraZ, focusDistance, intensity, aperture, volume` from the dependency array.

- [ ] **Step 4: Verify compile + runtime**

```bash
pnpm --filter @yohaku/web lint -- apps/web/src/components/ui/background/SakuraBackground.tsx
```

Expected: PASS.

Then start dev server: `pnpm --filter @yohaku/web dev`. In a page that mounts SakuraBackground, change `intensity` or `windSpeed` via React DevTools (or temporarily bind to a state slider). Visual effect updates smoothly without a hitch; animation does not reset. Type check green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "refactor(sakura): read runtime props via propsRef, stop rAF restart on prop change"
```

---

### Task 3: Stabilize `animate` and single-chain the rAF loop

**Files:**
- Modify: `SakuraBackground.tsx` — `animate` useCallback (lines 1053–1057) and setup effect (lines 1059–1117).

- [ ] **Step 1: Write the verification expectation**

Expectation: `animate` is defined with empty deps and reads `render`/`updateParticles` through refs. The setup effect only starts the rAF chain when `deviceRef.current` transitions to non-null; it does NOT restart on runtime prop changes, only on dimensions change. Particle-count changes are handled in a separate reconciliation effect that does not cancel the active rAF chain. rAF continues across prop changes and density changes.

- [ ] **Step 2: Add render/updateParticles refs**

Near the other refs (around line 470, before `particlesRef`):

```tsx
const renderRef = useRef<() => void>(() => {})
const updateParticlesRef = useRef<() => void>(() => {})
```

After `const render = useCallback(...)` and `const updateParticles = useCallback(...)` definitions, sync:

```tsx
renderRef.current = render
updateParticlesRef.current = updateParticles
```

- [ ] **Step 3: Rewrite `animate` to be stable**

Replace the current `animate` useCallback (lines 1053–1057) with:

```tsx
const animate = useCallback(() => {
  updateParticlesRef.current()
  renderRef.current()
  animationRef.current = requestAnimationFrame(animate)
}, [])
```

Empty deps. `animate` never changes identity.

- [ ] **Step 4: Split setup effect from particle-count sync**

Keep the setup `useEffect` responsible only for canvas sizing, device init/reconfigure, the first particle reconcile/allocation, and starting the loop. Replace the startup branch:

```tsx
if (!animationRef.current) {
  animate()
}
```

with:

```tsx
if (!animationRef.current) {
  animationRef.current = requestAnimationFrame(animate)
}
```

Then set the setup effect dependency array to exactly:

```tsx
}, [dimensions.height, dimensions.width])
```

Immediately below that setup effect, add a second effect dedicated to count changes:

```tsx
useEffect(() => {
  if (!deviceRef.current) return
  reconcileParticles()
  ensureInstanceResources(particleCount)
}, [particleCount, reconcileParticles, ensureInstanceResources])
```

Why this split is required: the setup effect cleanup cancels `animationRef.current`. If `particleCount` remains in that dependency list, density changes will still tear down and restart the loop. The second effect keeps count changes responsive without touching the running rAF chain.

- [ ] **Step 5: Verify**

```bash
pnpm --filter @yohaku/web lint -- apps/web/src/components/ui/background/SakuraBackground.tsx
```

Expected: PASS. ESLint `react-hooks/exhaustive-deps` may flag missing deps — suppress with `// eslint-disable-next-line react-hooks/exhaustive-deps` on the deps line with a short comment `// stable via refs`.

Dev server: resize the window → canvas re-configures once, animation continues. Drag an `intensity`/`windSpeed` slider → animation unaffected. Change `density` → particle count updates without the loop restarting.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "refactor(sakura): single-chain rAF via stable animate + render/updateParticles refs"
```

---

### Task 4: Full GPU cleanup on unmount

**Files:**
- Modify: `SakuraBackground.tsx` — the cleanup-only `useEffect` at lines 1119–1125.

- [ ] **Step 1: Write the verification expectation**

Expectation: on component unmount, all owned WebGPU objects (`GPUBuffer`s, `GPUTexture`, `GPUDevice`) are destroyed. Verified by mounting and unmounting the component 20+ times (e.g. navigating between two Next.js pages) and checking Chrome's Memory tab for no growing GPU adapter memory. Also, `device.destroy()` releases the pipeline and bind group automatically — no need to null those explicitly.

- [ ] **Step 2: Replace the cleanup effect**

Replace lines 1119–1125 entirely with:

```tsx
useEffect(
  () => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    msaaTextureRef.current?.destroy()
    msaaTextureRef.current = null
    instanceBufferRef.current?.destroy()
    instanceBufferRef.current = null
    quadBufferRef.current?.destroy()
    quadBufferRef.current = null
    uniformBufferRef.current?.destroy()
    uniformBufferRef.current = null
    deviceRef.current?.destroy()
    deviceRef.current = null
    contextRef.current = null
    pipelineRef.current = null
    bindGroupRef.current = null
    formatRef.current = null
    instanceDataRef.current = null
  },
  [],
)
```

Note: `context.unconfigure?.()` is not widely available; dropping the reference is sufficient — the browser GC releases the surface once the canvas unmounts.

- [ ] **Step 3: Verify**

Type check: `pnpm --filter @yohaku/web lint -- apps/web/src/components/ui/background/SakuraBackground.tsx`. PASS.

Visual: dev server, mount & unmount the component 10× (via React DevTools or temporary state toggle). No console errors. Chrome Task Manager → GPU process memory stays roughly flat.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "fix(sakura): destroy all WebGPU resources on unmount"
```

---

### Task 5: Use rAF timestamp for `dt`

**Files:**
- Modify: `SakuraBackground.tsx` — `animate` (now empty-deps after Task 3) and `updateParticles` (reads `lastTimeRef`).

- [ ] **Step 1: Write the verification expectation**

Expectation: `dt` computed from the high-resolution rAF timestamp, not `Date.now()`. Animation is frame-rate independent and immune to wall-clock jumps (DST, NTP).

- [ ] **Step 2: Thread timestamp through animate → updateParticles**

Introduce a ref for the latest timestamp:

```tsx
const lastRafTsRef = useRef<number>(0)
```

Remove `lastTimeRef` if no longer used (search the file — it appears in line 472 and line 1084). Keep it if still referenced by `initWebGPU`; otherwise delete. In `initWebGPU` at line 1083 (`lastTimeRef.current = Date.now()`), replace with `lastRafTsRef.current = 0` (0 signals "first frame, use dt=0").

Update `animate`:

```tsx
const animate = useCallback((ts: number) => {
  const last = lastRafTsRef.current
  const dt = last === 0 ? 0 : Math.min(0.05, Math.max(0, (ts - last) / 1000))
  lastRafTsRef.current = ts
  updateParticlesRef.current(dt, ts / 1000)
  renderRef.current(ts / 1000)
  animationRef.current = requestAnimationFrame(animate)
}, [])
```

Important: after this signature change, `animate` must never be invoked directly. The startup path from Task 3 must remain:

```tsx
if (!animationRef.current) {
  animationRef.current = requestAnimationFrame(animate)
}
```

Do a final search in `SakuraBackground.tsx` for `animate()` and remove any remaining direct calls.

Update `updateParticles` signature:

```tsx
const updateParticles = useCallback((dt: number, time: number) => {
  // remove the `const now = Date.now()` and the internal `const dt = ...` and `time` calc
  // use incoming dt and time directly
  // ... rest unchanged
}, [dimensions.height, dimensions.width, respawn])
```

Update `render`:

```tsx
const render = useCallback((time: number) => {
  // ...
  uniformData[2] = time
  // ...
}, [/* unchanged */])
```

Update the ref types accordingly:

```tsx
const renderRef = useRef<(time: number) => void>(() => {})
const updateParticlesRef = useRef<(dt: number, time: number) => void>(() => {})
```

- [ ] **Step 3: Verify**

Type check passes. Dev server: animation smooth, no visible regression.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "refactor(sakura): drive dt from rAF timestamp instead of Date.now"
```

---

## Phase 2: Projection Model Rewrite

Rationale: The current projection multiplies particle `x` (already in screen pixels) by `scale = 1 / viewZ` (up to ~4× for near particles with default `cameraZ=0.1`), sending near petals flying off-screen. This task tightens the z-range, removes `cameraZ` as a position-projection parameter, and establishes a `baseZ` reference plane where `scale === 1`.

### Task 6: Remove `cameraZ` prop, add `baseZ` constant, tighten z-range

**Files:**
- Modify: `SakuraBackground.tsx` — props typedef (lines 358–436), destructure (line 446), `respawn` (lines 687–726), `updateParticles` near/far locals, `render` projection math.

- [ ] **Step 1: Write the verification expectation**

Expectation: after this task, `scale ∈ [~0.77, ~1.25]` for any particle (verifiable via temporary `console.log(Math.max(...particles.map(p => 1/p.z)))`). Near petals stay within screen bounds. `cameraZ` is no longer a component prop. Z-range in respawn: `[0.8, 1.3]`.

- [ ] **Step 2: Remove `cameraZ` from `SakuraBackgroundProps` and destructure**

Delete the `cameraZ?: number` prop entry from `SakuraBackgroundProps` (lines 402–405) and remove `cameraZ = 0.1,` from the destructure at line 446. Search the file for `cameraZ` — replace all remaining usages per steps below.

- [ ] **Step 3: Update z-range constants**

In `respawn` (around lines 692–693), replace:

```tsx
const near = 0.35
const far = 1.6
```

with:

```tsx
const near = 0.8
const far = 1.3
```

In `updateParticles` (around lines 803–804), make the same change.

Add a module-level constant near the other motion constants (near line 350):

```tsx
const BASE_Z = 1.0
```

- [ ] **Step 4: Rewrite projection in `render`**

In `render`, around lines 944–948, replace the `nearZ`/`farZ`/`apertureScale` block:

```tsx
const nearZ = near - cameraZ
const farZ = far - cameraZ
const focusZ = focusDistance
const farRange = Math.max(0.001, farZ - focusZ)
const apertureScale = 0.4 + aperture * 1.2
```

with:

```tsx
const apertureScale = 0.4 + aperture * 1.2
const farRange = Math.max(0.001, far - focusDistance)
```

Then in the per-particle loop (lines 950–979), replace:

```tsx
const viewZ = p.z - cameraZ
const scale = 1 / viewZ
const px = p.x * scale + halfW
const py = p.y * scale + halfH

const zNorm = (viewZ - nearZ) / (farZ - nearZ)
const depthFactor = 1 - zNorm

const perspectiveSize = p.baseSize * volumeScale * scale
const size = Math.max(4, Math.min(45, perspectiveSize))

const blur = Math.min(
  1,
  Math.max(0, ((viewZ - focusZ) / farRange) * apertureScale),
)
```

with:

```tsx
const scale = BASE_Z / p.z
const px = halfW + p.x * scale
const py = halfH + p.y * scale

const zNorm = (p.z - near) / (far - near)
const depthFactor = 1 - zNorm

const perspectiveSize = p.baseSize * volumeScale * scale
const size = Math.max(2, Math.min(80, perspectiveSize))

const blur = Math.min(
  1,
  Math.max(0, ((p.z - focusDistance) / farRange) * apertureScale),
)
```

Size clamp widened from `[4, 45]` to `[2, 80]` so the slight remaining parallax range does not get hard-clipped.

- [ ] **Step 5: Update `updateParticles` viewing math**

In `updateParticles`, around lines 818–819, the existing `const zNorm = (p.z - near) / (far - near)` already matches the new formula — no change needed beyond the `near`/`far` constant update from Step 3.

- [ ] **Step 6: Reconcile `respawn` size/opacity scaling**

In `respawn` (lines 710–712), the size/opacity rely on `zNorm`. Update to match new range — no code change needed if the formula uses the new `near`/`far` locals (it does, see lines 708). Sanity check: `p.z ∈ [0.8, 1.3]` → `zNorm ∈ [0, 1]` → `baseSize ∈ [8, 36]`, `opacity ∈ [0.35, 0.95]`. OK.

- [ ] **Step 7: Update default `focusDistance`**

Default `focusDistance = 0.75` was tuned for the old range. Change default at line 447 from `focusDistance = 0.75,` to `focusDistance = 1.05,` (slightly beyond `BASE_Z` so mid-range particles stay in focus, far ones blur).

- [ ] **Step 8: Verify**

Type check green. Dev server: particles stay within screen. Temporary debug:

```tsx
// near top of render, for one frame only
if ((window as any).__sakuraDebug) {
  console.log('scale range', {
    min: Math.min(...particles.map((p) => BASE_Z / p.z)),
    max: Math.max(...particles.map((p) => BASE_Z / p.z)),
  })
}
```

Trigger once with `window.__sakuraDebug = true; setTimeout(()=>window.__sakuraDebug=false, 50)` — expected output: `min ≈ 0.77, max ≈ 1.25`. Remove the debug block before commit.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "fix(sakura): rewrite projection to world-space baseZ, remove cameraZ prop"
```

---

### Task 7: Scale SDF to fill the instanced quad

**Files:**
- Modify: `SakuraBackground.tsx` — shader `petalSDF` default coefficients or the `q` coordinate scaling at lines 98–101.

- [ ] **Step 1: Write the verification expectation**

Expectation: after this task, a rendered petal occupies ~90% of its quad height, not ~42%. Visually verifiable by temporarily setting shader to also output the quad boundary (skip — just eyeball the bounding box after the fix).

Current math: `q.y = p.y / petalLength + 0.05`, petal SDF extends to `q.y ∈ [-0.52, 0.42]`, so in `p` space `p.y ∈ [-0.26, 0.19]` (assuming `petalLength = 0.45`). Quad is `[-0.5, 0.5]`. To fill the quad, `p.y` needs to cover about `[-0.45, 0.45]` → `petalLength ≈ 0.9` and recenter shift from `0.05` to `0.0`.

- [ ] **Step 2: Shift defaults and recentering**

Change the component-prop default at line 449:

```tsx
petalLength = 0.45,
petalWidth = 0.35,
```

to:

```tsx
petalLength = 0.88,
petalWidth = 0.70,
```

In the shader `petalSDF`, around line 101, the `q.y = q.y + 0.05` shift offsets the petal. With the new `petalLength`, that shift becomes a smaller fraction of the petal — still fine. Keep it.

Widen the top/bottom caps so the SDF does not clip inside the quad. Around shader lines 163–166, replace:

```wgsl
let topCap = q.y - (0.47 + k1 * 0.015);
let bottomCap = -0.52 - q.y;
```

with (no change; caps were in `q` space and `q` is normalized by `petalLength`/`petalWidth`, so the same relative caps still apply):

_(No change needed here. The caps live in normalized `q` space, so enlarging `petalLength` in `p` space does not shift them.)_

- [ ] **Step 3: Verify size multiplier still reasonable**

In `respawn` (line 711): `p.baseSize = 8 + (1 - zNorm) * 18 + Math.random() * 10`. Range `[8, 36]` px. With the new SDF filling the quad, this is now the actual rendered petal size. Good.

- [ ] **Step 4: Visual verify**

Dev server: petals visibly larger than before (roughly 2.1× taller). Take a screenshot and compare qualitatively. If petals now look too big, scale `p.baseSize` down in `respawn` — change `8 + (1 - zNorm) * 18 + Math.random() * 10` to `6 + (1 - zNorm) * 10 + Math.random() * 6` (range `[6, 22]`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "fix(sakura): enlarge default petalLength/petalWidth so SDF fills the quad"
```

---

### Task 8: Add z-depth sort before instance data fill

**Files:**
- Modify: `SakuraBackground.tsx` — `render`, before the per-particle `for` loop around line 950.

- [ ] **Step 1: Write the verification expectation**

Expectation: instance data is filled in far-to-near order, so premultiplied alpha blending is order-correct. Near petals paint on top of far ones.

- [ ] **Step 2: Sort before fill**

Immediately before the `for (let i = 0; i < drawCount; i += 1)` loop, insert:

```tsx
particles.sort((a, b) => b.z - a.z)
```

(Sort mutates `particles` in place. `particlesRef.current` is the same array reference. 300 items × JS comparator ≈ negligible.)

- [ ] **Step 3: Verify**

Type check green. Dev server: subtle visual improvement on overlapping semi-transparent petals — no missed blending halos. Hard to eyeball unless focused; trust the math.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "fix(sakura): depth-sort particles back-to-front for correct alpha blending"
```

---

## Phase 3: Rendering Quality & Shader Cleanup

### Task 9: Use `tilt` in fragment shader for shading

**Files:**
- Modify: `SakuraBackground.tsx` — shader `fsMain` body (lines 239–319).

- [ ] **Step 1: Write the verification expectation**

Expectation: `input.tilt` is consumed in `fsMain`. Tilted petals (as seen from a steep angle) receive a subtle darker shading on one side, giving a cheap 3D hint. Visually petals should breathe/flicker as their tilt rotates, not just squish horizontally.

- [ ] **Step 2: Add tilt-based shading term**

In `fsMain`, before the final `alpha = min(1.0, alpha * 1.15);` line (around line 315), insert:

```wgsl
  // Tilt-driven shading: one edge dims when petal is seen edge-on
  let tiltCos = cos(input.tilt);
  let tiltDir = sign(tiltCos);
  let edgeShade = 1.0 - abs(p.x) * (1.0 - abs(tiltCos)) * 0.6;
  let sideLight = 0.5 + 0.5 * tiltDir * sign(p.x);
  color = color * mix(edgeShade, 1.0, sideLight * 0.7);
```

This darkens the edge that is turning away (when `tiltCos` approaches 0, meaning the petal is edge-on), while keeping the front-facing side at full brightness. Cheap and directional.

- [ ] **Step 3: Verify**

Dev server: petals now appear to have subtle light/dark variation as they rotate in 3D. Take a before/after short video if possible — compare.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "feat(sakura): consume tilt in fragment for directional petal shading"
```

---

### Task 10: WebGPU fallback — render a static CSS background

**Files:**
- Modify: `SakuraBackground.tsx` — component return (lines 1127–1132) and add a fallback state.

- [ ] **Step 1: Write the verification expectation**

Expectation: on browsers without WebGPU (Safari 17, older Firefox), or when WebGPU initialization fails later during shader compilation / pipeline creation, the component renders a subtle static gradient instead of a blank canvas. No JS errors, and no partially initialized GPU state remains live after the fallback path is taken.

- [ ] **Step 2: Add fallback state**

Near the other `useState` call (around line 474), add:

```tsx
const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null)
```

In `initWebGPU` (lines 492–637), add a local failure helper near the top, after the `canvas` null check:

```tsx
const failWebGPU = (destroyDevice = false) => {
  unsupportedRef.current = true
  setWebgpuAvailable(false)
  msaaTextureRef.current?.destroy()
  msaaTextureRef.current = null
  instanceBufferRef.current?.destroy()
  instanceBufferRef.current = null
  quadBufferRef.current?.destroy()
  quadBufferRef.current = null
  uniformBufferRef.current?.destroy()
  uniformBufferRef.current = null
  contextRef.current?.unconfigure?.()
  if (destroyDevice) {
    deviceRef.current?.destroy()
  }
  deviceRef.current = null
  contextRef.current = null
  pipelineRef.current = null
  bindGroupRef.current = null
  formatRef.current = null
  instanceDataRef.current = null
}
```

Then replace every `return false` unsupported path with the helper:

- No `navigator.gpu` → `failWebGPU()`
- No `canvas.getContext('webgpu')` → `failWebGPU()`
- No adapter from `requestAdapter()` → `failWebGPU()`
- Shader compilation errors after `createShaderModule()` → `failWebGPU(true)`
- Pipeline creation failure after both 4x and 1x attempts → `failWebGPU(true)`

The last two branches are important because by that point a device/context may already exist; merely setting state is insufficient. At the very end of `initWebGPU` (just before `return true` at line 637), add `setWebgpuAvailable(true)`.

- [ ] **Step 3: Render fallback when unsupported**

Replace the component `return` (lines 1127–1132):

```tsx
return (
  <canvas
    className="pointer-events-none fixed inset-0 z-0 size-full"
    ref={canvasRef}
  />
)
```

with:

```tsx
if (webgpuAvailable === false) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(250,220,230,0.35),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(200,120,150,0.15),_transparent_60%)]"
    />
  )
}

return (
  <canvas
    className="pointer-events-none fixed inset-0 z-0 size-full"
    ref={canvasRef}
  />
)
```

- [ ] **Step 4: Verify**

Type check passes. Chrome DevTools → enable "disable WebGPU" via `chrome://flags` OR temporarily short-circuit `initWebGPU` to return false — fallback div appears with a soft pink wash. No console errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "feat(sakura): render CSS fallback gradient when WebGPU unavailable"
```

---

### Task 11: Shrink uniform buffer, remove unused `colorParams`, pass real time

**Files:**
- Modify: `SakuraBackground.tsx` — shader `Uniforms` struct (lines 20–24), `UNIFORM_FLOATS` constant (line 345), uniform writes in `render` (lines 987–1001).

- [ ] **Step 1: Write the verification expectation**

Expectation: uniform buffer size drops from 64 bytes to 32 bytes (8 floats). Shader `Uniforms` has no unused `colorParams` field. Time is now a live uniform and usable inside shaders.

- [ ] **Step 2: Shrink shader `Uniforms`**

Replace shader lines 20–24:

```wgsl
struct Uniforms {
  resolutionTime: vec4<f32>,
  petalParams: vec4<f32>,
  colorParams: vec4<f32>,
};
```

with:

```wgsl
struct Uniforms {
  resolutionTime: vec4<f32>,
  petalParams: vec4<f32>,
};
```

- [ ] **Step 3: Update `UNIFORM_FLOATS`**

Line 345, change:

```tsx
const UNIFORM_FLOATS = 16
```

to:

```tsx
const UNIFORM_FLOATS = 8
```

- [ ] **Step 4: Remove unused uniform writes**

In `render` (lines 987–1001), replace:

```tsx
const uniformData = uniformDataRef.current
uniformData[0] = w
uniformData[1] = h
uniformData[2] = Date.now() / 1000
uniformData[3] = 0
// Petal params
uniformData[4] = petalLength
uniformData[5] = petalWidth
uniformData[6] = notchDepth
uniformData[7] = 0
// Color params (reserved)
uniformData[8] = 0
uniformData[9] = 0
uniformData[10] = 0
uniformData[11] = 0
```

with:

```tsx
const uniformData = uniformDataRef.current
uniformData[0] = w
uniformData[1] = h
uniformData[2] = time
uniformData[3] = 0
uniformData[4] = petalLength
uniformData[5] = petalWidth
uniformData[6] = notchDepth
uniformData[7] = 0
```

(Recall `time` is now the `render(time)` parameter from Task 5.)

- [ ] **Step 5: Verify**

Type check: PASS. Dev server: visual unchanged (time uniform is written but no shader code consumes it yet — that is fine; downstream shader work can use `uniforms.resolutionTime.z`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "refactor(sakura): drop unused colorParams, shrink uniform buffer to 32 bytes"
```

---

### Task 12: Remove `hash21` dead code and clamp negative color channels

**Files:**
- Modify: `SakuraBackground.tsx` — shader `hash21` function (lines 58–61) and `fsMain` output (lines 317–318).

- [ ] **Step 1: Write the verification expectation**

Expectation: `hash21` deleted. Final `color` clamped to `>= 0` before premultiplying, preventing negative channels from bleeding into neighboring pixels during alpha blending.

- [ ] **Step 2: Delete `hash21`**

Remove shader lines 58–61:

```wgsl
fn hash21(p: vec2<f32>) -> f32 {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}
```

Verify with a text search inside `shaderSource` that `hash21` is no longer referenced (it was never called).

- [ ] **Step 3: Clamp color before premultiply**

In `fsMain`, immediately before the `let premul = color * alpha;` line (around line 317), insert:

```wgsl
  color = max(color, vec3<f32>(0.0));
```

- [ ] **Step 4: Verify**

Type check (which compiles shader source at runtime, not build time, so a visual-only verification). Dev server: no warnings in DevTools console about color out-of-range. Petals look identical in common cases; edge cases with warm tint no longer show neighboring-pixel darkening artifacts.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/background/SakuraBackground.tsx
git commit -m "refactor(sakura): drop dead hash21, clamp color to non-negative before premul"
```

---

## Self-Review Checklist

After all tasks complete, before opening a PR:

1. **Spec coverage:** Every issue confirmed true in the 2026-04-20 review has a task. Verified:
   - 其一 / 四 (projection off-screen) → Task 6
   - 其二 (tilt unused in fragment) → Task 9
   - 其三 (GPU leak on unmount) → Task 4
   - 一 (no depth sort) → Task 8
   - 二 (rAF restart on prop change) → Tasks 1–3
   - 三 (Date.now for dt) → Task 5
   - 2 (instanceBuffer not destroyed) → Task 4 (covered by full cleanup)
   - 4 (no WebGPU fallback) → Task 10
   - 5 (uniform buffer redundant) → Task 11
   - 6 (hash21 dead code) → Task 12
   - Petal fills only 42% of quad → Task 7
   - Color channels can go negative → Task 12
   - time uniform unused → Task 11
2. **Placeholder scan:** No "TBD", "TODO", "similar to", "handle edge cases". All code blocks contain concrete source.
3. **Type consistency:** `SakuraRuntimeProps` shape in Task 1 matches what Task 2 destructures. `BASE_Z` constant defined in Task 6 used consistently. `render`/`updateParticles` signatures updated in Task 5 match the refs in Task 3.
4. **Intentionally not in this plan:**
   - Flutter vs angular-velocity decoupling: low impact; skip.
   - Velocity-inertia accumulation: would change motion feel, scope creep; skip.
   - MSAA-aware `fwidth`: low priority polish; skip.

---

## Execution Handoff

Recommended: **Subagent-Driven**. Each task is independent and small (2–8 min), reviewable in isolation, and the changes are scoped to a single file.

Phase commits are already built into each task — no extra `git` orchestration needed.

Before starting: confirm the working directory is clean (`git status`), `pnpm install` is up-to-date, and dev server runs locally.
