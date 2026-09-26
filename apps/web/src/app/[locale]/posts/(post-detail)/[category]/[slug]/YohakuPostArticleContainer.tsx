'use client'

import { clsx } from 'clsx'
import type { PropsWithChildren } from 'react'

import { AmbientImageSides } from '~/components/common/AmbientImageSides'
import { AMBIENT_SCOPE_CLASS } from '~/components/common/AmbientImageSides/constants'
import { useYohakuArticleRef } from '~/components/modules/yohaku/YohakuArticleShell'

export function YohakuPostArticleContainer({
  children,
  prose,
  fadeTail,
}: PropsWithChildren<{ prose: boolean; fadeTail?: boolean }>) {
  const articleRef = useYohakuArticleRef()
  return (
    <article
      ref={articleRef}
      className={clsx(
        prose && 'prose',
        AMBIENT_SCOPE_CLASS,
        fadeTail &&
          '[mask-image:linear-gradient(to_bottom,#000_calc(100%-6rem),transparent)]',
      )}
    >
      <AmbientImageSides />
      {children}
    </article>
  )
}
