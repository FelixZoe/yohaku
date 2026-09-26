import clsx from 'clsx'
import type { PropsWithChildren } from 'react'

import { NoteLeftSidebar } from '~/components/modules/note/NoteLeftSidebar'
import { NoteMainContainerHeightProvider } from '~/components/modules/note/NoteMainContainer'
import { LayoutRightSideProvider } from '~/providers/shared/LayoutRightSideProvider'

export default async (props: PropsWithChildren) => (
  <NoteMainContainerHeightProvider>
    <div
      className={clsx(
        'relative mx-auto grid min-h-[calc(100vh-6.5rem-10rem)] max-w-[60rem]',
        'gap-4 md:grid-cols-1 xl:max-w-[calc(60rem+400px)] xl:grid-cols-[1fr_minmax(auto,60rem)_1fr]',
        'mt-12',
        'md:mt-24 print:block! print:max-w-full!',
      )}
    >
      <div
        data-hide-print
        className="yohaku-fadeable relative hidden min-w-0 transition-[opacity,filter] duration-[var(--yohaku-side-fade-ms)] ease-out xl:block"
      >
        <NoteLeftSidebar />
      </div>

      {props.children}

      <LayoutRightSideProvider className="pointer-events-none relative hidden xl:block print:hidden!" />
    </div>
  </NoteMainContainerHeightProvider>
)
