/**
 * Wisteria petal WGSL shader.
 * - Elongated teardrop body, no notch and no side lobes
 * - Seed-driven gentle bend for organic asymmetry
 * - Light/dark palette switching via colorParams.x (isDark flag, 0/1)
 * - Back-face desaturates and lightens for petals flipped to their underside
 */
export const shaderSource = `
struct Uniforms {
  resolutionTime: vec4<f32>,
  petalParams: vec4<f32>,
  colorParams: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265;

struct VertexInput {
  @location(0) localPos: vec2<f32>,
  @location(1) instancePos: vec2<f32>,
  @location(2) size: f32,
  @location(3) alpha: f32,
  @location(4) seed: f32,
  @location(5) rotation: f32,
  @location(6) blur: f32,
  @location(7) tilt: f32,
};

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
  @location(1) alpha: f32,
  @location(2) seed: f32,
  @location(3) rotation: f32,
  @location(4) blur: f32,
  @location(5) tilt: f32,
};

fn hash11(p: f32) -> f32 {
  var x = fract(p * 0.1031);
  x = x * (x + 33.33);
  x = x * (x + x);
  return fract(x);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return a + (b - a) * t;
}

fn lerp3(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
  return a + (b - a) * t;
}

fn rotate(p: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn sdEllipse(p: vec2<f32>, r: vec2<f32>) -> f32 {
  let rr = max(r, vec2<f32>(0.001, 0.001));
  return length(p / rr) - 1.0;
}

fn petalSDF(p: vec2<f32>, seed: f32) -> f32 {
  let petalLength = uniforms.petalParams.x;
  let petalWidth = uniforms.petalParams.y;
  let taperK = clamp(uniforms.petalParams.z, 0.0, 1.0);

  var q = p;
  q.x = q.x / max(0.001, petalWidth);
  q.y = q.y / max(0.001, petalLength);

  let k1 = hash11(seed * 7.3 + 1.0);
  let k2 = hash11(seed * 13.1 + 2.0);

  let bend = (k1 - 0.5) * 0.05;
  q.x = q.x + bend * (q.y + 0.15);

  let baseTaper = smoothstep(-0.55, 0.10, q.y);
  let tipNarrow = 1.0 - 0.08 * smoothstep(0.30, 0.55, q.y);
  let widthScale = mix(0.55, 1.0, baseTaper) * tipNarrow;
  let shapedX = q.x / mix(1.0, widthScale, taperK);

  let bw = 0.38 + k2 * 0.04;
  let bh = 0.50 + k1 * 0.04;

  let body = sdEllipse(
    vec2<f32>(shapedX, q.y + 0.02),
    vec2<f32>(bw, bh),
  );
  var d = body;

  d = max(d, q.y - (bh + 0.015));
  d = max(d, -(bh + 0.03) - q.y);

  let yNorm = clamp((q.y + bh) / (2.0 * bh), 0.0, 1.0);
  let edgeNoise = sin(q.y * 14.0 + k1 * PI * 2.0) * 0.0014;
  d = d + edgeNoise * smoothstep(0.4, 0.95, yNorm);

  return d;
}

fn petalMask(p: vec2<f32>, seed: f32, blur: f32) -> f32 {
  let d = petalSDF(p, seed);
  let edgeAA = max(fwidth(d) * 1.5, 0.0015);
  let softness = edgeAA + blur * 0.075;
  let mask = 1.0 - smoothstep(-softness, softness, d);

  let petalLength = uniforms.petalParams.x;
  var q = p;
  q.y = q.y / petalLength;
  let yNorm = clamp((q.y + 0.45) / 0.9, 0.0, 1.0);

  let centralVein = abs(p.x) * 28.0;
  let veinFade = smoothstep(0.0, 0.3, yNorm) * smoothstep(0.95, 0.7, yNorm);
  let centralVeinMask = smoothstep(1.0, 0.0, centralVein) * veinFade * 0.05;

  let veinPattern = centralVeinMask * (1.0 - blur);
  return mask * (1.0 - veinPattern);
}

@vertex
fn vsMain(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  var localPos = input.localPos;
  let tiltScale = cos(input.tilt);
  localPos.x = localPos.x * max(0.3, abs(tiltScale));

  let scaled = localPos * input.size;
  let pos = input.instancePos + scaled;
  let res = uniforms.resolutionTime.xy;
  let clip = vec2<f32>(
    (pos.x / res.x) * 2.0 - 1.0,
    1.0 - (pos.y / res.y) * 2.0,
  );
  out.Position = vec4<f32>(clip, 0.0, 1.0);
  out.localPos = input.localPos;
  out.alpha = input.alpha;
  out.seed = input.seed;
  out.rotation = input.rotation;
  out.blur = input.blur;
  out.tilt = input.tilt;
  return out;
}

@fragment
fn fsMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var p = input.localPos;
  p = rotate(p, input.rotation);

  let shape = petalMask(p, input.seed, input.blur);
  if (shape < 0.001) {
    discard;
  }

  let tiltCos = cos(input.tilt);
  let frontFacing = step(0.0, tiltCos);
  let isBack = tiltCos < 0.0;

  let k = hash11(input.seed * 23.1);
  let k2 = hash11(input.seed * 37.3);

  let petalLength = uniforms.petalParams.x;
  let yNorm = (p.y / petalLength + 0.5);

  let isDark = uniforms.colorParams.x > 0.5;

  var c1: vec3<f32>;
  var c2: vec3<f32>;
  var c3: vec3<f32>;
  var c4: vec3<f32>;
  var c5: vec3<f32>;

  if (isDark) {
    c1 = vec3<f32>(0.702, 0.616, 0.859);
    c2 = vec3<f32>(0.584, 0.459, 0.804);
    c3 = vec3<f32>(0.494, 0.341, 0.761);
    c4 = vec3<f32>(0.404, 0.227, 0.718);
    c5 = vec3<f32>(0.369, 0.208, 0.694);
  } else {
    c1 = vec3<f32>(0.820, 0.769, 0.914);
    c2 = vec3<f32>(0.702, 0.616, 0.859);
    c3 = vec3<f32>(0.584, 0.459, 0.804);
    c4 = vec3<f32>(0.494, 0.341, 0.761);
    c5 = vec3<f32>(0.404, 0.227, 0.718);
  }

  var baseColor: vec3<f32>;
  if (k < 0.25) {
    baseColor = lerp3(c1, c2, k / 0.25);
  } else if (k < 0.55) {
    baseColor = lerp3(c2, c3, (k - 0.25) / 0.3);
  } else if (k < 0.8) {
    baseColor = lerp3(c3, c4, (k - 0.55) / 0.25);
  } else {
    baseColor = lerp3(c4, c5, (k - 0.8) / 0.2);
  }

  let lengthGradient = smoothstep(0.2, 0.8, yNorm);
  let tipColor = baseColor * 0.90;
  let r = length(p);
  let radialGradient = smoothstep(0.0, 0.35, r);

  var color = lerp3(baseColor, tipColor, lengthGradient * 0.4);
  let edgeTint = color * 0.92;
  color = lerp3(color, edgeTint, radialGradient * 0.5);

  let centralHighlight = 1.0 - smoothstep(0.0, 0.08, abs(p.x));
  let veinHighlight =
    centralHighlight *
    smoothstep(0.0, 0.4, yNorm) *
    smoothstep(0.95, 0.6, yNorm);
  let highlightColor = lerp3(baseColor, vec3<f32>(1.0, 0.98, 1.0), 0.55);
  color = lerp3(color, highlightColor, veinHighlight * 0.18 * frontFacing);

  let warmth = (k2 - 0.5) * 0.04;
  color = color + vec3<f32>(warmth * 0.3, 0.0, warmth * 0.5);

  if (isBack) {
    let backTint = vec3<f32>(0.90, 0.85, 0.93);
    let luma = dot(color, vec3<f32>(0.299, 0.587, 0.114));
    let desat = vec3<f32>(luma);
    color = lerp3(color, desat, 0.25);
    color = lerp3(color, backTint, 0.30);
  }

  var alpha = input.alpha * shape;
  let blurEffect = input.blur * 0.25;
  alpha = alpha * (1.0 - blurEffect);

  let blurTint = select(
    vec3<f32>(0.92, 0.88, 0.96),
    vec3<f32>(0.40, 0.32, 0.55),
    isDark,
  );
  color = lerp3(color, blurTint, input.blur * 0.3);

  alpha = min(1.0, alpha * 1.15);

  let premul = color * alpha;
  return vec4<f32>(premul, alpha);
}
`
