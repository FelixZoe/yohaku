import clsx from 'clsx'

import { SolidBookmark } from '~/components/icons/bookmark'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { Link } from '~/i18n/navigation'

import type { TimelineEntry } from './types'
import { useTimelineReveal } from './useTimelineReveal'

interface TimelineItemProps {
  dense?: boolean
  entry: TimelineEntry
  onBookmarkClick?: () => void
  peek?: boolean
  typeLabel?: string
}

export const TimelineItem = ({
  entry,
  peek = true,
  dense = false,
  typeLabel,
  onBookmarkClick,
}: TimelineItemProps) => {
  const LinkComponent = peek ? PeekLink : Link
  const day = entry.date.getDate().toString().padStart(2, '0')
  const ref = useTimelineReveal<HTMLAnchorElement>()

  return (
    <LinkComponent
      className={clsx('yohaku-tl-item', dense && 'yohaku-tl-item--dense')}
      data-id={entry.id}
      href={entry.href}
      ref={ref}
    >
      <span className="yohaku-tl-date">{day}</span>
      <span className="yohaku-tl-title">{entry.title}</span>
      {entry.important && (
        <SolidBookmark
          className="ml-0.5 shrink-0 text-red-500"
          onClick={onBookmarkClick}
        />
      )}
      {dense
        ? typeLabel && <span className="yohaku-tl-type">{typeLabel}</span>
        : entry.meta.length > 0 && (
            <span className="yohaku-tl-meta">{entry.meta.join(' · ')}</span>
          )}
    </LinkComponent>
  )
}
