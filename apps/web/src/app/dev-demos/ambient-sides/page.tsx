'use client'

import { useCallback, useRef, useState } from 'react'

import type { AmbientDebug } from '~/components/common/AmbientImageSides'
import { AmbientImageSides } from '~/components/common/AmbientImageSides'
import type { AmbientOptions } from '~/components/common/AmbientImageSides/constants'
import {
  AMBIENT_DEFAULTS,
  AMBIENT_SCOPE_CLASS,
} from '~/components/common/AmbientImageSides/constants'
import { LexicalContent } from '~/components/ui/rich-content/LexicalContent'
import { useTweakpane } from '~/hooks/common/use-tweakpane'
import { LexicalImageRecordProvider } from '~/providers/article/LexicalImageRecordProvider'

import { soakPostState } from './_fixtures/soak-post'

const CONTENT = JSON.stringify(soakPostState)
const MONITOR = { readonly: true, interval: 120 } as const

export default function AmbientSidesDevPage() {
  const [options, setOptions] = useState<AmbientOptions>(AMBIENT_DEFAULTS)
  const paneHostRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef({ envelope: 0, alpha: 0, velocity: 0, gate: 1 })

  useTweakpane(
    paneHostRef,
    'Ambient Sides',
    (pane) => {
      const params: AmbientOptions = { ...AMBIENT_DEFAULTS }
      const bind = (
        key: keyof AmbientOptions,
        label: string,
        min: number,
        max: number,
        step: number,
      ) => pane.addBinding(params, key, { label, min, max, step })

      bind('peak', '峰值 α 亮', 0, 0.4, 0.005)
      bind('peakDark', '峰值 α 暗', 0, 0.4, 0.005)
      bind('envelope', '包络饱满', 0.15, 1.5, 0.05)
      bind('depth', '侧缘深度', 5, 70, 1)
      bind('tintChroma', '彩度 C', 0, 0.2, 0.005)
      bind('tintLight', '明度 L 亮', 0.3, 0.95, 0.01)
      bind('tintLightDark', '明度 L 暗', 0.2, 0.8, 0.01)
      bind('solid', '实色基底', 0, 1, 0.05)
      bind('grainDensity', '颗粒密度', 0.1, 1, 0.02)
      bind('grainScale', '颗粒尺度', 64, 512, 8)
      bind('tauSlow', 'τ 慢读', 60, 700, 10)
      bind('tauFast', 'τ 快滚', 300, 2200, 10)
      bind('fadeStrength', '快滚淡出', 0, 1, 0.01)

      const readout = pane.addFolder({ title: '读数' })
      readout.addBinding(readoutRef.current, 'envelope', {
        ...MONITOR,
        label: '包络',
      })
      readout.addBinding(readoutRef.current, 'alpha', {
        ...MONITOR,
        label: 'α',
      })
      readout.addBinding(readoutRef.current, 'velocity', {
        ...MONITOR,
        label: 'v px/s',
      })
      readout.addBinding(readoutRef.current, 'gate', {
        ...MONITOR,
        label: 'gate',
      })

      pane.on('change', () => setOptions({ ...params }))
      pane.addButton({ title: '重置为默认值' }).on('click', () => {
        Object.assign(params, AMBIENT_DEFAULTS)
        pane.refresh()
        setOptions({ ...AMBIENT_DEFAULTS })
      })
    },
    [],
  )

  const onDebug = useCallback((debug: AmbientDebug) => {
    const readout = readoutRef.current
    readout.envelope = Number(debug.envelope.toFixed(3))
    readout.alpha = Number(debug.alpha.toFixed(4))
    readout.velocity = Math.round(debug.velocity)
    readout.gate = Number(debug.gate.toFixed(2))
  }, [])

  return (
    <>
      <div
        className="fixed right-4 top-4 z-50 w-80 [--cnt-vw:150px]"
        ref={paneHostRef}
      />

      <LexicalImageRecordProvider content={CONTENT}>
        <div
          className={`mx-auto max-w-2xl px-6 pb-[60vh] pt-16 ${AMBIENT_SCOPE_CLASS}`}
        >
          <AmbientImageSides options={options} onDebug={onDebug} />
          <LexicalContent content={CONTENT} />
        </div>
      </LexicalImageRecordProvider>
    </>
  )
}
