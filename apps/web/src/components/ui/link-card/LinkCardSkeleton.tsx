import type { FC } from 'react'

import { clsxm } from '~/lib/helper'

/**
 * Size-stable skeleton matching the link-card shell. Used during cold-path
 * `/enrichment/resolve` loading; the dimensions mirror `LinkCardShell` so
 * cache miss → data swap does not cause CLS.
 */
export const LinkCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <span
    data-hide-print
    className={clsxm(
      'my-4 flex w-full max-w-[36rem] items-center gap-5 overflow-hidden rounded-xl bg-paper px-6 py-4 ring-1 ring-border not-prose',
      'min-h-[6.5rem]',
      className,
    )}
  >
    <span className="flex flex-1 flex-col gap-2">
      <span className="h-5 w-32 rounded bg-neutral-3" />
      <span className="h-3 w-full rounded bg-neutral-3" />
      <span className="h-3 w-3/4 rounded bg-neutral-3" />
    </span>
    <span className="size-14 shrink-0 rounded-lg bg-neutral-3" />
  </span>
)
