'use client'

import { useState } from 'react'

import {
  HydrationEndDetector,
  useIsHydrationEnded,
} from '~/components/common/HydrationEndDetector'
import { EnrichmentMapProvider } from '~/components/ui/link-card/EnrichmentMapContext'
import { Markdown } from '~/components/ui/markdown/Markdown'
import { clsxm } from '~/lib/helper'

import { mockEnrichmentMap } from '../../lexical/_components/mock-enrichments'
import { longFormMarkdown } from '../../markdown/_fixtures/long-form'
import type { StackTextMode } from '../_variants'
import { RatedStage, StackShiftPaper, TEXT_MODES } from '../_variants'

const RATES = [1, 0.5, 0.25]

const LONG_ARTICLE = `${longFormMarkdown}\n\n---\n\n${longFormMarkdown.replaceAll('[^fin]', '[^fin2]')}`

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={clsxm(
        'rounded border px-2.5 py-1 font-mono text-label-12 transition-colors',
        active
          ? 'border-accent text-accent'
          : 'border-neutral-4 text-neutral-7 hover:text-neutral-9',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function PaperEntranceLongPage() {
  const hydrated = useIsHydrationEnded()
  const [replay, setReplay] = useState(0)
  const [rate, setRate] = useState(1)
  const [textMode, setTextMode] = useState<StackTextMode>('wipe')
  const restart = () => {
    window.scrollTo({ top: 0 })
    setReplay((n) => n + 1)
  }

  return (
    <EnrichmentMapProvider value={mockEnrichmentMap}>
      <HydrationEndDetector />

      <div className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center gap-2 border-b border-neutral-3 bg-neutral-1/90 px-6 py-3 backdrop-blur">
        <a
          className="mr-3 font-mono text-label-12 text-neutral-6 hover:text-accent"
          href="/dev-demos/paper-entrance"
        >
          ← 对比
        </a>
        <button
          className="rounded border border-neutral-4 px-3 py-1 font-mono text-label-12 text-neutral-8 hover:border-accent hover:text-accent disabled:opacity-40"
          disabled={!hydrated}
          type="button"
          onClick={restart}
        >
          {hydrated ? '重播' : '等待 hydration…'}
        </button>
        <span className="ml-3 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
          speed
        </span>
        {RATES.map((r) => (
          <Pill
            active={r === rate}
            key={r}
            onClick={() => {
              setRate(r)
              restart()
            }}
          >
            {`×${r}`}
          </Pill>
        ))}
        <span className="ml-3 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
          正文
        </span>
        {TEXT_MODES.map((m) => (
          <Pill
            active={m.id === textMode}
            key={m.id}
            onClick={() => {
              setTextMode(m.id)
              restart()
            }}
          >
            {m.label}
          </Pill>
        ))}
      </div>

      <div
        className={clsxm(
          'relative mx-auto grid max-w-[60rem]',
          'gap-4 md:grid-cols-1 xl:max-w-[calc(60rem+400px)] xl:grid-cols-[1fr_minmax(auto,60rem)_1fr]',
          'mt-12 md:mt-24',
        )}
      >
        <div className="hidden xl:block" />
        <RatedStage key={`${hydrated}-${replay}`} rate={rate}>
          <StackShiftPaper textMode={textMode}>
            <div className="prose">
              <Markdown value={LONG_ARTICLE} />
            </div>
          </StackShiftPaper>
        </RatedStage>
        <div className="hidden xl:block" />
      </div>
    </EnrichmentMapProvider>
  )
}
