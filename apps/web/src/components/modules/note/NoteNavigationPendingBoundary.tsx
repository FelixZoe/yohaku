'use client'

import { FullPageLoading } from '~/components/ui/loading'
import { clsxm } from '~/lib/helper'
import { useIsNoteNavigationPending } from '~/providers/note/CurrentNoteIdProvider'

export const NoteNavigationPendingBoundary: Component = ({ children }) => {
  const isPending = useIsNoteNavigationPending()

  return (
    <div
      aria-busy={isPending}
      className="relative min-w-0"
      data-note-navigation-pending={isPending ? '' : undefined}
    >
      <div
        aria-hidden={isPending || undefined}
        inert={isPending || undefined}
        className={clsxm(
          'transition-opacity duration-150',
          isPending && 'pointer-events-none invisible opacity-0',
        )}
      >
        {children}
      </div>

      {isPending && (
        <div className="absolute inset-x-0 top-0 z-[4]">
          <FullPageLoading />
        </div>
      )}
    </div>
  )
}
