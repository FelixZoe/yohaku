import type { ReactNode } from 'react'

interface HeroFrameProps {
  /** Big extralight number — the count. */
  count: number
  /** Tiny uppercase label above the number. */
  label: string
  /** Subtitle text rendered next to the number. */
  subtitle: string
  /** Title rendered as h1. */
  title: ReactNode
}

export const HeroFrame = ({
  label,
  count,
  subtitle,
  title,
}: HeroFrameProps) => (
  <header className="text-neutral-10">
    <div className="mb-4 text-caption-10 tracking-[4px] uppercase text-neutral-10/55">
      {label}
    </div>
    <div className="mb-2 flex items-baseline gap-3">
      <span className="text-[2.5rem] sm:text-[3.5rem] font-extralight tracking-tight leading-none text-neutral-10/85 tabular-nums">
        {count}
      </span>
      <span className="text-copy-13 text-neutral-10/55">{subtitle}</span>
    </div>
    <h1 className="text-title-28 font-medium leading-tight text-neutral-10">
      {title}
    </h1>
    <div className="mt-6 mb-7 h-px w-8 bg-accent/70" />
  </header>
)
