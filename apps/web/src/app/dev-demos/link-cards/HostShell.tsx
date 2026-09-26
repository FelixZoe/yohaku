'use client'

import { HostProvider } from '@yohaku/rich-content/host'
import type { ReactNode } from 'react'

import { useWebHost } from '~/hooks/common/use-web-host'

export function HostShell({ children }: { children: ReactNode }) {
  const host = useWebHost()
  return <HostProvider host={host}>{children}</HostProvider>
}
