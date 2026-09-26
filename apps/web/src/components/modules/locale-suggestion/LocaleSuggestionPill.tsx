'use client'

import { AnimatePresence, m } from 'motion/react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { StyledButton } from '~/components/ui/button'
import { softSpringPreset } from '~/constants/spring'
import { useIsClient } from '~/hooks/common/use-is-client'

import { useLocaleSuggestion } from './use-locale-suggestion'

export const LocaleSuggestionPill = () => {
  const isClient = useIsClient()
  const isMobile = useIsMobile()

  if (!isClient || isMobile) return null

  return <LocaleSuggestionPillImpl />
}

const LocaleSuggestionPillImpl = () => {
  const suggestion = useLocaleSuggestion()

  return (
    <div
      data-hide-print
      className="pointer-events-none absolute inset-x-0 top-4 z-[9] lg:top-[4.75rem] flex justify-center"
    >
      <AnimatePresence>
        {suggestion && (
          <m.div
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-black/5 bg-[#fefefb] py-1.5 pl-4 pr-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_14px_rgba(0,0,0,0.06)] dark:border-white/[0.04] dark:bg-neutral-2 dark:shadow-[0_1px_2px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)]"
            exit={{ opacity: 0, y: -24 }}
            initial={{ opacity: 0, y: -24 }}
            key={suggestion.locale}
            role="status"
            transition={softSpringPreset}
          >
            <span className="flex items-center gap-2 text-copy-13 text-neutral-9">
              <i className="i-mingcute-translate-2-fill text-neutral-6" />
              {suggestion.copy.message}
            </span>
            <StyledButton
              className="rounded-full"
              size="sm"
              onClick={suggestion.accept}
            >
              {suggestion.copy.switchLabel}
            </StyledButton>
            <button
              aria-label={suggestion.copy.dismissLabel}
              className="flex size-6 items-center justify-center rounded-full text-neutral-6 transition-colors hover:text-neutral-9"
              type="button"
              onClick={suggestion.dismiss}
            >
              <i className="i-mingcute-close-line" />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
