'use client'

import type { JSX, ReactNode } from 'react'
import * as React from 'react'

export const ProviderComposer: Component<{
  contexts: JSX.Element[]
}> = ({ contexts, children }) =>
  contexts.reduceRight(
    (kids: ReactNode, parent: JSX.Element) =>
      React.cloneElement(parent, { children: kids }),
    children,
  )
