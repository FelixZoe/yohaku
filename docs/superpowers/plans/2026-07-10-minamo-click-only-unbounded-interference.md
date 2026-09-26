# Minamo Click-Only Unbounded Interference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Minamo's automatic and six-slot ripple paths with click-only, circular, randomly varied wave packets whose complete 3.5-second active set is accumulated into a signed height field and rendered through slope-based refraction and specular lighting.

**Architecture:** Keep a dynamic CPU list of unexpired click events. Process the complete list in fixed-size GPU batches through ping-pong offscreen textures, then sample the signed height field once in the final Minamo pass. Prefer half-float accumulation and fall back to biased RGBA8 encoding; derive click visibility from the field gradient rather than the original positive-height squared fill.

**Tech Stack:** React 19, TypeScript, Vitest, WebGL 1/2, GLSL ES 1.00, Next.js 16

## Global Constraints

- Use the original Minamo implementation restored by `f3220315` as the production baseline.
- Remove every automatically scheduled circular ripple.
- Keep moving caustics, sparkle, koi shadow, hue drift, vignette, seasonal selection, and `density`-controlled sparkle.
- Click lifetime remains exactly `3.5` seconds.
- Never truncate, overwrite, or omit an unexpired click event.
- Fixed GPU batch size is allowed; fixed total event capacity is not.
- Click centers remain exact and wavefronts remain circular.
- Wavelength scale is `0.94–1.06`; amplitude scale is `0.90–1.10`; phase offset is `-0.08π–0.08π`; speed scale remains approximately `0.93–1.07` and is correlated with wavelength.
- Random parameters are generated once per click and remain stable for the event lifetime.
- Accumulate signed wave height and derive refraction/specular from its gradient.
- Do not feed click height into `max(height, 0)^2` or paint a direct click ring.
- Preserve WebGL 1 and WebGL 2 paths.
- Use `rtk` / `rtk proxy` for every shell command.

---

## File Structure

- Create `apps/web/src/components/ui/background/MinamoBackground.interaction.ts`
  - click-event type and 3.5-second lifetime;
  - deterministic per-click parameter generation;
  - active-event pruning;
  - complete fixed-size batch packing without truncation.
- Create `apps/web/src/components/ui/background/MinamoBackground.interaction.test.ts`
  - behavior tests for parameter bounds, determinism, expiry, coordinate conversion, and more-than-six batching.
- Modify `apps/web/src/components/ui/background/MinamoBackground.shader.ts`
  - remove automatic ripple generation;
  - add signed-height accumulation fragment source;
  - replace click crest filling with height-gradient refraction and specular lighting.
- Modify `apps/web/src/components/ui/background/MinamoBackground.tsx`
  - replace the six-slot ring buffer with a dynamic list;
  - allocate half-float/RGBA8 ping-pong field targets;
  - execute every active batch and compose the final water pass;
  - clean up all new WebGL resources.

### Task 1: Define the Unbounded Click-Event Contract

**Files:**

- Create: `apps/web/src/components/ui/background/MinamoBackground.interaction.ts`
- Create: `apps/web/src/components/ui/background/MinamoBackground.interaction.test.ts`

**Interfaces:**

- Produces:
  - `MINAMO_CLICK_RIPPLE_DURATION = 3.5`
  - `MINAMO_CLICK_BATCH_SIZE = 6`
  - `MinamoClickRipple`
  - `createMinamoClickRipple(args): MinamoClickRipple`
  - `retainActiveMinamoClickRipples(ripples, eventTime): MinamoClickRipple[]`
  - `getMinamoClickBatchCount(count): number`
  - `fillMinamoClickBatch(args): number`
- Consumed by `MinamoBackground.tsx` in Task 3.

- [ ] **Step 1: Write failing behavior tests**

Create `MinamoBackground.interaction.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  createMinamoClickRipple,
  fillMinamoClickBatch,
  getMinamoClickBatchCount,
  MINAMO_CLICK_BATCH_SIZE,
  retainActiveMinamoClickRipples,
} from './MinamoBackground.interaction'

describe('createMinamoClickRipple', () => {
  it('is deterministic and preserves the exact circular center', () => {
    const args = { clientX: 123, clientY: 456, start: 1.25, seed: 42 }
    const first = createMinamoClickRipple(args)
    const second = createMinamoClickRipple(args)

    expect(first).toEqual(second)
    expect(first.clientX).toBe(123)
    expect(first.clientY).toBe(456)
    expect(first.start).toBe(1.25)
  })

  it('keeps all stable parameters inside the approved ranges', () => {
    for (let seed = 0; seed < 256; seed++) {
      const ripple = createMinamoClickRipple({
        clientX: 0,
        clientY: 0,
        start: 0,
        seed,
      })

      expect(ripple.wavelengthScale).toBeGreaterThanOrEqual(0.94)
      expect(ripple.wavelengthScale).toBeLessThanOrEqual(1.06)
      expect(ripple.amplitudeScale).toBeGreaterThanOrEqual(0.9)
      expect(ripple.amplitudeScale).toBeLessThanOrEqual(1.1)
      expect(ripple.phaseOffset).toBeGreaterThanOrEqual(-Math.PI * 0.08)
      expect(ripple.phaseOffset).toBeLessThanOrEqual(Math.PI * 0.08)
      expect(ripple.speedScale).toBeGreaterThanOrEqual(0.93)
      expect(ripple.speedScale).toBeLessThanOrEqual(1.07)
    }
  })
})

describe('retainActiveMinamoClickRipples', () => {
  const ripple = (start: number) =>
    createMinamoClickRipple({ clientX: 10, clientY: 20, start, seed: start })

  it('retains every unexpired event and removes events at 3.5 seconds', () => {
    const active = retainActiveMinamoClickRipples(
      [ripple(0), ripple(1), ripple(2)],
      3.5,
    )

    expect(active.map(({ start }) => start)).toEqual([1, 2])
  })
})

describe('Minamo click batching', () => {
  it('packs more than six events without truncation', () => {
    const ripples = Array.from({ length: 13 }, (_, index) =>
      createMinamoClickRipple({
        clientX: 100 + index,
        clientY: 200 + index,
        start: index * 0.01,
        seed: index,
      }),
    )
    const clickData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
    const profileData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
    const packedCenters: number[] = []

    expect(getMinamoClickBatchCount(ripples.length)).toBe(3)
    for (let batchIndex = 0; batchIndex < 3; batchIndex++) {
      const count = fillMinamoClickBatch({
        ripples,
        batchIndex,
        dpr: 2,
        pixelHeight: 1200,
        cellSize: 440,
        clickData,
        profileData,
      })
      for (let index = 0; index < count; index++) {
        packedCenters.push(clickData[index * 4])
      }
    }

    expect(packedCenters).toHaveLength(13)
    expect(packedCenters[0]).toBe((100 * 2) / 440)
    expect(packedCenters[12]).toBe((112 * 2) / 440)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk pnpm --filter @yohaku/web exec vitest run \
  src/components/ui/background/MinamoBackground.interaction.test.ts
```

Expected: FAIL because `./MinamoBackground.interaction` does not exist.

- [ ] **Step 3: Implement the pure event and batching helper**

Create `MinamoBackground.interaction.ts`:

```ts
export const MINAMO_CLICK_RIPPLE_DURATION = 3.5
export const MINAMO_CLICK_BATCH_SIZE = 6

export type MinamoClickRipple = {
  clientX: number
  clientY: number
  start: number
  speedScale: number
  wavelengthScale: number
  amplitudeScale: number
  phaseOffset: number
}

const createRandom = (seed: number) => {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const createMinamoClickRipple = ({
  clientX,
  clientY,
  start,
  seed,
}: {
  clientX: number
  clientY: number
  start: number
  seed: number
}): MinamoClickRipple => {
  const random = createRandom(seed)
  const wavelengthScale = 0.94 + random() * 0.12
  const environmentalVariation = (random() * 2 - 1) * 0.02

  return {
    clientX,
    clientY,
    start,
    wavelengthScale,
    amplitudeScale: 0.9 + random() * 0.2,
    phaseOffset: (random() * 2 - 1) * Math.PI * 0.08,
    speedScale: clamp(
      1 + (wavelengthScale - 1) * 0.8 + environmentalVariation,
      0.93,
      1.07,
    ),
  }
}

export const retainActiveMinamoClickRipples = (
  ripples: MinamoClickRipple[],
  eventTime: number,
) =>
  ripples.filter((ripple) => {
    const age = eventTime - ripple.start
    return age >= 0 && age < MINAMO_CLICK_RIPPLE_DURATION
  })

export const getMinamoClickBatchCount = (count: number) =>
  Math.ceil(count / MINAMO_CLICK_BATCH_SIZE)

export const fillMinamoClickBatch = ({
  ripples,
  batchIndex,
  dpr,
  pixelHeight,
  cellSize,
  clickData,
  profileData,
}: {
  ripples: MinamoClickRipple[]
  batchIndex: number
  dpr: number
  pixelHeight: number
  cellSize: number
  clickData: Float32Array
  profileData: Float32Array
}) => {
  clickData.fill(0)
  profileData.fill(0)
  const startIndex = batchIndex * MINAMO_CLICK_BATCH_SIZE
  const count = Math.min(
    MINAMO_CLICK_BATCH_SIZE,
    Math.max(0, ripples.length - startIndex),
  )

  for (let index = 0; index < count; index++) {
    const ripple = ripples[startIndex + index]
    const offset = index * 4
    clickData[offset] = (ripple.clientX * dpr) / cellSize
    clickData[offset + 1] = (pixelHeight - ripple.clientY * dpr) / cellSize
    clickData[offset + 2] = ripple.start
    clickData[offset + 3] = 1
    profileData[offset] = ripple.speedScale
    profileData[offset + 1] = ripple.wavelengthScale
    profileData[offset + 2] = ripple.amplitudeScale
    profileData[offset + 3] = ripple.phaseOffset
  }

  return count
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command.

Expected: PASS with four behavior tests and all 256 range cases.

- [ ] **Step 5: Format, lint, and commit Task 1**

```bash
rtk pnpm exec prettier --write \
  apps/web/src/components/ui/background/MinamoBackground.interaction.ts \
  apps/web/src/components/ui/background/MinamoBackground.interaction.test.ts
rtk pnpm --filter @yohaku/web exec eslint \
  src/components/ui/background/MinamoBackground.interaction.ts \
  src/components/ui/background/MinamoBackground.interaction.test.ts
rtk proxy git diff --check
rtk proxy git add -- \
  apps/web/src/components/ui/background/MinamoBackground.interaction.ts \
  apps/web/src/components/ui/background/MinamoBackground.interaction.test.ts
rtk proxy git commit -m "feat(web): define unbounded Minamo click events"
```

Expected: formatter and ESLint exit 0; commit contains only the helper and its behavior tests.

### Task 2: Replace the Shader With Signed-Height Accumulation

**Files:**

- Modify: `apps/web/src/components/ui/background/MinamoBackground.shader.ts`

**Interfaces:**

- Consumes two fixed arrays of `MINAMO_CLICK_BATCH_SIZE` entries per accumulation draw.
- Produces:
  - `vertexSource`
  - `rippleAccumulationFragmentSource`
  - `fragmentSource`
- `fragmentSource` consumes one accumulated height texture and no click-event array.

- [ ] **Step 1: Extend the vertex shader with texture coordinates**

Replace `vertexSource` with:

```ts
export const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`
```

- [ ] **Step 2: Add the complete signed-height accumulation shader**

Add `rippleAccumulationFragmentSource` before `fragmentSource`:

```ts
export const rippleAccumulationFragmentSource = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_previousHeight;
uniform vec2 u_extent;
uniform float u_time2;
uniform float u_encodedHeight;
uniform float u_heightRange;
uniform vec4 u_clickRipples[6];
uniform vec4 u_clickProfiles[6];

float decodeHeight(float encoded) {
  if (u_encodedHeight < 0.5) return encoded;
  return (encoded * 2.0 - 1.0) * u_heightRange;
}

float encodeHeight(float height) {
  if (u_encodedHeight < 0.5) return height;
  return clamp(height / u_heightRange * 0.5 + 0.5, 0.0, 1.0);
}

void addClickHeight(
  vec2 world,
  vec4 data,
  vec4 profile,
  inout float height
) {
  if (data.w < 0.5) return;
  float age = u_time2 - data.z;
  if (age < 0.0 || age >= 3.5) return;

  float distanceFromCenter = length(world - data.xy);
  float radius = 0.02 + age * 0.55 * profile.x;
  float offset = distanceFromCenter - radius;
  if (offset > 0.2 || offset < -1.2) return;

  float packetCoordinate = (offset + 0.3) * 2.6;
  float envelope = exp(-packetCoordinate * packetCoordinate);
  envelope *= 1.0 - smoothstep(0.0, 0.15, offset);

  float amplitude = 1.0 - age / 3.5;
  amplitude *= smoothstep(0.0, 0.08, age);
  amplitude *= inversesqrt(max(radius, 0.25)) * 1.12;
  amplitude *= profile.z;

  float wave = sin(offset * 14.0 / profile.y + profile.w) * envelope * amplitude;
  height += clamp(wave, -0.5, 0.5);
}

void main() {
  vec2 world = v_uv * u_extent;
  float height = decodeHeight(texture2D(u_previousHeight, v_uv).r);
  for (int index = 0; index < 6; index++) {
    addClickHeight(
      world,
      u_clickRipples[index],
      u_clickProfiles[index],
      height
    );
  }
  gl_FragColor = vec4(encodeHeight(height), 0.0, 0.0, 1.0);
}
`
```

- [ ] **Step 3: Remove automatic and direct click-ring paths from the composition shader**

In `fragmentSource`:

- delete `u_clickRipples[6]`;
- delete `ripple()` and `clickRipple()`;
- delete both ripple loops and the `rippleHeight → crest` calculation;
- add:

```glsl
varying vec2 v_uv;
uniform sampler2D u_clickHeight;
uniform vec2 u_clickTexel;
uniform float u_encodedHeight;
uniform float u_heightRange;

float decodeClickHeight(float encoded) {
  if (u_encodedHeight < 0.5) return encoded;
  return (encoded * 2.0 - 1.0) * u_heightRange;
}
```

At the start of `main()`, derive the signed slope:

```glsl
float heightLeft = decodeClickHeight(
  texture2D(u_clickHeight, v_uv - vec2(u_clickTexel.x, 0.0)).r
);
float heightRight = decodeClickHeight(
  texture2D(u_clickHeight, v_uv + vec2(u_clickTexel.x, 0.0)).r
);
float heightDown = decodeClickHeight(
  texture2D(u_clickHeight, v_uv - vec2(0.0, u_clickTexel.y)).r
);
float heightUp = decodeClickHeight(
  texture2D(u_clickHeight, v_uv + vec2(0.0, u_clickTexel.y)).r
);
vec2 worldTexel = max(extent * u_clickTexel, vec2(0.0001));
vec2 clickSlope = vec2(
  (heightRight - heightLeft) / (2.0 * worldTexel.x),
  (heightUp - heightDown) / (2.0 * worldTexel.y)
);
```

Replace the caustic input with:

```glsl
vec2 uv = world + clickSlope * 0.018;
```

Keep sparkle independent of click height:

```glsl
float glintA = sparkle(world, t2, caustic) * 0.5 * u_intensity * vignette;
```

Before koi composition, add bounded slope-derived specular:

```glsl
vec3 clickNormal = normalize(vec3(-clickSlope * 0.72, 1.0));
vec3 clickLight = normalize(vec3(-0.32, 0.46, 0.83));
float clickBaseline = pow(max(clickLight.z, 0.0), 30.0);
float clickSpecular = max(
  pow(max(dot(clickNormal, clickLight), 0.0), 30.0) - clickBaseline,
  0.0
);
clickSpecular = min(
  clickSpecular * 0.16 * u_intensity * vignette,
  0.05
);
color += vec3(0.78, 0.94, 0.93) * clickSpecular;
alpha += clickSpecular;
```

The no-click alpha remains:

```glsl
float alpha = caustic * 0.18 * u_intensity * vignette;
```

- [ ] **Step 4: Format and statically verify the shader module**

```bash
rtk pnpm exec prettier --write \
  apps/web/src/components/ui/background/MinamoBackground.shader.ts
rtk pnpm --filter @yohaku/web exec eslint \
  src/components/ui/background/MinamoBackground.shader.ts
rtk proxy git diff --check
```

Expected: all commands exit 0. Do not commit until Task 3 compiles both shader programs at runtime.

### Task 3: Integrate Dynamic Batched Ping-Pong Rendering

**Files:**

- Modify: `apps/web/src/components/ui/background/MinamoBackground.tsx`
- Test: `apps/web/src/components/ui/background/MinamoBackground.interaction.test.ts`

**Interfaces:**

- Consumes all Task 1 helper exports and all Task 2 shader exports.
- Produces no new public React props.
- Keeps `density` in `MinamoBackgroundProps` for sparkle.

- [ ] **Step 1: Replace fixed click state with the dynamic event list**

Import:

```ts
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
```

Replace the ring-buffer refs with:

```ts
const clickRipplesRef = useRef<MinamoClickRipple[]>([])
const clickSeedRef = useRef(0)
```

Replace `onPointerDown` with:

```ts
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
```

- [ ] **Step 2: Add height-field format and target helpers inside the WebGL effect**

Use these exact local types:

```ts
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
```

Select the format in this order:

```ts
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
```

Create a target and reject incomplete framebuffers:

```ts
const createHeightFieldTarget = (
  width: number,
  height: number,
  format: HeightFieldFormat,
): HeightFieldTarget | null => {
  const texture = gl.createTexture()
  const framebuffer = gl.createFramebuffer()
  if (!texture || !framebuffer) return null

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
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
    return null
  }
  return { texture, framebuffer }
}
```

- [ ] **Step 3: Compile and link both programs**

Compile `rippleAccumulationFragmentSource` and `fragmentSource` against the
shared vertex shader. Keep separate attribute and uniform locations for the
accumulation and composition programs. Allocate:

```ts
const clickData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
const profileData = new Float32Array(MINAMO_CLICK_BATCH_SIZE * 4)
```

Required accumulation uniforms:

```ts
u_previousHeight
u_extent
u_time2
u_encodedHeight
u_heightRange
u_clickRipples
u_clickProfiles
```

Required composition uniforms in addition to the baseline:

```ts
u_clickHeight
u_clickTexel
u_encodedHeight
u_heightRange
```

If either program fails, log its compile/link information in development and
retain the existing transparent fallback.

- [ ] **Step 4: Allocate and resize two ping-pong field targets**

Inside the render loop, derive field dimensions from CSS viewport size:

```ts
const fieldWidth = Math.max(1, Math.ceil(width * 0.5))
const fieldHeight = Math.max(1, Math.ceil(height * 0.5))
```

When dimensions change:

1. delete previous field textures/framebuffers;
2. try each format returned by `getHeightFieldFormats()`;
3. accept the first format that creates two complete targets;
4. if none succeeds, render base Minamo without click interaction.

- [ ] **Step 5: Process every active event through ping-pong batches**

At the start of each frame:

```ts
clickRipplesRef.current = retainActiveMinamoClickRipples(
  clickRipplesRef.current,
  eventTime,
)
```

Clear target 0 to the selected format's `clearValue`. Then:

```ts
let readIndex = 0
const batchCount = getMinamoClickBatchCount(clickRipplesRef.current.length)
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
  gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTargets[writeIndex].framebuffer)
  gl.viewport(0, 0, fieldWidth, fieldHeight)
  gl.useProgram(accumulationProgram)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, fieldTargets[readIndex].texture)
  gl.uniform1i(previousHeightLocation, 0)
  gl.uniform2f(extentLocation, pixelWidth / cellSize, pixelHeight / cellSize)
  gl.uniform1f(accumulationTimeLocation, eventTime)
  gl.uniform1f(encodedHeightLocation, fieldFormat.encoded ? 1 : 0)
  gl.uniform1f(heightRangeLocation, fieldFormat.heightRange)
  gl.uniform4fv(clickRipplesLocation, clickData)
  gl.uniform4fv(clickProfilesLocation, profileData)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  readIndex = writeIndex
}
```

When `batchCount === 0`, target 0 remains the zero field and is the composition
input.

- [ ] **Step 6: Compose the final Minamo frame**

Bind the default framebuffer, restore the full canvas viewport, bind the final
field texture, set `u_clickTexel` to `(1 / fieldWidth, 1 / fieldHeight)`, and
draw the composition program once. Continue uploading `u_density` so sparkle
behavior remains unchanged.

- [ ] **Step 7: Clean up every new resource**

On effect cleanup, delete:

- shared triangle buffer;
- accumulation program;
- composition program;
- both field textures;
- both field framebuffers;
- compiled shader objects after linking.

Keep the existing pointer listener and animation-frame cleanup.

- [ ] **Step 8: Run focused static verification**

```bash
rtk pnpm --filter @yohaku/web exec vitest run \
  src/components/ui/background/MinamoBackground.interaction.test.ts
rtk pnpm --filter @yohaku/web exec eslint \
  src/components/ui/background/MinamoBackground.tsx \
  src/components/ui/background/MinamoBackground.shader.ts \
  src/components/ui/background/MinamoBackground.interaction.ts \
  src/components/ui/background/MinamoBackground.interaction.test.ts
rtk pnpm exec prettier --check \
  apps/web/src/components/ui/background/MinamoBackground.tsx \
  apps/web/src/components/ui/background/MinamoBackground.shader.ts \
  apps/web/src/components/ui/background/MinamoBackground.interaction.ts \
  apps/web/src/components/ui/background/MinamoBackground.interaction.test.ts
rtk proxy git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 9: Build and commit Tasks 2–3**

```bash
rtk pnpm --filter @yohaku/web build
rtk proxy git add -- \
  apps/web/src/components/ui/background/MinamoBackground.shader.ts \
  apps/web/src/components/ui/background/MinamoBackground.tsx
rtk proxy git commit -m "feat(web): render unbounded Minamo click interference"
```

Expected: production build exits 0; commit contains the shader and component.

### Task 4: Runtime and Visual Verification

**Files:**

- Verify: `apps/web/src/app/[locale]/(dev)/backgrounds/page.tsx`
- Verify: all files changed by Tasks 1–3.

**Interfaces:**

- No new interfaces.
- Confirms the complete approved design.

- [ ] **Step 1: Start the review bench**

```bash
rtk pnpm --filter @yohaku/web dev
```

Expected: development server listens on port 2323.

- [ ] **Step 2: Verify the WebGL 2 path**

Open `http://localhost:2323/en/backgrounds`, select `Minamo 水面`, and verify:

- 10 seconds idle produces moving caustics but no circular ripple;
- center, edge, and corner clicks align with the pointer;
- isolated packets remain circular;
- consecutive packets show restrained differences in spacing, speed, and
  strength;
- 8, 16, and 32 rapid clicks remain active until their individual 3.5-second
  expiry;
- crossing packets reinforce/cancel locally and continue through one another;
- no capsule or filled merged contour appears;
- no console, shader, or framebuffer error occurs.

- [ ] **Step 3: Verify the WebGL 1 path**

Launch a fresh browser context with `webgl2` forced to return `null`. Repeat the
idle, 8-click, crossing-wave, and expiry checks. Confirm the selected half-float
or RGBA8 field format creates complete framebuffers and does not restore a fixed
event cap.

- [ ] **Step 4: Verify resize, DPR, and failure behavior**

- Test DPR 1 and DPR 2.
- Resize while several waves are active and verify their centers do not move.
- Force half-float framebuffer creation to fail and verify RGBA8 fallback.
- Force all field-target creation to fail and verify base Minamo remains while
  click interaction is disabled without console spam.

- [ ] **Step 5: Measure active-event scaling**

At 1440p CSS / DPR 2 and 4K CSS / DPR 2, record idle, 1-click, 8-click,
16-click, and 32-click frame timing. Confirm work grows with batch count and no
event is discarded.

- [ ] **Step 6: Run final verification**

```bash
rtk pnpm --filter @yohaku/web exec vitest run \
  src/components/ui/background/MinamoBackground.interaction.test.ts
rtk pnpm --filter @yohaku/web exec eslint \
  src/components/ui/background/MinamoBackground.tsx \
  src/components/ui/background/MinamoBackground.shader.ts \
  src/components/ui/background/MinamoBackground.interaction.ts \
  src/components/ui/background/MinamoBackground.interaction.test.ts
rtk pnpm --filter @yohaku/web build
rtk proxy git diff --check
rtk proxy git status --short
```

Expected: targeted tests, ESLint, build, and diff check pass; status contains no
uncommitted implementation files.
