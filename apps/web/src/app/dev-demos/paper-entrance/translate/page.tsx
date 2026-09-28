'use client'

import { Fragment, useEffect, useState } from 'react'

import { HydrationEndDetector } from '~/components/common/HydrationEndDetector'
import { swapPaperContentInPlace } from '~/components/layout/container/paper-swap'
import { PaperWithEntrance } from '~/components/layout/container/PaperWithEntrance'
import { clsxm } from '~/lib/helper'

import type { ArticleLang } from './_article'
import { ARTICLE, ARTICLE_LANG_LABEL } from './_article'

const RATES = [1, 0.5, 0.25]
const LANGS: ArticleLang[] = ['zh', 'en', 'ja']
const TRANSLATION_DELAY_MS = 1600

function Pill({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean
  children: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      disabled={disabled}
      type="button"
      className={clsxm(
        'rounded border px-2.5 py-1 font-mono text-label-12 transition-colors disabled:opacity-40',
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

function Label({ children }: { children: string }) {
  return (
    <span className="ml-3 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
      {children}
    </span>
  )
}

function Article({ lang }: { lang: ArticleLang }) {
  const { date, title, paragraphs } = ARTICLE[lang]
  return (
    <article lang={lang}>
      <p className="mb-2 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-6">
        {date}
      </p>
      <h1 className="mb-10 text-title-28 font-medium text-neutral-10">
        {title}
      </h1>
      <div className="space-y-6 text-copy-16 leading-[2] text-neutral-8">
        {(['first', 'second'] as const).map((half) => (
          <Fragment key={half}>
            {half === 'second' && (
              <p className="text-center text-neutral-5">＊</p>
            )}
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Fragment>
        ))}
      </div>
    </article>
  )
}

function applySwap(animated: boolean, rate: number, update: () => void) {
  if (!animated) {
    update()
    return
  }
  swapPaperContentInPlace(update)
  const started = performance.now()
  const slowDown = () => {
    const wipes = document
      .getAnimations()
      .filter((a) =>
        (a.effect as KeyframeEffect | null)?.pseudoElement?.includes(
          'paper-content',
        ),
      )
    if (wipes.length > 0 || performance.now() - started > 400) {
      document.getAnimations().forEach((a) => (a.playbackRate = rate))
      return
    }
    setTimeout(slowDown, 8)
  }
  slowDown()
}

export default function TranslationSwapDemoPage() {
  const [lang, setLang] = useState<ArticleLang>('zh')
  const [pending, setPending] = useState<ArticleLang | null>(null)
  const [animated, setAnimated] = useState(true)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      applySwap(animated, rate, () => setLang(pending))
      setPending(null)
    }, TRANSLATION_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pending, animated, rate])

  const swapTo = (next: ArticleLang) => {
    if (next !== lang) applySwap(animated, rate, () => setLang(next))
  }

  const simulateReady = () => {
    setLang('zh')
    setPending('en')
  }

  return (
    <>
      <HydrationEndDetector />

      <div className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center gap-2 border-b border-neutral-3 bg-neutral-1/90 px-6 py-3 backdrop-blur">
        <a
          className="mr-3 font-mono text-label-12 text-neutral-6 hover:text-accent"
          href="/dev-demos/paper-entrance"
        >
          ← 对比
        </a>
        <Label>场景 A</Label>
        <Pill disabled={!!pending} onClick={simulateReady}>
          {pending ? `${pending} 译文生成中…` : '读原文时 en 译文 ready'}
        </Pill>
        <Label>场景 B · 切换</Label>
        {LANGS.map((l) => (
          <Pill
            active={l === lang}
            disabled={!!pending}
            key={l}
            onClick={() => swapTo(l)}
          >
            {ARTICLE_LANG_LABEL[l]}
          </Pill>
        ))}
        <Label>效果</Label>
        <Pill active={animated} onClick={() => setAnimated(true)}>
          刷写替换
        </Pill>
        <Pill active={!animated} onClick={() => setAnimated(false)}>
          直接替换
        </Pill>
        <Label>speed</Label>
        {RATES.map((r) => (
          <Pill active={r === rate} key={r} onClick={() => setRate(r)}>
            {`×${r}`}
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
        <PaperWithEntrance as="section" stackSheetCount={3}>
          <Article lang={lang} />
        </PaperWithEntrance>
        <div className="hidden xl:block" />
      </div>
    </>
  )
}
