'use client'

import type { Image } from '@mx-space/api-client'
import type { QueryClient } from '@tanstack/react-query'
import { differenceInDays } from 'date-fns'
import { useTranslations } from 'next-intl'
import type { FC, PropsWithChildren } from 'react'
import { useCallback } from 'react'
import type { BlogPosting, WithContext } from 'schema-dts'

import { getWebUrl } from '~/atoms'
import { useFocusReading } from '~/atoms/hooks/reading'
import { withClientOnly } from '~/components/common/ClientOnly'
import { AIGenBadge } from '~/components/modules/ai/AIGenBadge'
import { AIGenFullNotice } from '~/components/modules/ai/AIGenNotice'
import { FreeWindowNoticeItem } from '~/components/modules/membership'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { PostMetaBar } from '~/components/modules/post/PostMetaBar'
import {
  BannerNoticeItem,
  normalizeBannerMeta,
} from '~/components/modules/shared/BannerNoticeItem'
import {
  DataReValidate,
  MarkdownImageRecordProvider,
  MarkdownSelection as SharedMarkdownSelection,
} from '~/components/modules/shared/MarkdownImageRecordProvider'
import { CurrentReadingCountingMetaBarItem } from '~/components/modules/shared/MetaBar'
import { aiNoticeChipLabel } from '~/components/modules/shared/notice-card-ai-fold'
import {
  NoticeCard,
  NoticeCardAiFold,
  NoticeCardItem,
  TranslationNoticeContent,
} from '~/components/modules/shared/NoticeCard'
import { SummarySwitcher } from '~/components/modules/shared/SummarySwitcher'
import { TranslationLanguageSwitcher } from '~/components/modules/translation/TranslationLanguageSwitcher'
import { YohakuSummaryChip } from '~/components/modules/yohaku'
import { RelativeTime } from '~/components/ui/relative-time'
import { articleMetaOf } from '~/lib/api/article-meta'
import { tagGlossaryPairsOf } from '~/lib/api/tag-glossary'
import { noopArr } from '~/lib/noop'
import { toast } from '~/lib/toast'
import {
  useCurrentPostDataSelector,
  useCurrentPostMetaSelector,
  useSetCurrentPostData,
} from '~/providers/post/CurrentPostDataProvider'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'
import type { PostWithTranslation, SkillBundleView } from '~/queries/definition'
import { queries } from '~/queries/definition'

export const LdJsonWithAuthor = ({
  baseLdJson,
}: {
  baseLdJson: WithContext<BlogPosting>
}) => {
  const jsonLd = useAggregationSelector(
    (state) =>
      ({
        ...baseLdJson,
        author: {
          '@type': 'Person',
          name: state.user.name,
          url: state.url.webUrl,
        },
      }) as WithContext<BlogPosting>,
  )
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd),
      }}
    />
  )
}
export const PostTitle = () => {
  const title = useCurrentPostDataSelector((data) => data?.title)!

  return (
    <h1 className="mb-3 text-balance text-center text-display-36 font-bold leading-tight">
      {title}
    </h1>
  )
}
export const MarkdownSelection: Component = (props) => {
  const id = useCurrentPostDataSelector((data) => data?.id)!
  const title = useCurrentPostDataSelector((data) => data?.title)!
  const allowComment = true
  const contentFormat = useCurrentPostDataSelector(
    (data) => data?.contentFormat,
  )
  const content = useCurrentPostDataSelector((data) => data?.content)
  const translationLang = useCurrentPostMetaSelector((meta) => {
    const article = articleMetaOf(meta).translation
    return article?.isTranslated ? (article.targetLang ?? null) : null
  })
  return (
    <SharedMarkdownSelection
      canComment={allowComment}
      content={content}
      contentFormat={contentFormat}
      refId={id}
      title={title}
      translationLang={translationLang}
    >
      {props.children}
    </SharedMarkdownSelection>
  )
}
export const FocusReadingEffect = () => {
  useFocusReading()
  return null
}

export const PostMarkdownImageRecordProvider = (props: PropsWithChildren) => {
  const images = useCurrentPostDataSelector(
    (data) => data?.images ?? (noopArr as Image[]),
  )

  return (
    <MarkdownImageRecordProvider images={images}>
      {props.children}
    </MarkdownImageRecordProvider>
  )
}
export const PostMetaBarInternal: Component = ({ className }) => {
  const base = useCurrentPostDataSelector((data) => {
    if (!data) return
    return {
      createdAt: data.createdAt,
      category: data.category,
      tags: data.tags,
      readCount: data.readCount,
      likeCount: data.likeCount,
      modifiedAt: data.modifiedAt,
      aiGen: data.meta?.aiGen,
    }
  })
  const articleTranslation = useCurrentPostMetaSelector(
    (m) => articleMetaOf(m).translation,
  )
  const tagGlossary = useCurrentPostMetaSelector((m) => tagGlossaryPairsOf(m))
  const meta = base
    ? {
        ...base,
        availableTranslations: articleTranslation?.availableTranslations,
        sourceLang: articleTranslation?.sourceLang,
        articleTranslation,
      }
    : undefined

  if (!meta) return null
  return (
    <PostMetaBar className={className} meta={meta} tagGlossary={tagGlossary}>
      <CurrentReadingCountingMetaBarItem />
      <AIGenBadge className="font-normal" value={meta.aiGen} />
      <TranslationLanguageSwitcher
        availableTranslations={meta.availableTranslations}
        sourceLang={meta.sourceLang}
        triggerClassName="text-label-12"
      />
    </PostMetaBar>
  )
}

export const PostDataReValidate: FC<{
  fetchedAt: string
}> = withClientOnly(({ fetchedAt }) => {
  const dataSetter = useSetCurrentPostData()

  const { category, slug } = useCurrentPostDataSelector((post) => {
    if (!post) return {}
    return {
      category: post.category,
      slug: post.slug,
    }
  })
  const fetchData = useCallback(
    (locale: string, queryClient: QueryClient) =>
      queryClient.fetchQuery(
        queries.post.bySlug(category!.slug, slug!, locale),
      ),
    [category, slug],
  )
  const onData = useCallback(
    (data: unknown) => dataSetter(data as PostWithTranslation),
    [dataSetter],
  )

  return (
    <DataReValidate
      enabled={!!category && !!slug}
      fetchData={fetchData}
      fetchedAt={fetchedAt}
      logMessage="Post data revalidated"
      onData={onData}
    />
  )
})

export const PostNoticeCard = () => {
  const t = useTranslations('post')
  const tc = useTranslations('common')
  const base = useCurrentPostDataSelector((s) => {
    if (!s) return null
    return {
      modified: s.modifiedAt,
      summary: s.summary || '',
      banner: s.meta?.banner,
      aiGen: s.meta?.aiGen,
    }
  })
  const view = useCurrentPostMetaSelector((m) => {
    const helper = articleMetaOf(m)
    return {
      articleTranslation: helper.translation,
      hasInsightsInLocale: helper.hasInsightsInLocale,
      aiSummary: helper.summary?.text || '',
      related: helper.related,
      skills: helper.skills,
    }
  })

  if (!base) return null

  const { modified, summary, banner, aiGen } = base
  const {
    articleTranslation,
    hasInsightsInLocale,
    aiSummary,
    related,
    skills,
  } = view

  const isOutdated = modified
    ? differenceInDays(new Date(), new Date(modified)) > 60
    : false
  const normalizedBanner = normalizeBannerMeta(banner)
  const showSummary = !!summary.trim() || !!aiSummary
  const hasSkills = skills.length > 0
  const aiChips: string[] = []
  if (showSummary) {
    aiChips.push(
      aiNoticeChipLabel(
        summary.trim() ? tc('summary_label') : tc('ai_key_insights'),
      ),
    )
  }
  if (hasSkills) {
    aiChips.push(aiNoticeChipLabel(t('skill_section_title')))
  }

  return (
    <NoticeCard className="my-8">
      <FreeWindowNoticeItem />
      <AIGenFullNotice value={aiGen} />
      {normalizedBanner && <BannerNoticeItem {...normalizedBanner} />}
      {isOutdated && modified && (
        <NoticeCardItem
          icon="i-mingcute-warning-line"
          title={
            <>
              {t('outdated_prefix')}
              <RelativeTime date={modified} />
              {t('outdated_suffix')}
            </>
          }
        />
      )}
      {related && related.length > 0 && (
        <NoticeCardItem
          icon="i-mingcute-link-2-line"
          title={t('related_before')}
        >
          <div className="space-y-1.5">
            {related.map((post) => {
              const ref = post as typeof post & {
                category?: { slug?: string } | null
              }
              const href = `/posts/${ref.category?.slug ?? ''}/${ref.slug ?? ''}`
              return (
                <div className="flex items-center gap-1.5" key={href}>
                  <span className="text-neutral-5">
                    <i className="i-mingcute-corner-down-left-line scale-x-[-1] text-copy-13" />
                  </span>
                  <PeekLink
                    className="text-copy-13 text-neutral-8 transition-colors hover:text-accent"
                    href={href}
                  >
                    {post.title}
                  </PeekLink>
                </div>
              )
            })}
          </div>
        </NoticeCardItem>
      )}
      {articleTranslation?.isTranslated && (
        <NoticeCardItem>
          <TranslationNoticeContent articleTranslation={articleTranslation} />
        </NoticeCardItem>
      )}
      {(showSummary || hasSkills) && (
        <NoticeCardAiFold chips={aiChips}>
          {showSummary && (
            <NoticeCardItem
              action={hasInsightsInLocale ? <YohakuSummaryChip /> : undefined}
              icon="i-mingcute-sparkles-line"
              title={
                summary.trim() ? tc('summary_label') : tc('ai_key_insights')
              }
            >
              <SummarySwitcher
                aiSummary={aiSummary}
                summary={summary}
                variant="inline"
              />
            </NoticeCardItem>
          )}
          {hasSkills && <PostSkillsNoticeItem skills={skills} />}
        </NoticeCardAiFold>
      )}
    </NoticeCard>
  )
}

const buildSkillPageUrl = (skill: SkillBundleView, absolute = false) => {
  if (!absolute) return `/skills/${encodeURIComponent(skill.name)}`
  const path = `/skills/${encodeURIComponent(skill.name)}/SKILL.md`
  const origin = getWebUrl()
  return origin ? `${origin.replace(/\/$/, '')}${path}` : path
}

const PostSkillsNoticeItem = ({ skills }: { skills: SkillBundleView[] }) => {
  const t = useTranslations('post')

  const handleCopy = async (skill: SkillBundleView) => {
    const prompt =
      t('skill_prompt_text', { url: buildSkillPageUrl(skill, true) }) + '\n\n'
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success(t('skill_copied'))
    } catch {
      toast.info(t('skill_copy_fallback'))
    }
  }

  return (
    <NoticeCardItem
      icon="i-mingcute-sparkles-line"
      title={t('skill_section_title')}
    >
      <p className="mb-2.5 text-label-12 leading-relaxed text-neutral-6">
        {t('skill_section_hint')}
      </p>
      <div className="space-y-1.5">
        {skills.map((skill) => (
          <div className="flex items-start gap-1.5" key={skill.id}>
            <span className="mt-0.5 text-neutral-5">
              <i className="i-mingcute-corner-down-left-line scale-x-[-1] text-copy-13" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <a
                  className="font-mono text-copy-13 text-neutral-9 transition-colors hover:text-accent"
                  href={buildSkillPageUrl(skill)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {skill.name}
                </a>
                <button
                  className="inline-flex shrink-0 items-center gap-1 text-label-12 text-accent underline underline-offset-2 transition-opacity hover:opacity-80"
                  type="button"
                  onClick={() => handleCopy(skill)}
                >
                  <i
                    aria-hidden
                    className="i-mingcute-magic-2-line text-copy-13"
                  />
                  {t('skill_copy_prompt')}
                </button>
              </div>
              <div className="mt-0.5 text-label-12 leading-relaxed text-neutral-7">
                {skill.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </NoticeCardItem>
  )
}
