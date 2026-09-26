import clsx from 'clsx'

import { SolidBookmark } from '~/components/icons/bookmark'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { Link } from '~/i18n/navigation'

interface TimelineListItemProps {
  className?: string
  date: Date
  dateFormat?: 'MM-DD' | 'YYYY-MM-DD'
  href: string
  id?: string
  important?: boolean
  label: string
  meta?: string[]
  onBookmarkClick?: () => void
  peek?: boolean
}

export const TimelineListItem = ({
  date,
  label,
  href,
  meta,
  dateFormat = 'YYYY-MM-DD',
  important,
  id,
  peek,
  onBookmarkClick,
  className,
}: TimelineListItemProps) => {
  const LinkComponent = peek ? PeekLink : Link

  const formattedDate =
    dateFormat === 'MM-DD'
      ? Intl.DateTimeFormat('en-us', {
          month: '2-digit',
          day: '2-digit',
        }).format(date)
      : Intl.DateTimeFormat('en-ca', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date)

  return (
    <li data-id={id}>
      <LinkComponent
        className={clsx('flex items-center justify-between', className)}
        href={href}
      >
        <span className="flex min-w-0 shrink items-center gap-4">
          <span
            className="timeline-date shrink-0 text-copy-13 tabular-nums text-neutral-10/55 transition-colors duration-200"
            style={{ width: dateFormat === 'MM-DD' ? '3.5rem' : '6.5rem' }}
          >
            {formattedDate}
          </span>
          <span className="timeline-title min-w-0 truncate text-copy-14 text-neutral-10/85 transition-colors duration-200">
            {label}
          </span>
          {important && (
            <SolidBookmark
              className="ml-0.5 shrink-0 text-red-500"
              onClick={onBookmarkClick}
            />
          )}
        </span>
        {meta && meta.length > 0 && (
          <span className="hidden shrink-0 text-label-12 text-neutral-10/50 lg:inline">
            {meta.join(' / ')}
          </span>
        )}
      </LinkComponent>
    </li>
  )
}
