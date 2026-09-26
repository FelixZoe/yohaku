export const shaderSource = `
struct Uniforms {
  resolutionTime: vec4<f32>,
  floretParams: vec4<f32>,
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

fn lerp3(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
  return a + (b - a) * t;
}

fn rotate(p: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn ndot(a: vec2<f32>, b: vec2<f32>) -> f32 {
  return a.x * b.x - a.y * b.y;
}

fn sdRhombus(p: vec2<f32>, b: vec2<f32>) -> f32 {
  let q = abs(p);
  let h = clamp(ndot(b - 2.0 * q, b) / dot(b, b), -1.0, 1.0);
  let d = length(q - 0.5 * b * vec2<f32>(1.0 - h, 1.0 + h));
  return d * sign(q.x * b.y + q.y * b.x - b.x * b.y);
}

// Hydrangea floret: 4 rounded-diamond sepals at ~90deg steps around a small
// center disc; per-seed jitter on each sepal's rotation/length/width so no
// two florets are identical. Returns (sdf, vein) where vein is an axial
// highlight band inside each sepal.
fn floretField(p: vec2<f32>, seed: f32) -> vec2<f32> {
  let baseRot = (hash11(seed * 5.1) - 0.5) * 0.6;
  var d = length(p) - (0.07 + hash11(seed * 9.4) * 0.02);
  var vein = 0.0;

  for (var i = 0; i < 4; i = i + 1) {
    let ji = seed * 17.0 + f32(i) * 7.7;
    let rotJitter = (hash11(ji + 1.0) - 0.5) * 0.26;
    let halfLen = 0.145 + hash11(ji + 2.0) * 0.045;
    let halfWid = 0.095 + hash11(ji + 3.0) * 0.035;
    let rounding = 0.045 + hash11(ji + 4.0) * 0.015;

    let a = f32(i) * PI * 0.5 + baseRot + rotJitter;
    var q = rotate(p, -a);
    q.y = q.y - (0.05 + halfLen);

    let ds = sdRhombus(q, vec2<f32>(halfWid, halfLen)) - rounding;
    d = min(d, ds);

    let inside = smoothstep(0.01, -0.03, ds);
    let axial = 1.0 - smoothstep(0.0, 0.02, abs(q.x));
    let along =
      smoothstep(-halfLen, -halfLen * 0.3, q.y) *
      smoothstep(halfLen + rounding, halfLen * 0.2, q.y);
    vein = max(vein, axial * along * inside);
  }

  // tiny angular waviness so sepal edges don't read as perfect geometry
  d = d + sin(atan2(p.y, p.x) * 8.0 + seed * 31.0) * 0.003;

  return vec2<f32>(d, vein);
}

fn floretMask(d: f32, blur: f32) -> f32 {
  let edgeAA = max(fwidth(d) * 1.5, 0.002);
  let softness = edgeAA + blur * 0.07;
  return 1.0 - smoothstep(-softness, softness, d);
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

  let field = floretField(p, input.seed);
  let shape = floretMask(field.x, input.blur);
  if (shape < 0.001) {
    discard;
  }
  let vein = field.y;

  let tiltCos = cos(input.tilt);
  let frontFacing = step(0.0, tiltCos);
  let isBack = tiltCos < 0.0;

  let k = hash11(input.seed * 23.1);
  let k2 = hash11(input.seed * 37.3);

  let cornBlue = vec3<f32>(0.478, 0.559, 0.802);
  let lavenderBlue = vec3<f32>(0.552, 0.595, 0.808);
  let periwinkle = vec3<f32>(0.624, 0.586, 0.814);
  let lilac = vec3<f32>(0.704, 0.622, 0.818);
  let paleViolet = vec3<f32>(0.67, 0.67, 0.83);

  var baseColor: vec3<f32>;
  if (k < 0.25) {
    baseColor = lerp3(cornBlue, lavenderBlue, k / 0.25);
  } else if (k < 0.55) {
    baseColor = lerp3(lavenderBlue, periwinkle, (k - 0.25) / 0.3);
  } else if (k < 0.8) {
    baseColor = lerp3(periwinkle, lilac, (k - 0.55) / 0.25);
  } else {
    baseColor = lerp3(lilac, paleViolet, (k - 0.8) / 0.2);
  }

  let r = length(p);
  let greenishBlue = vec3<f32>(0.40, 0.55, 0.60);
  let centerColor = lerp3(baseColor * 0.82, greenishBlue, 0.45);
  var color = lerp3(centerColor, baseColor, smoothstep(0.05, 0.30, r));
  let edgeColor = baseColor * 1.07 + vec3<f32>(0.02, 0.02, 0.03);
  color = lerp3(color, edgeColor, smoothstep(0.26, 0.46, r) * 0.6);

  color = lerp3(
    color,
    vec3<f32>(0.93, 0.94, 0.99),
    vein * 0.22 * frontFacing,
  );

  let warmth = (k2 - 0.5) * 0.04;
  color = color + vec3<f32>(warmth, 0.0, -warmth);

  if (isBack) {
    let luma = dot(color, vec3<f32>(0.299, 0.587, 0.114));
    color = lerp3(color, vec3<f32>(luma), 0.3);
    color = lerp3(color, vec3<f32>(0.80, 0.81, 0.885), 0.35);
  }

  var alpha = input.alpha * shape;
  alpha = alpha * (1.0 - input.blur * 0.25);

  color = lerp3(color, vec3<f32>(0.85, 0.87, 0.94), input.blur * 0.3);

  alpha = min(1.0, alpha * 1.1);

  let premul = color * alpha;
  return vec4<f32>(premul, alpha);
}
`
