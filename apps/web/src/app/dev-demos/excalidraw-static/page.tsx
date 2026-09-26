'use client'

import { HostProvider } from '@yohaku/rich-content/host'
import { StaticExcalidraw } from '@yohaku/rich-content/src/lexical/portable/excalidraw/index.ts'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { StyledButton } from '~/components/ui/button'
import { TextArea } from '~/components/ui/input'
import { useModalStack } from '~/components/ui/modal'
import { useWebHost } from '~/hooks/common/use-web-host'

import { fixtures } from './_fixtures/scenes'

function PasteExcalidrawJSONModal({
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
      const parsed = JSON.parse(trimmed)
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray((parsed as { elements?: unknown }).elements)
      ) {
        setError('JSON 须含 elements 数组')
        return
      }
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
        placeholder='粘 Excalidraw scene JSON … {"type":"excalidraw","elements":[...],"appState":{...},"files":{}}'
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

function CaseCard({
  caseKey,
  description,
  jsonString,
  title,
}: {
  caseKey: string
  description: string
  jsonString: string
  title: string
}) {
  const [showSource, setShowSource] = useState(false)
  return (
    <article
      className="space-y-4 rounded-lg border border-neutral-3 bg-(--surface-paper) p-4"
      data-case-key={caseKey}
    >
      <header className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-base font-medium">{title}</h3>
        <code className="text-caption-12 text-neutral-6">{caseKey}</code>
        <button
          className="ml-auto text-caption-12 text-neutral-7 hover:text-neutral-10"
          type="button"
          onClick={() => setShowSource((s) => !s)}
        >
          {showSource ? 'hide source' : 'show source'}
        </button>
      </header>
      <p className="text-sm text-neutral-7">{description}</p>
      <div className="h-[280px] overflow-hidden rounded border border-neutral-2 bg-white dark:bg-neutral-1">
        <StaticExcalidraw data={jsonString} />
      </div>
      {showSource && (
        <pre className="max-h-[240px] overflow-auto rounded bg-neutral-1 p-3 text-caption-10 leading-5">
          {jsonString}
        </pre>
      )}
    </article>
  )
}

export default function ExcalidrawStaticDemoPage() {
  const { present } = useModalStack()
  const devHost = useWebHost()

  const fixturesWithSource = useMemo(
    () =>
      fixtures.map((f) => ({
        ...f,
        jsonString: JSON.stringify(f.scene, null, 2),
      })),
    [],
  )

  const [customJson, setCustomJson] = useState<string | null>(null)

  const openPasteModal = useCallback(() => {
    present({
      title: '粘 Excalidraw JSON',
      label: 'PASTE',
      max: true,
      content: ({ dismiss }) => (
        <PasteExcalidrawJSONModal
          dismiss={dismiss}
          initial={customJson ?? ''}
          onApply={setCustomJson}
        />
      ),
    })
  }, [present, customJson])

  return (
    <HostProvider host={devHost}>
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <header className="space-y-3">
          <div className="text-caption-10 tracking-[0.18em] text-neutral-7 uppercase">
            DEV / Excalidraw Static
          </div>
          <h1 className="text-3xl font-semibold">Excalidraw 静态渲染样张</h1>
          <p className="text-sm text-neutral-7">
            以 SVG + rough.js 自绘，无 <code>@excalidraw/excalidraw</code>{' '}
            依赖。 覆盖矩形 / 椭圆 / 菱形 / 线条 / 箭头 / 自由绘 / 文本 /
            占位等常态。
          </p>
          <div className="flex gap-3">
            <StyledButton variant="primary" onClick={openPasteModal}>
              粘 JSON 试渲
            </StyledButton>
            {customJson && (
              <StyledButton
                variant="secondary"
                onClick={() => setCustomJson(null)}
              >
                清自渲
              </StyledButton>
            )}
            <StyledButton
              variant="secondary"
              onClick={() =>
                globalThis.scrollTo({ top: 0, behavior: 'smooth' })
              }
            >
              回顶
            </StyledButton>
          </div>
        </header>

        {customJson && (
          <Section
            description="入文之 JSON 即渲于此。可拖拽、Cmd/Ctrl + 滚轮缩放，按 ⛶ 全屏。"
            index="0 · CUSTOM"
            title="自渲样"
          >
            <CaseCard
              caseKey="custom"
              description="出自粘 JSON 入口"
              jsonString={customJson}
              title="Custom JSON"
            />
          </Section>
        )}

        <Section
          description="rectangle / ellipse / diamond，含 hachure、cross-hatch、solid 三种填充。"
          index="A · BASICS"
          title="基本图元"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {fixturesWithSource
              .filter((f) => /^(?:rect|ellipse|diamond)/.test(f.key))
              .map((f) => (
                <CaseCard
                  caseKey={f.key}
                  description={f.description}
                  jsonString={f.jsonString}
                  key={f.key}
                  title={f.title}
                />
              ))}
          </div>
        </Section>

        <Section
          description="solid / dashed / dotted 三态，arrow / triangle / dot / bar 头部，弯曲 arrow。"
          index="B · LINES"
          title="线条与箭头"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {fixturesWithSource
              .filter((f) => /^(?:line|arrow)/.test(f.key))
              .map((f) => (
                <CaseCard
                  caseKey={f.key}
                  description={f.description}
                  jsonString={f.jsonString}
                  key={f.key}
                  title={f.title}
                />
              ))}
          </div>
        </Section>

        <Section
          description="freedraw 点序列径直渲为 SVG path。"
          index="C · FREEDRAW"
          title="手绘"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {fixturesWithSource
              .filter((f) => f.key.startsWith('freedraw'))
              .map((f) => (
                <CaseCard
                  caseKey={f.key}
                  description={f.description}
                  jsonString={f.jsonString}
                  key={f.key}
                  title={f.title}
                />
              ))}
          </div>
        </Section>

        <Section
          description="Excalifont (fontFamily=5)、Helvetica (=2)、Cascadia (=3) 三族；对齐与多行。"
          index="D · TEXT"
          title="文本"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {fixturesWithSource
              .filter((f) => f.key.startsWith('text'))
              .map((f) => (
                <CaseCard
                  caseKey={f.key}
                  description={f.description}
                  jsonString={f.jsonString}
                  key={f.key}
                  title={f.title}
                />
              ))}
          </div>
        </Section>

        <Section
          description="多图元合 — 矩形 + 菱形 + 文本 + 箭头。"
          index="E · COMPOSITE"
          title="综合：流程图"
        >
          <div className="grid gap-6">
            {fixturesWithSource
              .filter((f) => f.key.startsWith('flowchart'))
              .map((f) => (
                <CaseCard
                  caseKey={f.key}
                  description={f.description}
                  jsonString={f.jsonString}
                  key={f.key}
                  title={f.title}
                />
              ))}
          </div>
        </Section>

        <Section
          description="image 无 dataURL、frame、embeddable 皆退为标记占位。"
          index="F · PLACEHOLDERS"
          title="占位"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {fixturesWithSource
              .filter((f) => f.key === 'placeholders')
              .map((f) => (
                <CaseCard
                  caseKey={f.key}
                  description={f.description}
                  jsonString={f.jsonString}
                  key={f.key}
                  title={f.title}
                />
              ))}
          </div>
        </Section>
      </div>
    </HostProvider>
  )
}
