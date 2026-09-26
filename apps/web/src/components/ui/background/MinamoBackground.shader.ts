export const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

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

export const fragmentSource = `
precision highp float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;      // slow clock driving the caustic warp
uniform float u_time2;     // real-seconds clock for glints / koi
uniform float u_intensity;
uniform float u_cellSize;
uniform float u_density;
uniform sampler2D u_clickHeight;
uniform vec2 u_clickTexel;
uniform float u_encodedHeight;
uniform float u_heightRange;

const float TAU = 6.28318530718;
const float PI = 3.14159265;

float hash11(float p) {
  p = fract(p * 0.1031);
  p = p * (p + 33.33);
  p = p * (p + p);
  return fract(p);
}

vec2 hash21(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 rotate2(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

float decodeClickHeight(float encoded) {
  if (u_encodedHeight < 0.5) return encoded;
  return (encoded * 2.0 - 1.0) * u_heightRange;
}

// Iterative caustic: warp w each layer, filaments emerge where sin/cos
// divisors vanish. No mod wrap — coordinates run continuously; the -250.0
// offset keeps |p| large so the 1/length term varies little across the
// (centered) viewport.
float causticField(vec2 uv, float time) {
  vec2 p = uv * TAU - 250.0;
  vec2 w = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    w = p + vec2(cos(t - w.x) + sin(t + w.y), sin(t - w.y) + cos(t + w.x));
    c += 1.0 / length(vec2(p.x / (sin(w.x + t) / inten), p.y / (cos(w.y + t) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 7.0), 0.0, 1.0);
}

// Hash-grid glitter: brief diamond-shaped gold glints, gated so they only
// pop where the caustic is already bright.
float sparkle(vec2 world, float t, float brightness) {
  float g = 2.8;
  vec2 cell = floor(world * g);
  float rnd = hash12(cell);
  float period = 5.0 + rnd * 9.0;
  float lt = t + rnd * period;
  float n = floor(lt / period);
  float age = lt - n * period;
  float life = 1.1;
  if (age >= life) return 0.0;

  float gate = hash12(cell + n * 17.0);
  if (gate > 0.3 * u_density) return 0.0;

  vec2 jitter = hash21(hash12(cell + 3.7) * 43.7 + n) * 0.7 + 0.15;
  vec2 q = (world - (cell + jitter) / g) * g;
  float l1 = abs(q.x) + abs(q.y);
  float core = pow(max(0.0, 1.0 - l1 * 3.2), 4.0);
  float env = sin(PI * age / life);
  return core * env * env * smoothstep(0.25, 0.6, brightness);
}

// Koi rendered as a soft shadow only: two anisotropic gaussian blobs with a
// swaying tail, crossing the screen roughly twice a minute.
float koiShadow(vec2 world, vec2 extent, float t) {
  float P = 30.0;
  float n = floor(t / P);
  float phase = fract(t / P);
  float travel = 0.55;
  if (phase >= travel) return 0.0;
  float u = phase / travel;

  float r1 = hash11(n * 3.7 + 11.0);
  float r2 = hash11(n * 5.3 + 29.0);
  float r3 = hash11(n * 9.1 + 47.0);
  vec2 A = vec2(-0.8, extent.y * (0.2 + 0.6 * r1));
  vec2 B = vec2(extent.x + 0.8, extent.y * (0.2 + 0.6 * r2));
  if (r3 > 0.5) {
    vec2 tmp = A;
    A = B;
    B = tmp;
  }

  vec2 dir = normalize(B - A);
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 pos = mix(A, B, u) + perp * sin(u * 9.0 + n) * 0.25;

  vec2 rel = world - pos;
  float along = dot(rel, dir);
  float side = dot(rel, perp);
  side += sin(t * 4.0 + along * 6.0) * 0.05 * smoothstep(0.0, 0.35, -along);

  float ba = along / 0.26;
  float bs = side / 0.075;
  float body = exp(-(ba * ba + bs * bs));
  float ta = (along + 0.32) / 0.12;
  float ts = side / 0.045;
  float tail = exp(-(ta * ta + ts * ts));

  return max(body, tail * 0.8) * sin(PI * u);
}

void main() {
  vec2 world = gl_FragCoord.xy / u_cellSize;
  vec2 extent = u_resolution / u_cellSize;
  float t2 = u_time2;
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

  // low-frequency domain warp: viewport-scale sine octaves decorrelate the
  // caustic field, whose sin/cos core is intrinsically TAU-periodic in p
  float time = u_time + 23.0;
  vec2 uv = world + clickSlope * 0.018;
  vec2 wuv = uv +
    0.35 * vec2(sin(uv.y * 0.55 + time * 0.4), sin(uv.x * 0.5 - time * 0.3)) +
    0.18 * vec2(sin(uv.y * 1.3 - time * 0.23 + 1.7), sin(uv.x * 1.1 + time * 0.31 + 4.2));
  // center so the 1/length amplitude drift stays symmetric across the screen
  wuv -= extent * 0.5;

  // two layers at an irrational scale ratio + slight rotation: their
  // periodicities never align, killing visible tiling
  float cA = causticField(wuv, time);
  float cB = causticField(rotate2(wuv, 0.4) * 1.618, time * 1.13 + 7.0);
  float caustic = clamp(cA * 0.62 + cB * 0.5, 0.0, 1.0);

  vec2 screen = gl_FragCoord.xy / u_resolution;
  vec2 edge = smoothstep(0.0, 0.12, screen) * smoothstep(1.0, 0.88, screen);
  float vignette = 0.4 + 0.6 * edge.x * edge.y;

  // slow spatial hue drift breaks the flat teal
  float hueMod = 0.5 + 0.5 * sin(world.x * 0.6 + t2 * 0.04) * sin(world.y * 0.8 - t2 * 0.03);
  vec3 teal = vec3(0.431, 0.725, 0.765);
  vec3 aqua = vec3(0.588, 0.843, 0.863);
  vec3 jade = vec3(0.478, 0.792, 0.718);
  vec3 waterTint = mix(mix(teal, aqua, caustic), jade, hueMod * 0.35);

  float alpha = caustic * 0.18 * u_intensity * vignette;
  vec3 color = waterTint * alpha;

  float glintA = sparkle(world, t2, caustic) * 0.5 * u_intensity * vignette;
  color += vec3(1.0, 0.86, 0.55) * glintA;
  alpha += glintA;

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

  // shadow darkens the page: near-dark premultiplied color, small alpha
  float shadow = koiShadow(world, extent, t2) * 0.05 * u_intensity;
  color += vec3(0.02, 0.05, 0.06) * shadow;
  alpha += shadow;

  gl_FragColor = vec4(color, min(alpha, 1.0));
}
`
