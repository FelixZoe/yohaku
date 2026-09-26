/**
 * Sakura petal WGSL shader.
 * - Obovate body (no stem, no side lobes); tip V-notch creates bilobed silhouette
 * - Back-face aware fragment: desaturates & shifts toward pale warm pink when
 *   cos(tilt) < 0, so petals flipping to their underside read as back
 * - Central vein highlight disabled on back face
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

// Obovate petal with deep V-notch at tip.
fn petalSDF(p: vec2<f32>, seed: f32) -> f32 {
  let petalLength = uniforms.petalParams.x;
  let petalWidth = uniforms.petalParams.y;
  let notchDepth = clamp(uniforms.petalParams.z, 0.0, 1.0);

  var q = p;
  q.x = q.x / max(0.001, petalWidth);
  q.y = q.y / max(0.001, petalLength);

  let k1 = hash11(seed * 7.3 + 1.0);
  let k2 = hash11(seed * 13.1 + 2.0);
  let k3 = hash11(seed * 19.7 + 3.0);
  let k4 = hash11(seed * 31.9 + 4.0);

  let asymmetry = (k4 - 0.5) * 0.035;

  // Pinch q.x toward the base so the silhouette is wider at the tip.
  let taperBase = smoothstep(-0.45, 0.05, q.y);
  let shapedX = q.x / (0.78 + 0.22 * taperBase);

  let bw = 0.36 + k1 * 0.04;
  let bh = 0.46 + k2 * 0.035;

  let body = sdEllipse(
    vec2<f32>(shapedX - asymmetry, q.y + 0.02),
    vec2<f32>(bw, bh),
  );
  var d = body;

  let notchScale = 0.10 + notchDepth * 0.30;
  let notchW = 0.13 + k3 * 0.03;
  let notchY = bh - notchScale * 0.25;
  let notch = sdEllipse(
    q - vec2<f32>(asymmetry * 0.6, notchY),
    vec2<f32>(notchW, notchScale),
  );
  d = max(d, -notch);

  d = max(d, q.y - (bh + 0.015));
  d = max(d, -(bh + 0.03) - q.y);

  let yNorm = clamp((q.y + bh) / (2.0 * bh), 0.0, 1.0);
  let edgeNoise =
    (sin(q.y * 18.0 + k1 * PI * 2.0) +
     sin(q.y * 11.0 + k3 * PI * 2.0)) * 0.0016;
  d = d + edgeNoise * smoothstep(0.4, 0.95, yNorm);

  return d;
}

fn petalMask(p: vec2<f32>, seed: f32, blur: f32) -> f32 {
  let d = petalSDF(p, seed);
  let edgeAA = max(fwidth(d) * 1.5, 0.0015);
  let softness = edgeAA + blur * 0.075;
  let mask = 1.0 - smoothstep(-softness, softness, d);

  let k1 = hash11(seed * 13.7);

  let petalLength = uniforms.petalParams.x;
  var q = p;
  q.y = q.y / petalLength;
  let yNorm = clamp((q.y + 0.45) / 0.9, 0.0, 1.0);

  let centralVein = abs(p.x) * 25.0;
  let veinFade = smoothstep(0.0, 0.3, yNorm) * smoothstep(0.95, 0.7, yNorm);
  let centralVeinMask = smoothstep(1.0, 0.0, centralVein) * veinFade * 0.06;

  let sideVeinAngle = p.x * 3.0 + yNorm * 2.0 + k1 * 2.0;
  let sideVein = abs(sin(sideVeinAngle * 5.0));
  let sideVeinMask =
    smoothstep(0.3, 0.8, sideVein) *
    veinFade *
    0.03 *
    smoothstep(0.0, 0.15, abs(p.x));

  let veinPattern = (centralVeinMask + sideVeinMask) * (1.0 - blur);
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

  let white = vec3<f32>(1.0, 0.98, 0.98);
  let palePink = vec3<f32>(0.996, 0.94, 0.95);
  let lightPink = vec3<f32>(0.99, 0.88, 0.91);
  let sakuraPink = vec3<f32>(0.98, 0.80, 0.85);
  let deepPink = vec3<f32>(0.95, 0.68, 0.76);

  var baseColor: vec3<f32>;
  if (k < 0.25) {
    baseColor = lerp3(white, palePink, k / 0.25);
  } else if (k < 0.55) {
    baseColor = lerp3(palePink, lightPink, (k - 0.25) / 0.3);
  } else if (k < 0.8) {
    baseColor = lerp3(lightPink, sakuraPink, (k - 0.55) / 0.25);
  } else {
    baseColor = lerp3(sakuraPink, deepPink, (k - 0.8) / 0.2);
  }

  let lengthGradient = smoothstep(0.2, 0.8, yNorm);
  let tipColor = baseColor * 0.94 + vec3<f32>(0.02, -0.02, 0.0);
  let r = length(p);
  let radialGradient = smoothstep(0.0, 0.35, r);

  var color = lerp3(baseColor, tipColor, lengthGradient * 0.4);
  let edgeTint = color * 0.93 + vec3<f32>(0.01, -0.03, -0.01);
  color = lerp3(color, edgeTint, radialGradient * 0.5);

  let centralHighlight = 1.0 - smoothstep(0.0, 0.08, abs(p.x));
  let veinHighlight =
    centralHighlight *
    smoothstep(0.0, 0.4, yNorm) *
    smoothstep(0.95, 0.6, yNorm);
  color = lerp3(color, white, veinHighlight * 0.25 * frontFacing);

  let warmth = k2 * 0.03;
  color = color + vec3<f32>(warmth, -warmth * 0.5, -warmth);

  if (isBack) {
    let backTint = vec3<f32>(0.995, 0.94, 0.95);
    let luma = dot(color, vec3<f32>(0.299, 0.587, 0.114));
    let desat = vec3<f32>(luma);
    color = lerp3(color, desat, 0.28);
    color = lerp3(color, backTint, 0.32);
  }

  var alpha = input.alpha * shape;
  let blurEffect = input.blur * 0.25;
  alpha = alpha * (1.0 - blurEffect);

  color = lerp3(color, vec3<f32>(0.98, 0.92, 0.94), input.blur * 0.3);

  alpha = min(1.0, alpha * 1.15);

  let premul = color * alpha;
  return vec4<f32>(premul, alpha);
}
`
