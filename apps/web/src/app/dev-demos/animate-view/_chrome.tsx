'use client'

import type { ReactNode } from 'react'

import { findings, verdictLabel } from './_findings'

export const easeOut = [0.22, 1, 0.36, 1] as const

export const viewTransition = { duration: 0.28, ease: easeOut }

export function Lab({
  id,
  children,
}: {
  id: (typeof findings)[number]['id']
  children: ReactNode
}) {
  const finding = findings.find((item) => item.id === id)!

  return (
    <section className="border-b border-neutral-3 py-10" id={id}>
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-copy-15 text-neutral-9">{finding.title}</h2>
        <span className="shrink-0 font-mono text-caption-10 uppercase tracking-[0.16em] text-neutral-5">
          {verdictLabel[finding.verdict]}
        </span>
      </header>
      <p className="font-mono text-caption-10 uppercase tracking-[0.14em] text-neutral-5">
        {finding.source}
      </p>
      <p className="mt-3 max-w-prose text-copy-13 leading-[1.7] text-neutral-7">
        {finding.note}
      </p>
      <div className="mt-6 grid items-start gap-8 md:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

export function Column({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-caption-10 uppercase tracking-[0.16em] text-neutral-5">
          {title}
        </span>
        {action ? <div className="flex gap-2">{action}</div> : null}
      </div>
      <div className="rounded-xl border border-neutral-3 bg-neutral-1 px-4 py-4">
        {children}
      </div>
    </div>
  )
}

export function Toggle({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className="rounded-lg border border-neutral-3 px-3 py-1.5 text-copy-13 text-neutral-8"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
