export const AMBIENT_VERTEX_SHADER = `
attribute vec2 aP;
void main(){ gl_Position = vec4(aP, 0.0, 1.0); }
`

export const AMBIENT_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 uRes;
uniform vec3 uColor;
uniform float uAlpha, uDepth, uCell, uSolid, uExponent, uDensity;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(){
  vec2 px = gl_FragCoord.xy;
  float dx = min(px.x, uRes.x - px.x);
  float prof = 1.0 - min(dx / uDepth, 1.0);
  float n = min(1.0, pow(hash21(floor(px / uCell)) * 2.0, uExponent) * uDensity * 2.0);
  float grain = uSolid + (1.0 - uSolid) * n;
  float a = clamp(prof * grain * uAlpha, 0.0, 1.0);
  float g = clamp(a * 255.0, 0.0, 1.0);
  a = clamp(a + (hash21(px + 3.71) - 0.5) * (1.0 / 255.0) * g, 0.0, 1.0);
  vec3 rgb = uColor * a + (hash21(px + 7.13) - 0.5) * (2.2 / 255.0) * g;
  gl_FragColor = vec4(rgb, a);
}
`
