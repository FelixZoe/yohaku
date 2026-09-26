'use client'

import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { m } from 'motion/react'
import type { FC, PropsWithChildren } from 'react'
import * as React from 'react'
import { useId, useMemo, useState } from 'react'

import { clsxm } from '~/lib/helper'

import { Markdown } from '../Markdown'

export const Tabs: FC<PropsWithChildren> = ({ children }) => {
  const id = useId()

  const tabs = useMemo(() => {
    const labels = [] as string[]
    for (const child of React.Children.toArray(children)) {
      if (!child) {
        continue
      }
      if (typeof child !== 'object') continue
      if (!('props' in child)) continue
      if (!('type' in child)) continue

      if (child.type !== Tab) continue
      const { label } = child.props as any as { label: string }
      labels.push(label)
    }
    return labels
  }, [children])
  const [activeTab, setActiveTab] = useState<string | null>(tabs[0])
  return (
    <BaseTabs.Root value={activeTab || ''} onValueChange={setActiveTab}>
      <BaseTabs.List className="flex gap-2">
        {tabs.map((tab) => (
          <BaseTabs.Tab
            key={tab}
            value={tab}
            className={clsxm(
              'relative flex px-2 py-1 text-copy-13 font-bold focus:outline-hidden',
              'text-neutral-7 transition-colors duration-300',
            )}
          >
            {tab}

            {activeTab === tab && (
              <m.div
                layout
                className="absolute inset-x-2 -bottom-1 h-[2px] rounded-md bg-accent"
                layoutId={`tab${id}`}
              />
            )}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>

      {children}
    </BaseTabs.Root>
  )
}

export const Tab: FC<{
  label: string
  children: React.ReactNode
}> = ({ label, children }) => (
  <BaseTabs.Panel
    className="animate-in fade-in animation-duration-500"
    value={label}
  >
    <Markdown removeWrapper wrapper={null}>
      {children as string}
    </Markdown>
  </BaseTabs.Panel>
)
