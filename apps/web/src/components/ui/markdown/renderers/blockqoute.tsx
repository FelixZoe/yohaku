import type { FC } from 'react'

import { GitAlert } from './alert'

export const MBlockQuote: FC<{
  className?: string
  children: React.ReactNode
  alert?: string
}> = ({ className, children, alert }) => {
  if (alert) {
    return <GitAlert text={children as string} type={alert} />
  }
  return <blockquote className={className}>{children}</blockquote>
}
