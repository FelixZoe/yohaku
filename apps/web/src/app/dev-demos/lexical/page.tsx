'use client'

import type { RichEditorVariant } from '@haklex/rich-editor'
import type { SerializedEditorState } from 'lexical'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { StyledButton } from '~/components/ui/button'
import { TextArea } from '~/components/ui/input'
import { EnrichmentMapProvider } from '~/components/ui/link-card/EnrichmentMapContext'
import { useModalStack } from '~/components/ui/modal'
import { LexicalContent } from '~/components/ui/rich-content/LexicalContent'
import type { SegmentedOption } from '~/components/ui/segmented'
import { Segmented } from '~/components/ui/segmented'

import { mockEnrichmentMap } from './_components/mock-enrichments'
import { mockPollAdapter } from './_components/mock-poll-adapter'
import { longFormState } from './_fixtures/long-form'
import { nodeCases } from './_fixtures/node-cases'

const longFormJSON = JSON.stringify(longFormState)

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
  variant,
}: {
  caseKey: string
  description: string
  label: string
  state: SerializedEditorState
  variant: RichEditorVariant
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
      <LexicalContent
        content={JSON.stringify(state)}
        pollAdapter={mockPollAdapter}
        variant={variant}
      />
    </article>
  )
}

const VARIANT_OPTIONS: SegmentedOption<RichEditorVariant>[] = [
  { description: '长文章；全节点、宽留白', label: 'Article', value: 'article' },
  { description: '评论；紧凑、节点裁减', label: 'Comment', value: 'comment' },
  { description: '随记；中度密度', label: 'Note', value: 'note' },
]

const CATEGORY_LABELS: Record<(typeof nodeCases)[number]['category'], string> =
  {
    builtin: 'Builtin nodes',
    callout: 'Callouts',
    interactive: 'Interactive',
    media: 'Media',
    'rich-block': 'Rich blocks',
  }

const CATEGORY_ORDER: (typeof nodeCases)[number]['category'][] = [
  'builtin',
  'media',
  'callout',
  'rich-block',
  'interactive',
]

function PasteJSONModal({
  dismiss,
  initial,
  onApply,
}: {
  dismiss: () => void
  initial: string
  onApply: (json: string) => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const handleRender = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('JSON 不可为空')
      return
    }
    try {
      JSON.parse(trimmed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON 解析失败')
      return
    }
    onApply(trimmed)
    dismiss()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <TextArea
        className="font-mono text-caption-12 leading-6"
        placeholder='粘 Lexical SerializedEditorState JSON …{"root":{"children":[…],"type":"root","version":1}}'
        value={value}
        wrapperClassName="min-h-0 flex-1"
        onCmdEnter={handleRender}
        onChange={(e) => {
          setValue(e.target.value)
          if (error) setError(null)
        }}
      />
      {error ? (
        <p className="text-caption-12 text-error">{error}</p>
      ) : (
        <p className="text-caption-12 text-neutral-6">⌘ / Ctrl + Enter 渲之</p>
      )}
      <div className="flex justify-end gap-3">
        <StyledButton variant="secondary" onClick={dismiss}>
          罢
        </StyledButton>
        <StyledButton variant="primary" onClick={handleRender}>
          渲之
        </StyledButton>
      </div>
    </div>
  )
}

export default function LexicalDemoPage() {
  const grouped = CATEGORY_ORDER.map((category) => ({
    cases: nodeCases.filter((c) => c.category === category),
    category,
  })).filter((group) => group.cases.length > 0)

  const [customJSON, setCustomJSON] = useState<string | null>(null)
  const [variant, setVariant] = useState<RichEditorVariant>('article')
  const { present } = useModalStack()

  const openPasteModal = () => {
    present({
      title: '渲自定 Lexical state',
      label: 'PASTE',
      max: true,
      content: ({ dismiss }) => (
        <PasteJSONModal
          dismiss={dismiss}
          initial={customJSON ?? ''}
          onApply={setCustomJSON}
        />
      ),
    })
  }

  return (
    <EnrichmentMapProvider value={mockEnrichmentMap}>
      <div className="mx-auto max-w-4xl space-y-20 px-4 py-16">
        <header className="space-y-3">
          <div className="text-caption-10 tracking-[0.18em] text-neutral-7 uppercase">
            dev · lexical
          </div>
          <h1 className="text-3xl font-semibold">Lexical 节点览图</h1>
          <p className="text-sm text-neutral-7">
            覆 Yohaku 注册之全部 builtin 与 module 节点。Poll 走 mock adapter；
            nested-doc / excalidraw 之 expand 经 PeekModal；mermaid 图可
            click-zoom（photo-viewer）。
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <StyledButton variant="primary" onClick={openPasteModal}>
              {customJSON ? '改自定 JSON…' : '粘 JSON 渲之…'}
            </StyledButton>
            {customJSON ? (
              <StyledButton
                variant="secondary"
                onClick={() => setCustomJSON(null)}
              >
                清自定
              </StyledButton>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-caption-12 text-neutral-6">variant</span>
              <Segmented
                ariaLabel="Rich content variant"
                options={VARIANT_OPTIONS}
                value={variant}
                onChange={setVariant}
              />
            </div>
          </div>
        </header>

        {customJSON ? (
          <Section
            description="自粘 SerializedEditorState 之即时渲染，便于核外部数据之兼容。"
            index="◎ 自定输入"
            title="Paste preview"
          >
            <LexicalContent
              content={customJSON}
              pollAdapter={mockPollAdapter}
              variant={variant}
            />
          </Section>
        ) : null}

        <Section
          description="一篇穿插全部节点之长文，验 LexicalContent 在 article 场景下之 compose 与 styling。"
          index="① 长文 showcase"
          title="Long-form article"
        >
          <LexicalContent
            content={longFormJSON}
            pollAdapter={mockPollAdapter}
            variant={variant}
          />
        </Section>

        <Section
          description="按 module 分节之矩阵，便专项校单节点之渲染与交互。"
          index="② 节点矩阵"
          title="Node matrix"
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
                      state={c.state}
                      variant={variant}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </EnrichmentMapProvider>
  )
}
