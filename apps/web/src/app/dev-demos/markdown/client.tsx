'use client'

import type { ReactNode } from 'react'

import { EnrichmentMapProvider } from '~/components/ui/link-card/EnrichmentMapContext'
import { Markdown } from '~/components/ui/markdown/Markdown'
import { useIsClient } from '~/hooks/common/use-is-client'

import { mockEnrichmentMap } from '../lexical/_components/mock-enrichments'
import { longFormMarkdown } from './_fixtures/long-form'
import type { SyntaxCase } from './_fixtures/syntax-cases'
import { syntaxCases } from './_fixtures/syntax-cases'

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
  source,
}: {
  caseKey: string
  description: string
  label: string
  source: string
}) {
  return (
    <article className="space-y-4" data-case-key={caseKey}>
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-medium">{label}</h3>
          <code className="text-caption-12 text-neutral-6">{caseKey}</code>
        </div>
        <p className="text-sm text-neutral-7">{description}</p>
      </header>
      <div className="prose">
        <Markdown value={source} />
      </div>
    </article>
  )
}

const CATEGORY_LABELS: Record<SyntaxCase['category'], string> = {
  builtin: 'Builtin syntax',
  callout: 'Callouts',
  interactive: 'Interactive',
  media: 'Media',
  'rich-block': 'Rich blocks',
}

const CATEGORY_ORDER: SyntaxCase['category'][] = [
  'builtin',
  'media',
  'callout',
  'rich-block',
  'interactive',
]

export function MarkdownDemoClient({ scratch }: { scratch: string | null }) {
  const isClient = useIsClient()
  if (!isClient) return null

  const grouped = CATEGORY_ORDER.map((category) => ({
    cases: syntaxCases.filter((c) => c.category === category),
    category,
  })).filter((group) => group.cases.length > 0)

  return (
    <EnrichmentMapProvider value={mockEnrichmentMap}>
      <div className="mx-auto max-w-4xl space-y-20 px-4 py-16">
        <header className="space-y-3">
          <div className="text-caption-10 tracking-[0.18em] text-neutral-7 uppercase">
            dev · markdown
          </div>
          <h1 className="text-3xl font-semibold">Markdown 语法览图</h1>
          <p className="text-sm text-neutral-7">
            覆 Yohaku Markdown 渲染器之全部语法：overrides（表格 / 媒体 /
            details）、extendsRules（container / KaTeX / mention /
            spoiler）。LinkCard 走 mock enrichment map，与 lexical 览图同源。
          </p>
        </header>

        <Section
          description="一篇穿插全部语法之长文，验 Markdown 在 article（prose）场景下之 compose 与 styling。"
          index="① 长文 showcase"
          title="Long-form article"
        >
          <div className="prose">
            <Markdown value={longFormMarkdown} />
          </div>
        </Section>

        <Section
          description="按语法分节之矩阵，便专项校单语法之渲染与交互。"
          index="② 语法矩阵"
          title="Syntax matrix"
        >
          <div className="space-y-16">
            {grouped.map((group) => (
              <div className="space-y-8" key={group.category}>
                <h3 className="text-caption-12 tracking-[0.12em] text-neutral-7 uppercase">
                  {CATEGORY_LABELS[group.category]}
                </h3>
                <div className="space-y-12">
                  {group.cases.map((c) => (
                    <CaseBlock
                      caseKey={c.key}
                      description={c.description}
                      key={c.key}
                      label={c.label}
                      source={c.source}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {scratch ? (
          <Section
            description="读自 ~/test-text.md 之草稿，便以真实文稿即时预览。"
            index="③ 草稿预览"
            title="Scratch preview"
          >
            <div className="prose">
              <Markdown value={scratch} />
            </div>
          </Section>
        ) : null}
      </div>
    </EnrichmentMapProvider>
  )
}
