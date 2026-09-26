import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { atom } from 'jotai'
import type { FC } from 'react'
import { useMemo } from 'react'

import {
  PostMarkdownImageRecordProvider,
  PostMetaBarInternal,
} from '~/app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra'
import { PostMarkdown } from '~/app/[locale]/posts/(post-detail)/[category]/[slug]/PostMarkdown'
import { AckRead } from '~/components/common/AckRead'
import { PaperWithEntrance } from '~/components/layout/container/PaperWithEntrance'
import { Loading } from '~/components/ui/loading'
import { BottomToUpSmoothTransitionView } from '~/components/ui/transition'
import {
  CurrentPostDataAtomProvider,
  CurrentPostDataProvider,
} from '~/providers/post/CurrentPostDataProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'
import type { PostWithTranslation } from '~/queries/definition'
import { queries } from '~/queries/definition'

interface PostPreviewProps {
  category: string
  slug: string
}
export const PostPreview: FC<PostPreviewProps> = (props) => {
  const { category, slug } = props
  const { data, isLoading } = useQuery({
    ...queries.post.bySlug(category, slug),
  })

  const overrideAtom = useMemo(() => atom(null! as PostWithTranslation), [])
  if (isLoading) return <Loading useDefaultLoadingText className="w-full" />
  if (!data) return null
  const postPayload = data as PostWithTranslation
  const post = postPayload.data
  return (
    <CurrentPostDataAtomProvider overrideAtom={overrideAtom}>
      <CurrentPostDataProvider data={postPayload} />
      {!!post.id && <AckRead id={post.id} type="post" />}
      <BottomToUpSmoothTransitionView>
        <PaperWithEntrance>
          <div className="relative w-full min-w-0">
            <header className="mb-8">
              <h1 className="mt-8 mb-3 text-balance text-center text-display-36 font-bold leading-tight">
                {post.title}
              </h1>
              <PostMetaBarInternal className="mb-8 justify-center" />
            </header>
            <WrappedElementProvider eoaDetect>
              <PostMarkdownImageRecordProvider>
                <article
                  className={clsx(post.contentFormat !== 'lexical' && 'prose')}
                >
                  <PostMarkdown />
                </article>
              </PostMarkdownImageRecordProvider>
            </WrappedElementProvider>
          </div>
        </PaperWithEntrance>
      </BottomToUpSmoothTransitionView>
    </CurrentPostDataAtomProvider>
  )
}
