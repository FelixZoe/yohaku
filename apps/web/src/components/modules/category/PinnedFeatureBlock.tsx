import { useLocale, useTranslations } from 'next-intl'

import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

interface PinnedFeatureBlockProps {
  categorySlug: string
  post: {
    id: string
    title: string
    slug: string
    summary?: string | null
    createdAt: string
    readCount?: number
    likeCount?: number
  }
}

export const PinnedFeatureBlock = ({
  post,
  categorySlug,
}: PinnedFeatureBlockProps) => {
  const t = useTranslations('post')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const href = routeBuilder(Routes.Post, {
    category: categorySlug,
    slug: post.slug,
  })

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(post.createdAt))

  return (
    <section className="mb-6 border-b border-neutral-10/[0.06] pb-6">
      <div className="mb-1.5 text-caption-10 tracking-[2px] uppercase text-accent">
        {t('category_pinned_label')}
      </div>
      <Link className="group block" href={href} prefetch={false}>
        <h2 className="text-title-20 font-normal leading-snug text-neutral-10 transition-colors duration-200 group-hover:text-accent">
          {post.title}
        </h2>
        {post.summary ? (
          <p className="mt-2 line-clamp-2 text-label-12 leading-relaxed text-neutral-10/55">
            {post.summary}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2 text-label-12 text-neutral-10/40">
          <span>{dateFmt}</span>
          {post.readCount ? (
            <>
              <span>·</span>
              <span>
                {post.readCount} {tCommon('meta_reads', { count: '' }).trim()}
              </span>
            </>
          ) : null}
        </div>
      </Link>
    </section>
  )
}
