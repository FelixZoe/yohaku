'use client'

import type { FC, ReactNode } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'

import { TocAside } from '../toc'
import { ReadIndicator } from './ReadIndicator'

export const ArticleRightAside: Component<{
  accessory?: ReactNode | FC
  tocFooterSlot?: ReactNode
}> = ({ children, accessory, tocFooterSlot }) => {
  const isMobile = useIsMobile()
  if (isMobile) return <div />

  return (
    <ArticleRightAsideImpl accessory={accessory} tocFooterSlot={tocFooterSlot}>
      {children}
    </ArticleRightAsideImpl>
  )
}

const ArticleRightAsideImpl: FC<{
  children?: ReactNode
  accessory?: ReactNode | FC
  tocFooterSlot?: ReactNode
}> = ({ children, accessory, tocFooterSlot }) => (
  <aside className="pointer-events-none mt-[120px] h-[calc(100vh-6rem-4.5rem-150px-120px)]">
    <div className="pointer-events-auto relative h-full ml-10">
      <TocAside
        accessory={accessory ?? ReadIndicator}
        as="div"
        className="static"
        footerSlot={tocFooterSlot}
        treeClassName="min-h-[120px]"
      />
    </div>
    {children && (
      <div className="pointer-events-auto ml-10 translate-y-[calc(100%+24px)]">
        {children}
      </div>
    )}
  </aside>
)
