'use client'

import type { SerializedEditorState } from 'lexical'
import type { ReactNode } from 'react'

import { LexicalContent } from '~/components/ui/rich-content/LexicalContent'

import { mockPollAdapter } from '../_components/mock-poll-adapter'
import type { AfilmoryCase } from './_fixtures'
import { afilmoryCases } from './_fixtures'

const GROUP_ORDER: AfilmoryCase['group'][] = [
  'single',
  'list',
  'filter',
  'layout',
]

const GROUP_LABELS: Record<AfilmoryCase['group'], string> = {
  single: 'Single photo',
  list: 'Collection · list source',
  filter: 'Collection · filter source',
  layout: 'Collection · layout',
}

function Section({
  children,
  description,
  index,
  title,
}: {
  children: ReactNode
  description?: string
  index: string
  title: string
}) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="text-caption-10 tracking-[0.18em] text-neutral-7 uppercase">
          {index}
        </div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-neutral-7">{description}</p>
        ) : null}
      </header>
      <div className="h-px bg-neutral-3" />
      {children}
    </section>
  )
}

function CaseBlock({
  caseKey,
  description,
  label,
  state,
}: {
  caseKey: string
  description: string
  label: string
  state: SerializedEditorState
}) {
  return (
    <article className="space-y-3" data-case-key={caseKey}>
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-medium">{label}</h3>
          <code className="text-caption-12 text-neutral-6">{caseKey}</code>
        </div>
        <p className="text-sm text-neutral-7">{description}</p>
      </header>
      <LexicalContent
        content={JSON.stringify(state)}
        pollAdapter={mockPollAdapter}
      />
    </article>
  )
}

export default function AfilmoryDemoPage() {
  const grouped = GROUP_ORDER.map((group) => ({
    cases: afilmoryCases.filter((c) => c.group === group),
    group,
  })).filter((g) => g.cases.length > 0)

  return (
    <div className="mx-auto max-w-4xl space-y-20 px-4 py-16">
      <header className="space-y-3">
        <div className="text-caption-10 tracking-[0.18em] text-neutral-7 uppercase">
          dev · lexical · afilmory
        </div>
        <h1 className="text-3xl font-semibold">Afilmory nodes 览图</h1>
        <p className="text-sm text-neutral-7">
          专列 afilmory-photo 与 afilmory-collection 之全 cases。manifest 实拉
          innei.afilmory.art；某 case 之 photo id 若失效，将显 empty state。
          collection 之 "View All ↗" 跳 afilmory 同步呈现（URL filter 已
          bidirectional）。
        </p>
      </header>

      {grouped.map((group, idx) => (
        <Section
          description={undefined}
          index={`${String(idx + 1).padStart(2, '0')}`}
          key={group.group}
          title={GROUP_LABELS[group.group]}
        >
          <div className="space-y-12">
            {group.cases.map((c) => (
              <CaseBlock
                caseKey={c.key}
                description={c.description}
                key={c.key}
                label={c.label}
                state={c.state}
              />
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}
