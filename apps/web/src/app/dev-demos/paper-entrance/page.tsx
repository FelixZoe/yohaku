'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import {
  HydrationEndDetector,
  useIsHydrationEnded,
} from '~/components/common/HydrationEndDetector'
import { PaperWithEntrance } from '~/components/layout/container/PaperWithEntrance'

import type { StackTextMode } from './_variants'
import {
  InkRegisterPaper,
  RatedStage,
  Specimen,
  StackShiftPaper,
  TEXT_MODES,
} from './_variants'

const RATES = [1, 0.5, 0.25]

const variants = (
  textMode: StackTextMode,
): { id: string; label: string; hint: string; node: ReactNode }[] => [
  {
    id: 'current',
    label: '生产 · PaperWithEntrance',
    hint: '线上 hook：B 纸堆换页 + 正文随纸',
    node: (
      <PaperWithEntrance as="section" stackSheetCount={3}>
        <Specimen />
      </PaperWithEntrance>
    ),
  },
  {
    id: 'ink',
    label: 'A · 墨迹套准',
    hint: '纸不动，只落阴影；正文从错版淡墨收拢到套准',
    node: <InkRegisterPaper />,
  },
  {
    id: 'stack',
    label: 'B · 纸堆换页',
    hint: `后一张滑到正面，纸堆顺移一位；正文${TEXT_MODES.find((m) => m.id === textMode)!.hint}`,
    node: <StackShiftPaper textMode={textMode} />,
  },
]

function Column({
  label,
  hint,
  rate,
  children,
}: {
  label: string
  hint: string
  rate: number
  children: ReactNode
}) {
  const [run, setRun] = useState(0)

  return (
    <div className="min-w-0">
      <button
        className="group mb-6 block text-left"
        type="button"
        onClick={() => setRun((n) => n + 1)}
      >
        <span className="font-mono text-label-12 text-neutral-9 group-hover:text-accent">
          {label} ↻
        </span>
        <span className="mt-1 block text-copy-13 text-neutral-6">{hint}</span>
      </button>
      <RatedStage key={run} rate={rate}>
        {children}
      </RatedStage>
    </div>
  )
}

export default function PaperEntranceDemoPage() {
  const hydrated = useIsHydrationEnded()
  const [replay, setReplay] = useState(0)
  const [rate, setRate] = useState(1)
  const [textMode, setTextMode] = useState<StackTextMode>('wipe')

  return (
    <div className="mx-auto max-w-[88rem]">
      <HydrationEndDetector />

      <header className="mb-10 max-w-3xl">
        <p className="mb-3 font-mono text-caption-10 uppercase tracking-[0.3em] text-neutral-6">
          ambient · paper entrance
        </p>
        <h1 className="text-display-36 font-medium tracking-tight text-neutral-10">
          纸张出场
        </h1>
        <p className="mt-4 max-w-prose text-copy-14 leading-[1.8] text-neutral-7">
          三种出场并排。首帧照生产逻辑跳过，约 2s 后自动播一次；点标题单独重播。
          纸堆背层只在 lg 以上视口出现。
        </p>
        <a
          className="mt-3 inline-block font-mono text-label-12 text-accent underline-offset-4 hover:underline"
          href="/dev-demos/paper-entrance/long"
        >
          → 长文实景（B · 真实 note 版式）
        </a>
        <a
          className="mt-1 block font-mono text-label-12 text-accent underline-offset-4 hover:underline"
          href="/dev-demos/paper-entrance/translate"
        >
          → 译文刷写替换（ready / 切换）
        </a>
      </header>

      <div className="mb-14 flex flex-wrap items-center gap-2 border-y border-neutral-3 py-4">
        <button
          className="rounded border border-neutral-4 px-3 py-1.5 font-mono text-label-12 text-neutral-8 transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          disabled={!hydrated}
          type="button"
          onClick={() => setReplay((n) => n + 1)}
        >
          {hydrated ? '全部重播' : '等待 hydration…'}
        </button>
        <span className="ml-4 mr-1 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
          speed
        </span>
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            className={`rounded border px-2.5 py-1.5 font-mono text-label-12 transition-colors ${
              r === rate
                ? 'border-accent text-accent'
                : 'border-neutral-4 text-neutral-7 hover:text-neutral-9'
            }`}
            onClick={() => {
              setRate(r)
              setReplay((n) => n + 1)
            }}
          >
            ×{r}
          </button>
        ))}
        <span className="ml-4 mr-1 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
          B 正文
        </span>
        {TEXT_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`rounded border px-2.5 py-1.5 font-mono text-label-12 transition-colors ${
              m.id === textMode
                ? 'border-accent text-accent'
                : 'border-neutral-4 text-neutral-7 hover:text-neutral-9'
            }`}
            onClick={() => {
              setTextMode(m.id)
              setReplay((n) => n + 1)
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        className="grid gap-x-16 gap-y-20 lg:grid-cols-3"
        key={`${hydrated}-${replay}`}
      >
        {variants(textMode).map((v) => (
          <Column hint={v.hint} key={v.id} label={v.label} rate={rate}>
            {v.node}
          </Column>
        ))}
      </div>
    </div>
  )
}
