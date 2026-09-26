import Link from 'next/link'
import type { FC } from 'react'

import { devDemos } from '../_demos'
import { AtomsSection } from './_sections/atoms'
import { ColorsSection } from './_sections/colors'
import { CompositesSection } from './_sections/composites'
import { DesignNav, DesignSidebar } from './_sections/nav'
import { Section } from './_sections/shared'
import { TypographySection } from './_sections/typography'

const navItems = [
  { id: 'colors', label: '01 · colors' },
  { id: 'typography', label: '02 · typography' },
  { id: 'atoms', label: '03 · atoms' },
  { id: 'composites', label: '04 · composites' },
  { id: 'further', label: '05 · further demos' },
]

const furtherDemos = devDemos.filter((d) => d.href !== '/dev-demos/design')

const FurtherSection: FC = () => (
  <Section
    id="further"
    meta="重组件 demo 已各立其页 · 完整目录见 /dev-demos。"
    title="05 · further demos"
  >
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {furtherDemos.map((d) => (
        <li key={d.href}>
          <Link
            className="group flex items-center justify-between rounded-lg border border-neutral-3 bg-paper/40 px-4 py-3 text-copy-13 text-neutral-8 transition-[border-color,color,transform] duration-150 hover:border-accent/40 hover:text-accent"
            href={d.href}
          >
            <span>{d.name}</span>
            <i className="i-mingcute-arrow-right-line text-icon-sm opacity-60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  </Section>
)

const PageHeader: FC = () => (
  <header className="mb-12 max-w-3xl">
    <p className="mb-2 flex items-center gap-2 font-mono text-label-12 uppercase tracking-[0.3em] text-neutral-6">
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full bg-accent"
      />
      @yohaku/design-system · /dev-demos/design
    </p>
    <h1 className="text-display-48 font-medium tracking-tight text-neutral-10">
      Design specimens
    </h1>
    <p className="mt-3 max-w-prose text-copy-14 leading-[1.8] text-neutral-7">
      一页尽览 · 色板、字阶、原子、组合。tokens 自{' '}
      <code className="rounded bg-neutral-2 px-1 py-0.5 font-mono text-label-12">
        @yohaku/design-system
      </code>{' '}
      ，运行时层（accent / paper / opacity）由 apps/web 注入。
    </p>
  </header>
)

export default function DesignSystemDemoPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-20">
        <aside className="hidden lg:block">
          <div className="sticky top-10">
            <DesignSidebar items={navItems} />
          </div>
        </aside>

        <main className="min-w-0">
          <PageHeader />

          <DesignNav className="lg:hidden" items={navItems} />

          <ColorsSection />
          <TypographySection />
          <AtomsSection />
          <CompositesSection />
          <FurtherSection />
        </main>
      </div>
    </div>
  )
}
