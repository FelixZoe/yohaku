import type { FC, ReactNode } from 'react'

import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

interface ListPaginationNavProps {
  ariaLabel?: string
  className?: string
  hasNext: boolean
  hasPrev: boolean
  info?: ReactNode
  nextHref?: string
  nextLabel: string
  prevHref?: string
  prevLabel: string
}

const baseClass =
  'inline-flex items-center gap-1.5 text-label-12 uppercase tracking-[2.5px]'

const linkClass = `${baseClass} text-neutral-7 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none`

const disabledClass = `${baseClass} text-neutral-4 cursor-default`

const iconClass = 'text-copy-13 shrink-0'

export const ListPaginationNav: FC<ListPaginationNavProps> = ({
  hasPrev,
  hasNext,
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
  info,
  ariaLabel = 'Pagination',
  className,
}) => {
  return (
    <nav
      aria-label={ariaLabel}
      className={clsxm(
        'mt-20 border-t border-neutral-3/60 pt-5',
        'grid grid-cols-[1fr_auto_1fr] items-center gap-3',
        className,
      )}
    >
      {hasPrev && prevHref ? (
        <Link aria-label={prevLabel} className={linkClass} href={prevHref}>
          <i
            aria-hidden
            className={`i-mingcute-arrow-left-line ${iconClass}`}
          />
          <span>{prevLabel}</span>
        </Link>
      ) : (
        <span aria-disabled className={disabledClass}>
          <i
            aria-hidden
            className={`i-mingcute-arrow-left-line ${iconClass}`}
          />
          <span>{prevLabel}</span>
        </span>
      )}

      <span aria-hidden className="text-neutral-4">
        ·
      </span>

      {hasNext && nextHref ? (
        <Link
          aria-label={nextLabel}
          className={clsxm(linkClass, 'justify-self-end')}
          href={nextHref}
        >
          <span>{nextLabel}</span>
          <i
            aria-hidden
            className={`i-mingcute-arrow-right-line ${iconClass}`}
          />
        </Link>
      ) : (
        <span
          aria-disabled
          className={clsxm(disabledClass, 'justify-self-end')}
        >
          <span>{nextLabel}</span>
          <i
            aria-hidden
            className={`i-mingcute-arrow-right-line ${iconClass}`}
          />
        </span>
      )}

      {info && (
        <span className="col-span-full mt-2 text-center text-caption-10 uppercase tracking-[3px] text-neutral-5 tabular-nums">
          {info}
        </span>
      )}
    </nav>
  )
}
