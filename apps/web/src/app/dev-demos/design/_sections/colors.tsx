'use client'

import type { FC, ReactNode } from 'react'

import { clsxm } from '~/lib/helper'

import { Section, Subsection } from './shared'

type Swatch = {
  token: string
  hex?: string
  cssVar?: string
  className: string
  textOn?: 'light' | 'dark'
  note?: string
}

const neutralScale: Swatch[] = [
  {
    token: 'neutral-1',
    hex: '#f9f8f5',
    className: 'bg-neutral-1',
    textOn: 'light',
    note: 'tier 1 · surface',
  },
  {
    token: 'neutral-2',
    hex: '#f0efeb',
    className: 'bg-neutral-2',
    textOn: 'light',
    note: 'tier 1',
  },
  {
    token: 'neutral-3',
    hex: '#e3e1db',
    className: 'bg-neutral-3',
    textOn: 'light',
    note: 'tier 1',
  },
  {
    token: 'neutral-4',
    hex: '#d0cec6',
    className: 'bg-neutral-4',
    textOn: 'light',
    note: 'tier 1 · fill edge',
  },
  {
    token: 'neutral-5',
    hex: '#a8a69f',
    className: 'bg-neutral-5',
    textOn: 'light',
    note: 'tier 2 · border / icon · 禁用于文字',
  },
  {
    token: 'neutral-6',
    hex: '#787670',
    className: 'bg-neutral-6',
    textOn: 'dark',
    note: 'tier 2 · 仅小字',
  },
  {
    token: 'neutral-7',
    hex: '#5c5a55',
    className: 'bg-neutral-7',
    textOn: 'dark',
    note: 'tier 2 · 次级文本',
  },
  {
    token: 'neutral-8',
    hex: '#403f3a',
    className: 'bg-neutral-8',
    textOn: 'dark',
    note: 'tier 3 · body',
  },
  {
    token: 'neutral-9',
    hex: '#24231f',
    className: 'bg-neutral-9',
    textOn: 'dark',
    note: 'tier 3 · default body',
  },
  {
    token: 'neutral-10',
    hex: '#141312',
    className: 'bg-neutral-10',
    textOn: 'dark',
    note: 'tier 3 · headline',
  },
]

const semanticScale: Swatch[] = [
  {
    token: 'info',
    hex: '#3d6896',
    className: 'bg-info',
    textOn: 'dark',
    note: '縹 hanada',
  },
  {
    token: 'success',
    hex: '#5e9f7e',
    className: 'bg-success',
    textOn: 'dark',
    note: '若竹 wakatake',
  },
  {
    token: 'warning',
    hex: '#a87a3d',
    className: 'bg-warning',
    textOn: 'dark',
    note: '朽葉 kuchiba',
  },
  {
    token: 'error',
    hex: '#a64953',
    className: 'bg-error',
    textOn: 'dark',
    note: '蘇芳 suoh',
  },
]

const surfaceScale: Swatch[] = [
  {
    token: 'paper',
    cssVar: '--surface-paper',
    className: 'bg-paper',
    textOn: 'light',
    note: 'page surface · 主题随暗亮翻转',
  },
  {
    token: 'border',
    cssVar: '--color-border',
    className: 'bg-paper border-2 border-[var(--color-border)] text-neutral-9',
    textOn: 'light',
    note: '边线色 · 暗亮主题各自覆盖',
  },
  {
    token: 'themed bg_opacity',
    cssVar: '--bg-opacity',
    className: 'bg-[var(--bg-opacity)]',
    textOn: 'light',
    note: '半透磨砂 · 用于浮层基底',
  },
]

const SwatchCard: FC<Swatch & { showHex?: boolean }> = ({
  token,
  hex,
  cssVar,
  className,
  textOn,
  note,
  showHex = true,
}) => (
  <div
    className={clsxm(
      'group flex h-[120px] flex-col justify-between rounded-lg p-3 ring-1 ring-black/[0.03] dark:ring-white/[0.04]',
      className,
      textOn === 'dark' ? 'text-neutral-1' : 'text-neutral-9',
    )}
  >
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-label-12">{token}</span>
      {showHex && hex ? (
        <span className="font-mono text-label-12 opacity-70">{hex}</span>
      ) : null}
    </div>
    <div className="flex flex-col gap-0.5">
      {cssVar ? (
        <span className="font-mono text-caption-10 opacity-70">{cssVar}</span>
      ) : null}
      {note ? <span className="text-caption-10 opacity-80">{note}</span> : null}
    </div>
  </div>
)

const AccentSpecimen: FC = () => (
  <div className="space-y-3">
    <div className="flex h-[120px] flex-col justify-between rounded-lg bg-accent p-3 text-neutral-1 ring-1 ring-black/[0.03]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-label-12">accent · --a</span>
        <span className="font-mono text-label-12 opacity-70">
          OKLCH runtime
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-caption-10 opacity-80">
          AccentColorStyleInjector · 浅葱 / 桃 双主题
        </span>
        <span className="font-mono text-caption-10 opacity-80">
          static fallback · --color-accent #c56473
        </span>
      </div>
    </div>
    <AlphaScale base="accent" />
  </div>
)

const AlphaScale: FC<{ base: 'accent' | 'neutral-9' }> = ({ base }) => {
  const stops = [4, 8, 12, 16, 24, 32, 50, 70, 100]
  return (
    <div className="flex overflow-hidden rounded-lg ring-1 ring-black/[0.04] dark:ring-white/[0.05]">
      {stops.map((s) => (
        <div
          key={s}
          style={{ opacity: s / 100 }}
          title={`${base} / ${s}%`}
          className={clsxm(
            'flex h-12 flex-1 items-end justify-center pb-1 font-mono text-caption-10',
            base === 'accent'
              ? 'bg-accent text-neutral-1'
              : 'bg-neutral-9 text-neutral-1',
          )}
        >
          {s}
        </div>
      ))}
    </div>
  )
}

const TierBlock: FC<{
  caption: string
  range: string
  swatches: Swatch[]
}> = ({ caption, range, swatches }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-label-12 font-mono uppercase tracking-[0.2em] text-neutral-6">
        {caption}
      </span>
      <span className="text-label-12 font-mono text-neutral-5">{range}</span>
    </div>
    <Grid cols={4}>
      {swatches.map((s) => (
        <SwatchCard key={s.token} {...s} />
      ))}
    </Grid>
  </div>
)

const Grid: FC<{ children: ReactNode; cols?: 2 | 3 | 4 | 5 }> = ({
  children,
  cols = 5,
}) => (
  <div
    className={clsxm(
      'grid gap-3',
      cols === 2 && 'grid-cols-2',
      cols === 3 && 'grid-cols-2 sm:grid-cols-3',
      cols === 4 && 'grid-cols-2 sm:grid-cols-4',
      cols === 5 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    )}
  >
    {children}
  </div>
)

export const ColorsSection: FC = () => (
  <Section
    id="colors"
    meta="design-system 静契约 + apps/web 运行时覆盖。neutral 暗模反相为纯灰，warmth 由 paper 单独承之。"
    title="01 · color tokens"
  >
    <Subsection hint="--a · OKLCH 运行时注入" title="Accent · 动态强调色">
      <AccentSpecimen />
    </Subsection>

    <Subsection
      hint="3-tier · n-5 禁字 · neutral-50~950 全域禁用"
      title="Neutral · 素 1–10"
    >
      <div className="space-y-5">
        <TierBlock
          caption="tier 1 · surface / fill"
          range="1 – 4"
          swatches={neutralScale.slice(0, 4)}
        />
        <TierBlock
          caption="tier 2 · border / icon · 次级文本"
          range="5 – 7"
          swatches={neutralScale.slice(4, 7)}
        />
        <TierBlock
          caption="tier 3 · body / heading"
          range="8 – 10"
          swatches={neutralScale.slice(7, 10)}
        />
      </div>
    </Subsection>

    <Subsection hint="info / success / warning / error" title="Semantic · 和色">
      <Grid cols={4}>
        {semanticScale.map((s) => (
          <SwatchCard key={s.token} {...s} />
        ))}
      </Grid>
    </Subsection>

    <Subsection hint="apps/web variables.css" title="Surfaces · 运行时层">
      <Grid cols={3}>
        {surfaceScale.map((s) => (
          <SwatchCard key={s.token} {...s} showHex={false} />
        ))}
      </Grid>
    </Subsection>

    <Subsection hint="border / overlay 常用" title="Alpha · neutral-9 阶梯">
      <AlphaScale base="neutral-9" />
    </Subsection>
  </Section>
)
