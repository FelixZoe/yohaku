'use client'

import { clsxm } from '~/lib/helper'

import { useHeaderBgOpacity } from './hooks'

export const HeaderLogoArea: Component = ({ children }) => {
  const headerOpacity = useHeaderBgOpacity()
  return (
    <div
      className={clsxm('relative', 'header--grid__logo')}
      style={{
        opacity: 1 - headerOpacity,
      }}
    >
      <div
        className={clsxm('relative flex size-full items-center justify-center')}
      >
        {children}
      </div>
    </div>
  )
}
