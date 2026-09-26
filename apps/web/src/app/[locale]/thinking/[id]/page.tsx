import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { CommentBoxRootLazy, CommentsLazy } from '~/components/modules/comment'
import { Link } from '~/i18n/navigation'
import { attachServerFetch, runWithLang } from '~/lib/attach-fetch'
import { apiClient } from '~/lib/request'

import { ThinkingItem } from '../item'

export default async function Page(props: {
  params: Promise<{
    id: string
    locale: string
  }>
}) {
  const params = await props.params
  const { locale } = params
  await attachServerFetch()
  const data = await runWithLang(locale, () =>
    apiClient.recently.getById(params.id),
  )
  const tThinking = await getTranslations({
    locale,
    namespace: 'thinking',
  })
  const tCommon = await getTranslations({
    locale,
    namespace: 'common',
  })

  return (
    <div>
      <header>
        <h1 className="flex items-end gap-3 text-title-28 font-normal text-neutral-9">
          <span>{tThinking('page_title')}</span>
          <a
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-2/40 text-neutral-5 transition-colors hover:text-[#EE802F]"
            data-event="Say RSS click"
            href="/thinking/feed"
            rel="noreferrer"
            target="_blank"
          >
            <i className="i-mingcute-rss-fill text-icon-lg" />
          </a>
        </h1>
        <p className="mt-2 text-copy-15 leading-relaxed text-neutral-6">
          {tThinking('page_subtitle')}
        </p>
      </header>

      <main className="mt-7">
        <nav className="mb-6">
          <Link
            className="inline-flex items-center gap-1.5 text-label-12 text-neutral-6 transition-colors hover:text-accent"
            data-event="Say back click"
            href="/thinking"
          >
            <i className="i-mingcute-arrow-left-circle-line text-icon-sm" />
            {tCommon('actions_back')}
          </Link>
        </nav>

        <ThinkingItem item={data.$serialized} />

        {data.allowComment && (
          <section className="mt-10 border-t border-dashed border-border pt-8">
            <h2 className="text-title-20 font-medium text-neutral-9">
              {tCommon('comment')}
            </h2>
            <Suspense>
              <CommentBoxRootLazy className="my-8" refId={data.id} />
              <CommentsLazy refId={data.id} />
            </Suspense>
          </section>
        )}
      </main>
    </div>
  )
}
