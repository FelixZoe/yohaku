export const AMBIENT_SCOPE_CLASS = 'yohaku-ambient-sides-scope'

export interface AmbientOptions {
  depth: number
  envelope: number
  fadeStrength: number
  grainDensity: number
  grainScale: number
  peak: number
  peakDark: number
  solid: number
  tauFast: number
  tauSlow: number
  tintChroma: number
  tintLight: number
  tintLightDark: number
}

export const AMBIENT_DEFAULTS: AmbientOptions = {
  peak: 0.195,
  peakDark: 0.16,
  envelope: 0.65,
  depth: 30,
  tintChroma: 0.075,
  tintLight: 0.62,
  tintLightDark: 0.46,
  solid: 0.75,
  grainDensity: 0.26,
  grainScale: 200,
  tauSlow: 260,
  tauFast: 1150,
  fadeStrength: 0.7,
}

export const AMBIENT_VELOCITY = {
  tauLo: 200,
  tauHi: 1600,
  fadeLo: 900,
  fadeHi: 3200,
  fadeOutTau: 150,
  fadeInTau: 600,
  ampTau: 260,
  velocityTau: 90,
} as const
