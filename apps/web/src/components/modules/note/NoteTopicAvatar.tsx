'use client'

import { Avatar } from '~/components/ui/avatar'

const topicNameToFallbackText = (name: string | undefined) => {
  if (!name) return ''

  const splitOnce = name.split(' ')[0]
  return splitOnce.length > 4 ? name[0] : splitOnce
}

export const NoteTopicAvatar = ({
  alt,
  className,
  icon,
  name,
  rounded,
  size,
}: {
  alt: string
  className?: string
  icon?: string | null
  name: string
  rounded?: 'full' | number
  size: number
}) => (
  <Avatar
    alt={alt}
    className={className}
    rounded={rounded}
    size={size}
    src={icon}
    text={topicNameToFallbackText(name)}
  />
)
