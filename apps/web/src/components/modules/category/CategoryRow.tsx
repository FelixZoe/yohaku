import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

export type CategoryRowMode =
  | { kind: 'category'; tags?: string[]; labelTag?: (tag: string) => string }
  | {
      kind: 'tag'
      category: { name: string; slug: string }
    }

interface CategoryRowProps {
  /** Path context — required to build the post URL. For the category page, this is the category slug. For the tag page, the row carries its own category. */
  categorySlug: string
  /** Active app locale, threaded down from CategoryRowList. */
  locale: string
  /** What the meta line surfaces beside the date — tags (category page) or source category (tag page). */
  mode: CategoryRowMode
  /** Post identity. */
  post: {
    id: string
    title: string
    slug: string
    createdAt: string
  }
  /** Whether to show year in the date label. The list owner decides this based on whether grouping is active. */
  showYear: boolean
}

const MAX_TAGS = 2

export const CategoryRow = ({
  post,
  categorySlug,
  showYear,
  mode,
  locale,
}: CategoryRowProps) => {
  const href = routeBuilder(Routes.Post, {
    category: categorySlug,
    slug: post.slug,
  })

  const date = new Date(post.createdAt)
  const dateLabel = new Intl.DateTimeFormat(locale, {
    year: showYear ? 'numeric' : undefined,
    month: 'short',
    day: 'numeric',
  }).format(date)

  const renderMeta = () => {
    if (mode.kind === 'tag') {
      return (
        <span className="text-accent whitespace-nowrap">
          {mode.category.name}
        </span>
      )
    }
    if (!mode.tags || mode.tags.length === 0) return null
    const visible = mode.tags.slice(0, MAX_TAGS)
    const overflow = mode.tags.length - MAX_TAGS
    const labelTag = mode.labelTag ?? ((tag: string) => tag)
    return (
      <span className="whitespace-nowrap">
        {visible.map((tag, idx) => (
          <span key={tag}>
            <span className="text-accent">#{labelTag(tag)}</span>
            {idx < visible.length - 1 ? ', ' : null}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="text-neutral-10/40"> +{overflow}</span>
        ) : null}
      </span>
    )
  }

  const meta = renderMeta()

  return (
    <li className="list-none">
      <Link
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-neutral-10/[0.05] px-3 -mx-3 py-3.5 transition-[background] duration-300 ease-out hover:bg-gradient-to-r hover:from-transparent hover:via-accent/[0.06] hover:to-transparent"
        href={href}
        prefetch={false}
      >
        <span className="min-w-0 truncate text-copy-14 font-normal text-neutral-10/85 transition-colors duration-200 group-hover:text-accent">
          {post.title}
        </span>
        <span className="flex shrink-0 items-baseline gap-4 text-label-12 tabular-nums">
          {meta}
          <span className="min-w-24 text-right text-neutral-10/40 whitespace-nowrap">
            {dateLabel}
          </span>
        </span>
      </Link>
    </li>
  )
}
