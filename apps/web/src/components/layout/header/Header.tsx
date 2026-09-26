import './internal/grid.css'

import { memo } from 'react'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { LocaleSuggestionPill } from '~/components/modules/locale-suggestion/LocaleSuggestionPill'
import { clsxm } from '~/lib/helper'

import { AnimatedLogo } from './internal/AnimatedLogo'
import { HeaderLogoArea } from './internal/HeaderArea'
import { HeaderContent } from './internal/HeaderContent'
import { HeaderDataConfigureProvider } from './internal/HeaderDataConfigureProvider'
import { MobileHeader } from './internal/MobileHeader'
import { UserAuth } from './internal/UserAuth'

export const Header = () => (
  <ErrorBoundary>
    <HeaderDataConfigureProvider>
      <MemoedHeader />
    </HeaderDataConfigureProvider>
  </ErrorBoundary>
)
const MemoedHeader = memo(() => {
  return (
    <>
      <MobileHeader />
      <HeaderContent />
      <LocaleSuggestionPill />

      <div
        data-hide-print
        className="yohaku-page-right-inset fixed top-0 z-[9] hidden h-[4.5rem] lg:inset-x-0 lg:block"
      >
        <div
          className={clsxm(
            'relative mx-auto grid h-full min-h-0 max-w-7xl grid-cols-[4.5rem_1fr_4.5rem] px-8',
            'header--grid',
          )}
        >
          <HeaderLogoArea>
            <AnimatedLogo />
          </HeaderLogoArea>

          <div />

          <div className="flex size-full items-center">
            <UserAuth />
          </div>
        </div>
      </div>
    </>
  )
})

MemoedHeader.displayName = 'MemoedHeader'
