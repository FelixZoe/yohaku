'use client'

import { StyledButton } from '~/components/ui/button'

import type { LocaleSuggestion } from './use-locale-suggestion'

export const LocaleSuggestionCapsulePanel = ({
  suggestion,
}: {
  suggestion: LocaleSuggestion
}) => (
  <div className="px-4 pb-4 pt-4">
    <p className="flex items-center gap-2 text-copy-15 text-neutral-9">
      <i className="i-mingcute-translate-2-fill shrink-0 text-neutral-6" />
      {suggestion.copy.message}
    </p>
    <div className="mt-3 flex items-center gap-2">
      <StyledButton size="sm" onClick={suggestion.accept}>
        {suggestion.copy.switchLabel}
      </StyledButton>
      <StyledButton size="sm" variant="ghost" onClick={suggestion.dismiss}>
        {suggestion.copy.dismissLabel}
      </StyledButton>
    </div>
  </div>
)
