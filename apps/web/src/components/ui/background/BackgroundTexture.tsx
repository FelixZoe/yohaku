'use client'
import { memoize } from 'es-toolkit/compat'
import { useReducedMotion } from 'motion/react'
import type { FC } from 'react'
import { useMemo } from 'react'

import { useIsBackgroundEffectEnabled } from '~/atoms/hooks/background'
import {
  useIsImmersiveReadingEnabled,
  useIsInReading,
} from '~/atoms/hooks/reading'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { useIsHydrationEnded } from '~/components/common/HydrationEndDetector'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { range, sample } from '~/lib/lodash'

import type { AjisaiBackgroundProps } from './AjisaiBackground'
import { AjisaiBackground } from './AjisaiBackground'
import { AutumnLeavesBackground } from './AutumnLeavesBackground'
import type { DiamondDustBackgroundProps } from './DiamondDustBackground'
import { DiamondDustBackground } from './DiamondDustBackground'
import { FireflyBackground } from './FireflyBackground'
import { HanabiBackground } from './HanabiBackground'
import { KazahanaBackground } from './KazahanaBackground'
import { KinmokuseiBackground } from './KinmokuseiBackground'
import type { KomorebiBackgroundProps } from './KomorebiBackground'
import { KomorebiBackground } from './KomorebiBackground'
import { MinamoBackground } from './MinamoBackground'
import type { SakuraBackgroundProps } from './SakuraBackground'
import { SakuraBackground } from './SakuraBackground'
import type { SnowBackgroundProps } from './SnowBackground'
import { SnowBackground } from './SnowBackground'
import { UmeBackground } from './UmeBackground'
import type { WisteriaBackgroundProps } from './WisteriaBackground'
import { WisteriaBackground } from './WisteriaBackground'

export const BackgroundTexture: FC = () => {
  const isDark = useIsDark()
  const isMobile = useIsMobile()
  const isInReading = useIsInReading()
  const isImmersive = useIsImmersiveReadingEnabled()
  const reduceMotion = useReducedMotion()
  const isHydrationEnded = useIsHydrationEnded()
  const isEnabled = useIsBackgroundEffectEnabled()

  // Memoized so multi-preset pools don't re-roll on unrelated re-renders.
  const preset = useMemo(
    () => resolveBackgroundPreset(isDark, new Date()),
    [isDark],
  )

  if (!isEnabled) return null
  if (reduceMotion) return null
  if (isImmersive) return null
  if (isMobile) return null
  if (isInReading) return null
  if (!isHydrationEnded) return null

  return (
    <div data-hide-print className="animate-in fade-in duration-1000 ease-out">
      <preset.Component {...preset.props} />
    </div>
  )
}

type BackgroundPreset =
  | { Component: typeof AjisaiBackground; props: AjisaiBackgroundProps }
  | {
      Component: typeof DiamondDustBackground
      props: DiamondDustBackgroundProps
    }
  | { Component: typeof KomorebiBackground; props: KomorebiBackgroundProps }
  | { Component: typeof SnowBackground; props: SnowBackgroundProps }
  | { Component: typeof SakuraBackground; props: SakuraBackgroundProps }
  | { Component: typeof WisteriaBackground; props: WisteriaBackgroundProps }
  | { Component: typeof AutumnLeavesBackground; props?: undefined }
  | { Component: typeof FireflyBackground; props?: undefined }
  | { Component: typeof HanabiBackground; props?: undefined }
  | { Component: typeof KazahanaBackground; props?: undefined }
  | { Component: typeof KinmokuseiBackground; props?: undefined }
  | { Component: typeof MinamoBackground; props?: undefined }
  | { Component: typeof UmeBackground; props?: undefined }

// Seasonal wheel of record: see BACKGROUND_DESIGN_SPEC.md in this directory.
type Season =
  | 'deep-winter'
  | 'late-winter'
  | 'spring'
  | 'late-spring'
  | 'early-summer'
  | 'high-summer'
  | 'early-autumn'
  | 'late-autumn'

type PresetPool = Array<() => BackgroundPreset>

const SEASON_PRESETS: Record<Season, { light: PresetPool; dark: PresetPool }> =
  {
    'deep-winter': {
      light: [
        () => ({
          Component: DiamondDustBackground,
          props: createDiamondDustBackgroundProps(),
        }),
      ],
      dark: [
        () => ({
          Component: SnowBackground,
          props: createSnowBackgroundProps(),
        }),
      ],
    },
    'late-winter': {
      light: [() => ({ Component: UmeBackground })],
      dark: [() => ({ Component: KazahanaBackground })],
    },
    spring: {
      light: [
        () => ({
          Component: SakuraBackground,
          props: createSakuraBackgroundProps(),
        }),
      ],
      dark: [
        () => ({
          Component: SakuraBackground,
          props: createSakuraBackgroundProps(),
        }),
      ],
    },
    'late-spring': {
      light: [
        () => ({
          Component: WisteriaBackground,
          props: createWisteriaBackgroundProps(),
        }),
      ],
      dark: [
        () => ({
          Component: WisteriaBackground,
          props: createWisteriaBackgroundProps(),
        }),
      ],
    },
    'early-summer': {
      light: [
        () => ({
          Component: AjisaiBackground,
          props: createAjisaiBackgroundProps(),
        }),
      ],
      dark: [() => ({ Component: FireflyBackground })],
    },
    'high-summer': {
      light: [
        () => ({
          Component: KomorebiBackground,
          props: createKomorebiBackgroundProps(),
        }),
        () => ({ Component: MinamoBackground }),
      ],
      dark: [
        () => ({ Component: FireflyBackground }),
        () => ({ Component: HanabiBackground }),
      ],
    },
    'early-autumn': {
      light: [() => ({ Component: KinmokuseiBackground })],
      dark: [() => ({ Component: KinmokuseiBackground })],
    },
    'late-autumn': {
      light: [() => ({ Component: AutumnLeavesBackground })],
      dark: [() => ({ Component: AutumnLeavesBackground })],
    },
  }

const resolveBackgroundPreset = (
  isDark: boolean,
  date: Date,
): BackgroundPreset => {
  const pools = SEASON_PRESETS[getSeason(date)]
  const pool = isDark ? pools.dark : pools.light
  return (sample(pool) ?? pool[0])()
}

const getSeason = (date: Date): Season => {
  const month = date.getMonth()
  const day = date.getDate()
  if (month === 11 || month === 0) return 'deep-winter'
  if (month === 1 || (month === 2 && day <= 10)) return 'late-winter'
  if (month === 2 || (month === 3 && day <= 15)) return 'spring'
  if (month === 3 || month === 4) return 'late-spring'
  if (month === 5) return 'early-summer'
  if (month === 6 || month === 7) return 'high-summer'
  if (month === 8 || (month === 9 && day <= 15)) return 'early-autumn'
  return 'late-autumn'
}

const createSnowBackgroundProps = memoize(() => {
  const direction = sample(range(45, 135))
  const windSpeed = sample(range(10, 20))
  const intensity = sample(range(0.7, 0.9))
  const density = sample(range(1, 3))
  return {
    windSpeed,
    windDirection: direction,
    speed: 0.5,

    intensity,
    density,
  } satisfies SnowBackgroundProps
})

const createAjisaiBackgroundProps = (): AjisaiBackgroundProps => ({
  variant: 'full',
  density: 1.65,
  speed: 1.35,
  intensity: 1.3,
})

const createDiamondDustBackgroundProps = (): DiamondDustBackgroundProps => ({
  density: 2,
  speed: 2.05,
  intensity: 2.05,
})

const createKomorebiBackgroundProps = (): KomorebiBackgroundProps => ({
  spotCount: 40,
  driftSpeed: 1.8,
  pulseSpeed: 1.4,
  intensity: 1.9,
  warmth: 1.65,
  sizeScale: 1.65,
})

const createSakuraBackgroundProps = memoize(() => {
  const windDirection = sample(range(10, 60)) ?? 30
  const windSpeed = (sample(range(6, 13)) ?? 10) / 10
  const intensity = (sample(range(8, 12)) ?? 10) / 10
  const density = (sample(range(8, 13)) ?? 10) / 10
  const flutter = (sample(range(8, 13)) ?? 10) / 10
  const speed = (sample(range(9, 11)) ?? 10) / 10
  const volume = (sample(range(9, 12)) ?? 10) / 10
  const weight = (sample(range(9, 11)) ?? 10) / 10
  return {
    windSpeed,
    windDirection,
    speed,
    intensity,
    density,
    volume,
    weight,
    flutter,
  } satisfies SakuraBackgroundProps
})

const createWisteriaBackgroundProps = memoize(() => {
  const windDirection = sample(range(10, 60)) ?? 30
  const windSpeed = (sample(range(6, 13)) ?? 10) / 10
  const intensity = (sample(range(7, 10)) ?? 8) / 10
  const density = (sample(range(7, 10)) ?? 8) / 10
  const flutter = (sample(range(10, 15)) ?? 12) / 10
  const speed = (sample(range(9, 11)) ?? 10) / 10
  const volume = (sample(range(9, 12)) ?? 10) / 10
  const weight = (sample(range(9, 11)) ?? 10) / 10
  return {
    windSpeed,
    windDirection,
    speed,
    intensity,
    density,
    volume,
    weight,
    flutter,
  } satisfies WisteriaBackgroundProps
})
