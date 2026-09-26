'use client'

import { useEffect, useState } from 'react'

import { PageBleed } from '~/components/common/PageBleed'

const ACCENTS = [
  { label: '默认', value: '' },
  { label: '浅葱', value: 'oklch(0.68 0.09 205)' },
  { label: '桃', value: 'oklch(0.75 0.12 15)' },
  { label: '苔', value: 'oklch(0.67 0.15 145)' },
  { label: '琥珀', value: 'oklch(0.75 0.14 75)' },
]

export default function PageBleedDevPage() {
  const [replay, setReplay] = useState(0)
  const [seed, setSeed] = useState(0.5)
  const [hue, setHue] = useState(200)
  const [accent, setAccent] = useState('')

  useEffect(() => {
    const root = document.documentElement
    if (accent) root.style.setProperty('--color-accent', accent)
    else root.style.removeProperty('--color-accent')
    return () => {
      root.style.removeProperty('--color-accent')
    }
  }, [accent])

  const reseed = () => {
    setSeed(Math.round(Math.random() * 1000) / 1000)
    setHue(Math.round(Math.random() * 360))
    setReplay((n) => n + 1)
  }

  return (
    <>
      <PageBleed hue={hue} key={`${replay}-${seed}`} seed={seed} />

      <div className="mx-auto max-w-3xl pt-[132px]">
        <header className="mb-10">
          <p className="mb-3 font-mono text-caption-10 uppercase tracking-[0.3em] text-neutral-6">
            ambient · page bleed
          </p>
          <h1 className="text-display-36 font-medium tracking-tight text-neutral-10">
            天头场线
          </h1>
          <p className="mt-4 max-w-prose text-copy-14 leading-[1.8] text-neutral-7">
            六条横线被一个看不见的引力点吸起，引力点沿天头缓慢横移。开页时每条线
            从左缘起笔向右画出，起笔时刻与时长各不相同，约 2.4s 全部到位；之后线
            不再变化，只剩引力点在漂。形态由 seed 复算，油墨读 --color-accent。
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-y border-neutral-3 py-4">
          <button
            className="rounded border border-neutral-4 px-3 py-1.5 font-mono text-label-12 text-neutral-8 transition-colors hover:border-accent hover:text-accent"
            type="button"
            onClick={() => setReplay((n) => n + 1)}
          >
            重播划线
          </button>
          <button
            className="rounded border border-neutral-4 px-3 py-1.5 font-mono text-label-12 text-neutral-8 transition-colors hover:border-accent hover:text-accent"
            type="button"
            onClick={reseed}
          >
            换 seed
          </button>

          <span className="ml-2 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
            seed {seed.toFixed(3)} · hue {hue}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-3 py-4">
          <span className="mr-2 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
            accent
          </span>
          {ACCENTS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`rounded border px-3 py-1.5 font-mono text-label-12 transition-colors ${
                accent === item.value
                  ? 'border-accent text-accent'
                  : 'border-neutral-4 text-neutral-8 hover:border-accent hover:text-accent'
              }`}
              onClick={() => {
                setAccent(item.value)
                setReplay((n) => n + 1)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="py-8 text-copy-13 leading-[1.9] text-neutral-7">
          正文从这里开始。天头纹理不该抢走它的注意力——滚动时线随页面一起走，
          离屏与后台标签页停帧，prefers-reduced-motion 直接定格在画完的稳态。
        </p>
      </div>
    </>
  )
}
