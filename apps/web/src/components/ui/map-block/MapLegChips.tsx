import { clsx } from 'clsx'

interface MapLegChipsProps {
  active: number | null
  items: Array<{ label: string; meta?: string | null }>
  onChange: (index: number | null) => void
}

export function MapLegChips({ active, items, onChange }: MapLegChipsProps) {
  return (
    <div
      aria-label="Legs"
      className="flex gap-1.5 overflow-x-auto border-t border-border bg-paper px-3 py-2 [scrollbar-width:none] dark:bg-neutral-3"
      role="group"
    >
      <LegChip
        label="All"
        meta={String(items.length)}
        pressed={active === null}
        onClick={() => onChange(null)}
      />
      {items.map((item, index) => (
        <LegChip
          key={index}
          label={item.label || `Leg ${index + 1}`}
          meta={item.meta}
          pressed={active === index}
          onClick={() => onChange(index)}
        />
      ))}
    </div>
  )
}

function LegChip({
  label,
  meta,
  onClick,
  pressed,
}: {
  label: string
  meta?: string | null
  onClick: () => void
  pressed: boolean
}) {
  return (
    <button
      aria-pressed={pressed}
      type="button"
      className={clsx(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-label-12 font-medium ring-1 transition-colors active:scale-[0.96]',
        pressed
          ? 'bg-accent/12 text-neutral-10 ring-accent/60'
          : 'text-neutral-8 ring-border hover:bg-neutral-2 dark:hover:bg-neutral-4',
      )}
      onClick={onClick}
    >
      {label}
      {meta && <span className="text-neutral-6 tabular-nums">{meta}</span>}
    </button>
  )
}
