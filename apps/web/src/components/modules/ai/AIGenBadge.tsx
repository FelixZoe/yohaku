'use client'

import { useTranslations } from 'next-intl'
import type { ComponentPropsWithRef, FC, ReactElement, ReactNode } from 'react'

import { FloatPopover } from '~/components/ui/float-popover'
import { clsxm } from '~/lib/helper'

import type { AiGenValue, AiGenValueOrArray } from './ai-gen'
import { getAiGenDescription, getAiGenLabel, isAiGenPreset } from './ai-gen'

const HANDMADE_ICON = 'i-mingcute-quill-pen-fill'
const AI_ICON = 'i-mingcute-ai-fill'

type TriggerProps = {
  label: string
  iconClass?: string
} & ComponentPropsWithRef<'span'>

const Trigger: FC<TriggerProps> = ({
  label,
  iconClass = AI_ICON,
  className,
  ...rest
}) => (
  <span
    data-hide-print
    {...rest}
    className={clsxm(
      'inline-flex items-center gap-1 text-label-12 font-medium',
      className,
    )}
  >
    <i className={clsxm(iconClass, 'text-copy-13')} />
    <span className="max-w-64 truncate">{label}</span>
  </span>
)

const withTooltip = (trigger: ReactElement, content: ReactNode) => (
  <FloatPopover asChild mobileAsSheet triggerElement={trigger} type="tooltip">
    {content}
  </FloatPopover>
)

const SingleBadge: FC<{
  value: AiGenValueOrArray
  className?: string
}> = ({ value, className }) => {
  const t = useTranslations('ai')

  if (!isAiGenPreset(value)) {
    return <Trigger className={className} label={String(value)} />
  }

  const iconClass = value === -1 ? HANDMADE_ICON : AI_ICON
  const trigger = (
    <Trigger
      className={className}
      iconClass={iconClass}
      label={getAiGenLabel(t, value)}
    />
  )
  return withTooltip(trigger, getAiGenDescription(t, value))
}

const MultiBadge: FC<{
  values: AiGenValue[]
  className?: string
}> = ({ values, className }) => {
  const t = useTranslations('ai')
  const items = values.map((v) => ({
    value: v,
    label: isAiGenPreset(v) ? getAiGenLabel(t, v) : String(v),
    description: isAiGenPreset(v) ? getAiGenDescription(t, v) : null,
  }))

  if (items.length === 0) return null

  const trigger = (
    <Trigger
      className={className}
      label={items.map((item) => item.label).join(' · ')}
    />
  )

  const content = (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div className="flex flex-col gap-1" key={item.value}>
          <span className="font-medium">{item.label}</span>
          {item.description && (
            <span className="text-copy-13 opacity-80">{item.description}</span>
          )}
        </div>
      ))}
    </div>
  )

  return withTooltip(trigger, content)
}

export const AIGenBadge: FC<{
  value?: AiGenValueOrArray | AiGenValueOrArray[]
  className?: string
}> = ({ value, className }) => {
  if (value === undefined || value === null) return null

  // Flatten and normalize the value to an array of AiGenValue
  const normalizeToArray = (
    val: AiGenValueOrArray | AiGenValueOrArray[],
  ): AiGenValue[] => {
    if (Array.isArray(val)) {
      return val.flatMap((v) => (Array.isArray(v) ? v : [v]))
    }
    return [val]
  }

  const normalized = normalizeToArray(value)

  if (normalized.length === 0) return null

  // Merge into single badge when 2+ items
  if (normalized.length >= 2) {
    return <MultiBadge className={className} values={normalized} />
  }

  return (
    <span className="inline-flex gap-1">
      {normalized.map((v) => (
        <SingleBadge className={className} key={v} value={v} />
      ))}
    </span>
  )
}
