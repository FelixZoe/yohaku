import '@yohaku/rich-content/block-styles.css'

import type { FC, ReactNode } from 'react'

const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const

type AlertType = (typeof ALERT_TYPES)[number]

const ALERT_LABELS: Record<AlertType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

function normalizeType(type: string): AlertType {
  const lower = type.toLowerCase() as AlertType
  return ALERT_TYPES.includes(lower) ? lower : 'note'
}

export const GitAlert: FC<{ type: string; text: ReactNode }> = ({
  type,
  text,
}) => {
  const safeType = normalizeType(type)
  return (
    <div className={`rich-alert rich-alert-${safeType}`}>
      <div className="rich-alert-yohaku-label" data-type={safeType}>
        <span aria-hidden className="rich-alert-yohaku-dot" />
        <span className="rich-alert-yohaku-label-text">
          {ALERT_LABELS[safeType]}
        </span>
      </div>
      <div className="rich-alert-content [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {text}
      </div>
    </div>
  )
}
