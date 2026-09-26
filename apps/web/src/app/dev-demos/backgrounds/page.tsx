'use client'

import { useTheme } from 'next-themes'
import type { ComponentType } from 'react'
import { useMemo, useRef, useState } from 'react'

import { AjisaiBackground } from '~/components/ui/background/AjisaiBackground'
import { AutumnLeavesBackground } from '~/components/ui/background/AutumnLeavesBackground'
import { DiamondDustBackground } from '~/components/ui/background/DiamondDustBackground'
import { FireflyBackground } from '~/components/ui/background/FireflyBackground'
import { HanabiBackground } from '~/components/ui/background/HanabiBackground'
import { KazahanaBackground } from '~/components/ui/background/KazahanaBackground'
import { KinmokuseiBackground } from '~/components/ui/background/KinmokuseiBackground'
import { KomorebiBackground } from '~/components/ui/background/KomorebiBackground'
import { MinamoBackground } from '~/components/ui/background/MinamoBackground'
import { ParticlePhysics } from '~/components/ui/background/ParticlePhysics'
import { SakuraBackground } from '~/components/ui/background/SakuraBackground'
import { SnowBackground } from '~/components/ui/background/SnowBackground'
import { UmeBackground } from '~/components/ui/background/UmeBackground'
import { WisteriaBackground } from '~/components/ui/background/WisteriaBackground'
import { useTweakpane } from '~/hooks/common/use-tweakpane'

type ParticleControls = {
  windSpeed: number
  windDirection: number
  speed: number
  intensity: number
  density: number
  volume: number
  weight: number
  flutter: number
  spotCount: number
  driftSpeed: number
  pulseSpeed: number
  warmth: number
  sizeScale: number
}

const DEFAULT_CONTROLS: ParticleControls = {
  windSpeed: 1,
  windDirection: 30,
  speed: 1,
  intensity: 1,
  density: 1,
  volume: 1,
  weight: 1,
  flutter: 1,
  spotCount: 14,
  driftSpeed: 1,
  pulseSpeed: 1,
  warmth: 1,
  sizeScale: 1,
}

const SLIDER_RANGES: Record<
  keyof ParticleControls,
  { min: number; max: number; step: number }
> = {
  windSpeed: { min: 0, max: 3, step: 0.05 },
  windDirection: { min: 0, max: 360, step: 1 },
  speed: { min: 0, max: 3, step: 0.05 },
  intensity: { min: 0, max: 3, step: 0.05 },
  density: { min: 0, max: 3, step: 0.05 },
  volume: { min: 0, max: 3, step: 0.05 },
  weight: { min: 0, max: 3, step: 0.05 },
  flutter: { min: 0, max: 3, step: 0.05 },
  spotCount: { min: 1, max: 40, step: 1 },
  driftSpeed: { min: 0, max: 3, step: 0.05 },
  pulseSpeed: { min: 0, max: 3, step: 0.05 },
  warmth: { min: 0, max: 2, step: 0.05 },
  sizeScale: { min: 0.3, max: 3, step: 0.05 },
}

type ControlKey = keyof ParticleControls

type BackgroundDef = {
  id: string
  label: string
  Component: ComponentType<any>
  controls?: ControlKey[]
}

const BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'sakura',
    label: 'Sakura 樱',
    Component: SakuraBackground,
    controls: [
      'windSpeed',
      'windDirection',
      'speed',
      'intensity',
      'density',
      'volume',
      'weight',
      'flutter',
    ],
  },
  {
    id: 'wisteria',
    label: 'Wisteria 紫藤',
    Component: WisteriaBackground,
    controls: [
      'windSpeed',
      'windDirection',
      'speed',
      'intensity',
      'density',
      'volume',
      'weight',
      'flutter',
    ],
  },
  {
    id: 'snow',
    label: 'Snow 雪',
    Component: SnowBackground,
    controls: [
      'windSpeed',
      'windDirection',
      'speed',
      'intensity',
      'density',
      'volume',
      'weight',
    ],
  },
  { id: 'firefly', label: 'Firefly 萤', Component: FireflyBackground },
  {
    id: 'komorebi',
    label: 'Komorebi 木漏日',
    Component: KomorebiBackground,
    controls: [
      'spotCount',
      'driftSpeed',
      'pulseSpeed',
      'intensity',
      'warmth',
      'sizeScale',
    ],
  },
  { id: 'autumn', label: 'Autumn 红叶', Component: AutumnLeavesBackground },
  {
    id: 'ajisai-bokeh',
    label: 'Ajisai A 花影',
    Component: (props: any) => <AjisaiBackground {...props} variant="bokeh" />,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'ajisai-ripple',
    label: 'Ajisai B 雨纹',
    Component: (props: any) => <AjisaiBackground {...props} variant="ripple" />,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'ajisai-full',
    label: 'Ajisai C 花影+雨纹',
    Component: (props: any) => <AjisaiBackground {...props} variant="full" />,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'ajisai-petal',
    label: 'Ajisai D 花瓣',
    Component: (props: any) => <AjisaiBackground {...props} variant="petal" />,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'minamo',
    label: 'Minamo 水面',
    Component: MinamoBackground,
    controls: ['speed', 'intensity', 'sizeScale', 'density'],
  },
  {
    id: 'diamond-dust',
    label: 'DiamondDust 細氷',
    Component: DiamondDustBackground,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'kazahana',
    label: 'Kazahana 風花',
    Component: KazahanaBackground,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'ume',
    label: 'Ume 雪中紅梅',
    Component: UmeBackground,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'kinmokusei',
    label: 'Kinmokusei 金木犀',
    Component: KinmokuseiBackground,
    controls: ['density', 'speed', 'intensity'],
  },
  {
    id: 'hanabi',
    label: 'Hanabi 花火',
    Component: HanabiBackground,
    controls: ['density', 'speed', 'intensity'],
  },
  { id: 'particle', label: 'Particle 粒', Component: ParticlePhysics },
]

export default function BackgroundsDevPage() {
  const [activeId, setActiveId] = useState<string>(BACKGROUNDS[0].id)
  const [controls, setControls] = useState<ParticleControls>(DEFAULT_CONTROLS)
  const [resetKey, setResetKey] = useState(0)
  const paneHostRef = useRef<HTMLDivElement>(null)
  const { setTheme, theme } = useTheme()

  const controlsRef = useRef(controls)
  controlsRef.current = controls
  const themeRef = useRef(theme)
  themeRef.current = theme
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme

  const active = useMemo(
    () => BACKGROUNDS.find((b) => b.id === activeId) ?? BACKGROUNDS[0],
    [activeId],
  )

  const renderedProps = useMemo<Partial<ParticleControls>>(() => {
    if (!active.controls) return {}
    return Object.fromEntries(
      active.controls.map((k) => [k, controls[k]]),
    ) as Partial<ParticleControls>
  }, [active, controls])

  useTweakpane(
    paneHostRef,
    'Backgrounds',
    (pane) => {
      const params = {
        background: activeIdRef.current,
        theme: themeRef.current ?? 'system',
        ...controlsRef.current,
      }

      let paramsFolder: ReturnType<typeof pane.addFolder> | null = null
      let resetButton: ReturnType<typeof pane.addButton> | null = null
      let paramKeys: ControlKey[] = []

      const rebuildTail = () => {
        paramsFolder?.dispose()
        paramsFolder = null
        resetButton?.dispose()
        resetButton = null
        paramKeys = []

        const def =
          BACKGROUNDS.find((b) => b.id === params.background) ?? BACKGROUNDS[0]
        const keys = def.controls ?? []
        if (keys.length > 0) {
          paramKeys = keys
          Object.assign(
            params,
            Object.fromEntries(keys.map((k) => [k, controlsRef.current[k]])),
          )

          const folder = pane.addFolder({ title: 'Params' })
          paramsFolder = folder
          for (const key of keys) {
            folder.addBinding(params, key, {
              ...SLIDER_RANGES[key],
              label: key,
            })
          }
          folder.on('change', () =>
            setControls((prev) => ({
              ...prev,
              ...(Object.fromEntries(
                paramKeys.map((k) => [k, params[k as keyof typeof params]]),
              ) as Partial<ParticleControls>),
            })),
          )
        }

        resetButton = pane.addButton({ title: 'reset' }).on('click', () => {
          Object.assign(params, DEFAULT_CONTROLS)
          pane.refresh()
          setControls(DEFAULT_CONTROLS)
          setResetKey((n) => n + 1)
        })
      }

      pane
        .addBinding(params, 'background', {
          label: '背景',
          options: Object.fromEntries(BACKGROUNDS.map((b) => [b.label, b.id])),
        })
        .on('change', (event) => {
          const id = event.value as string
          params.background = id
          setActiveId(id)
          rebuildTail()
        })

      pane
        .addBinding(params, 'theme', {
          label: '主题',
          options: { light: 'light', dark: 'dark', system: 'system' },
        })
        .on('change', (event) => setThemeRef.current(event.value as string))

      rebuildTail()
    },
    [],
  )

  const Component = active.Component

  return (
    <>
      <div className="fixed inset-0 isolate">
        <div className="absolute inset-0 bg-[var(--surface-paper,theme(colors.neutral-1))]">
          <Component key={`${active.id}-${resetKey}`} {...renderedProps} />
        </div>
      </div>
      <div className="fixed right-4 top-20 z-50 w-64" ref={paneHostRef} />
    </>
  )
}
