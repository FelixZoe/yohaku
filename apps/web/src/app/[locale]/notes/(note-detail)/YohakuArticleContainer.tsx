'use client'

import type { PropsWithChildren } from 'react'

import { AmbientImageSides } from '~/components/common/AmbientImageSides'
import { AMBIENT_SCOPE_CLASS } from '~/components/common/AmbientImageSides/constants'
import { useYohakuArticleRef } from '~/components/modules/yohaku/YohakuArticleShell'

import { IndentArticleContainer } from './[id]/pageExtra'

export function YohakuArticleContainer({
  children,
  prose = true,
}: PropsWithChildren<{ prose?: boolean }>) {
  const articleRef = useYohakuArticleRef()
  return (
    <IndentArticleContainer
      className={AMBIENT_SCOPE_CLASS}
      prose={prose}
      ref={articleRef}
    >
      <AmbientImageSides />
      {children}
    </IndentArticleContainer>
  )
}
