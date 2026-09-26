import type { FC, ReactNode } from 'react'

import { clsxm } from '~/lib/helper'

export const Section: FC<{
  id?: string
  title: string
  meta?: string
  children: ReactNode
  className?: string
}> = ({ id, title, meta, children, className }) => (
  <section className={clsxm('mb-16 scroll-mt-24', className)} id={id}>
    <header className="mb-5 border-b border-neutral-3 pb-3">
      <h2 className="text-label-12 font-mono uppercase tracking-[0.25em] text-neutral-7">
        {title}
      </h2>
      {meta ? (
        <p className="mt-1.5 text-copy-13 text-neutral-6">{meta}</p>
      ) : null}
    </header>
    {children}
  </section>
)

export const Subsection: FC<{
  title: string
  hint?: string
  children: ReactNode
  className?: string
}> = ({ title, hint, children, className }) => (
  <div className={clsxm('mb-10 last:mb-0', className)}>
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h3 className="text-copy-13 font-medium text-neutral-9">{title}</h3>
      {hint ? (
        <span className="text-label-12 font-mono text-neutral-6">{hint}</span>
      ) : null}
    </div>
    {children}
  </div>
)

export const Specimen: FC<{
  label: string
  hint?: string
  children: ReactNode
  className?: string
  /** layout of the specimen body. `'row'` (default) wraps atoms inline;
   * `'col'` stacks block-level demos full-width without `!important`. */
  stack?: 'row' | 'col'
}> = ({ label, hint, children, className, stack = 'row' }) => (
  <div
    className={clsxm(
      'rounded-lg border border-neutral-3 bg-paper/40 p-5',
      className,
    )}
  >
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <span className="text-label-12 font-mono uppercase tracking-[0.2em] text-neutral-7">
        {label}
      </span>
      {hint ? (
        <span className="text-label-12 text-neutral-6">{hint}</span>
      ) : null}
    </div>
    <div
      className={clsxm(
        'flex gap-3',
        stack === 'col' ? 'flex-col items-stretch' : 'flex-wrap items-center',
      )}
    >
      {children}
    </div>
  </div>
)

export const SpecimenStack: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={clsxm('grid gap-4 sm:grid-cols-2', className)}>
    {children}
  </div>
)
