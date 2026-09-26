'use client'

import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import { Suspense, useMemo } from 'react'

import { ThinkingItem } from '~/app/[locale]/thinking/item'
import { ClientOnly } from '~/components/common/ClientOnly'
import { GitHubBrandIcon } from '~/components/icons/platform/GitHubBrandIcon'
import { BlockLoading } from '~/components/modules/shared/BlockLoading'
import { EmbedGithubFile } from '~/components/modules/shared/EmbedGithubFile'
import { MarkdownLink } from '~/components/ui/link/MarkdownLink'
import {
  getTweetId,
  isBilibiliVideoUrl,
  isCodesandboxUrl,
  isGistUrl,
  isGithubFilePreviewUrl,
  isSelfThinkingUrl,
  isTweetUrl,
  isYoutubeUrl,
  parseBilibiliVideoUrl,
  parseGithubGistUrl,
  parseGithubTypedUrl,
} from '~/lib/link-parser'
import { apiClient } from '~/lib/request'

const Tweet = dynamic(() => import('~/components/modules/shared/Tweet'), {
  ssr: false,
})

export const FixedRatioContainer = ({
  children,
  ratio = 58,
}: {
  ratio?: number
  children: React.ReactNode
}) => (
  <div className="my-2">
    <div className="flex justify-center px-4">
      <div
        className="relative h-0 w-full"
        style={{
          paddingBottom: `${ratio}%`,
        }}
      >
        {children}
      </div>
    </div>
  </div>
)

export const ThinkingLinkRenderer: FC<{ id: string }> = ({ id }) => {
  const { data } = useQuery({
    queryKey: ['thinking', 'recently', id],
    queryFn: () => apiClient.recently.getById(id),
  })

  if (!data) return null
  return (
    <div className="not-prose font-sans">
      <ThinkingItem item={data} />
    </div>
  )
}

export const GithubFilePreview: FC<{ url: URL; href: string }> = ({
  url,
  href,
}) => {
  const { owner, repo, afterTypeString } = parseGithubTypedUrl(url)
  const splitString = afterTypeString.split('/')
  const ref = splitString[0]
  const path = ref ? splitString.slice(1).join('/') : afterTypeString
  const matchResult = url.hash.match(/L\d+/g)
  let startLineNumber = 0
  let endLineNumber: number | undefined
  if (matchResult?.length === 1) {
    startLineNumber = Number.parseInt(matchResult[0].slice(1)) - 1
    endLineNumber = startLineNumber + 1
  } else if (matchResult && matchResult.length > 1) {
    startLineNumber = Number.parseInt(matchResult[0].slice(1)) - 1
    endLineNumber = Number.parseInt(matchResult[1].slice(1))
  }
  return (
    <div className="flex w-full flex-col items-center">
      <EmbedGithubFile
        endLineNumber={endLineNumber}
        owner={owner}
        path={path}
        refType={ref}
        repo={repo}
        startLineNumber={startLineNumber}
      />
      <div className="mt-4">
        <MarkdownLink href={href}>{href}</MarkdownLink>
      </div>
    </div>
  )
}

export function useLinkEmbed(href: string): ReactNode | null {
  const url = useMemo(() => {
    try {
      return new URL(href)
    } catch {
      return null
    }
  }, [href])

  return useMemo(() => {
    if (!url) return null

    if (isTweetUrl(url)) {
      const id = getTweetId(url)
      return (
        <Suspense>
          <Tweet id={id} />
        </Suspense>
      )
    }

    if (isYoutubeUrl(url)) {
      const id = url.searchParams.get('v')!
      return (
        <FixedRatioContainer>
          <iframe
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="absolute inset-0 size-full border-0"
            src={`https://www.youtube.com/embed/${id}`}
            title="YouTube video player"
          />
        </FixedRatioContainer>
      )
    }

    if (isCodesandboxUrl(url)) {
      return (
        <FixedRatioContainer>
          <iframe
            className="absolute inset-0 size-full rounded-md border-0"
            src={`https://codesandbox.io/embed/${url.pathname.slice(2)}?fontsize=14&hidenavigation=1&theme=dark${url.search}`}
          />
        </FixedRatioContainer>
      )
    }

    if (isSelfThinkingUrl(url)) {
      const id = url.pathname.split('/').pop()!
      return <ThinkingLinkRenderer id={id} />
    }

    if (isBilibiliVideoUrl(url)) {
      const { id } = parseBilibiliVideoUrl(url)
      return (
        <div className="w-screen max-w-full">
          <FixedRatioContainer>
            <ClientOnly
              fallback={
                <BlockLoading className="absolute inset-0 size-full rounded-md">
                  哔哩哔哩视频加载中...
                </BlockLoading>
              }
            >
              <iframe
                allowFullScreen
                className="absolute inset-0 size-full rounded-md border-0"
                frameBorder="no"
                scrolling="no"
                src={`//player.bilibili.com/player.html?bvid=${id}&autoplay=0`}
              />
            </ClientOnly>
          </FixedRatioContainer>
        </div>
      )
    }

    if (isGistUrl(url)) {
      const { owner, id } = parseGithubGistUrl(url)
      return (
        <>
          <iframe
            className="h-[300px] w-full overflow-auto border-0"
            src={`https://gist.github.com/${owner}/${id}.pibb`}
          />
          <a
            className="center mt-2 flex space-x-2"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            <GitHubBrandIcon />
            <span>{href}</span>
          </a>
        </>
      )
    }

    if (isGithubFilePreviewUrl(url)) {
      return <GithubFilePreview href={href} url={url} />
    }

    return null
  }, [href, url])
}
