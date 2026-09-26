import type { FC } from 'react'

import { Section, Subsection } from './shared'

type TypeRow = {
  token: string
  className: string
  size: string
  lh: string
  sample: string
}

const scale: TypeRow[] = [
  {
    token: 'display-48',
    className: 'text-display-48',
    size: '48',
    lh: '1.17',
    sample: '余白以待',
  },
  {
    token: 'display-36',
    className: 'text-display-36',
    size: '36',
    lh: '1.22',
    sample: '余白以待',
  },
  {
    token: 'title-28',
    className: 'text-title-28',
    size: '28',
    lh: '1.29',
    sample: '页眉一级',
  },
  {
    token: 'title-24',
    className: 'text-title-24',
    size: '24',
    lh: '1.33',
    sample: '段头二级',
  },
  {
    token: 'title-20',
    className: 'text-title-20',
    size: '20',
    lh: '1.4',
    sample: '小节标题',
  },
  {
    token: 'copy-16',
    className: 'text-copy-16',
    size: '16',
    lh: '1.625',
    sample: '正文最大号，用于强调段落或入门导读。',
  },
  {
    token: 'copy-15',
    className: 'text-copy-15',
    size: '15',
    lh: '1.6',
    sample: '正文加号，用于密度较低的卡片。',
  },
  {
    token: 'copy-14',
    className: 'text-copy-14',
    size: '14',
    lh: '1.57',
    sample: '正文基准 · 1rem 锚定。',
  },
  {
    token: 'copy-13',
    className: 'text-copy-13',
    size: '13',
    lh: '1.54',
    sample: '常规正文 · 默认密度。',
  },
  {
    token: 'label-12',
    className: 'text-label-12',
    size: '12',
    lh: '1.5',
    sample: 'META · 元信息 / 标签',
  },
  {
    token: 'caption-10',
    className: 'text-caption-10 uppercase tracking-[0.18em]',
    size: '10',
    lh: '1.4',
    sample: 'EYEBROW',
  },
]

const families: { token: string; className: string; sample: string }[] = [
  {
    token: 'font-sans',
    className: 'font-sans',
    sample: 'The quick brown fox · 余白以待 · 0123456789',
  },
  {
    token: 'font-serif',
    className: 'font-serif',
    sample: 'The quick brown fox · 余白以待 · 0123456789',
  },
  {
    token: 'font-mono',
    className: 'font-mono',
    sample: 'const x = 42; // 0123 · ABC ⟶ def',
  },
  {
    token: 'font-logo-cjk',
    className: 'font-[var(--font-logo-cjk)]',
    sample: '余白 · 灯下读书',
  },
  {
    token: 'font-logo-latin',
    className: 'font-[var(--font-logo-latin)]',
    sample: 'Yohaku · Designed Margins',
  },
]

const TypeSpecimen: FC<TypeRow> = ({ token, className, size, lh, sample }) => (
  <div className="flex items-baseline gap-6 border-b border-neutral-3/60 py-3 last:border-b-0">
    <div className="w-32 shrink-0">
      <div className="font-mono text-label-12 text-neutral-9">{token}</div>
      <div className="mt-0.5 font-mono text-caption-10 text-neutral-6">
        {size}px · lh {lh}
      </div>
    </div>
    <div className={className}>{sample}</div>
  </div>
)

const FamilySpecimen: FC<{
  token: string
  className: string
  sample: string
}> = ({ token, className, sample }) => (
  <div className="flex items-baseline gap-6 border-b border-neutral-3/60 py-3 last:border-b-0">
    <div className="w-32 shrink-0 font-mono text-label-12 text-neutral-9">
      {token}
    </div>
    <div className={`${className} text-copy-16 text-neutral-9`}>{sample}</div>
  </div>
)

export const TypographySection: FC = () => (
  <Section
    id="typography"
    meta="尺寸 + 行高同绑 (single source)；字重独立 (font-normal / medium)。CJK 禁合成粗体。banned: text-xs/sm/base/...、text-[Npx]。"
    title="02 · typography"
  >
    <Subsection hint="caption → display" title="Scale · 尺寸阶梯">
      <div className="rounded-lg border border-neutral-3 bg-paper/40 px-5">
        {scale.map((row) => (
          <TypeSpecimen key={row.token} {...row} />
        ))}
      </div>
    </Subsection>

    <Subsection hint="font-sans 为正文基准" title="Families · 字族">
      <div className="rounded-lg border border-neutral-3 bg-paper/40 px-5">
        {families.map((row) => (
          <FamilySpecimen key={row.token} {...row} />
        ))}
      </div>
    </Subsection>

    <Subsection hint="font-normal / font-medium" title="Weights · 字重">
      <div className="flex flex-wrap gap-6 rounded-lg border border-neutral-3 bg-paper/40 p-5">
        <span className="text-title-24 font-normal text-neutral-9">
          400 · 常规
        </span>
        <span className="text-title-24 font-medium text-neutral-9">
          500 · 中粗 · CJK 上限
        </span>
        <span className="text-title-24 font-semibold text-neutral-9">
          600 · 仅 Latin
        </span>
      </div>
    </Subsection>
  </Section>
)
