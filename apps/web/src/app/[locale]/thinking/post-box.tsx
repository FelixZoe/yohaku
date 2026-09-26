'use client'

import type { RecentlyModel } from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'
import type { LexicalEditor } from 'lexical'
import { $getSelection, $isRangeSelection } from 'lexical'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { PaperSheet } from '~/components/layout/container/PaperSheet'
import { MotionButtonBase } from '~/components/ui/button'
import { FloatPopover } from '~/components/ui/float-popover'
import { LinkCardVariant } from '~/components/ui/link-card'
import { MarkdownEditorHeadless } from '~/components/ui/markdown-editor'
import { microReboundPreset } from '~/constants/spring'
import { preventDefault } from '~/lib/dom'
import { resolveEnrichmentFromUrl } from '~/lib/enrichment/resolve'
import { apiClient } from '~/lib/request'
import { toast } from '~/lib/toast'
import type { EnrichmentResult } from '~/models/enrichment'

import { QUERY_KEY } from './constants'

const EmojiPicker = dynamic(
  () =>
    import('~/components/modules/shared/EmojiPicker').then(
      (mod) => mod.EmojiPicker,
    ),
  { ssr: false },
)

const URL_REGEX = /https?:\/\/\S+/gi
const URL_TAIL_TRIM = /[!"'),.:;>?\]`}—…、。〉《》「」『』〕！），：；？]+$/

function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX)
  if (!matches) return []
  return [
    ...new Set(
      matches.map((raw) => {
        let url = raw
        while (URL_TAIL_TRIM.test(url)) {
          url = url.replace(URL_TAIL_TRIM, '')
        }
        return url
      }),
    ),
  ]
}

export const PostBox = () => {
  const t = useTranslations('thinking')
  const isLogin = useIsOwnerLogged()
  const queryClient = useQueryClient()

  const [content, setContent] = useState('')
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])
  const [enrichments, setEnrichments] = useState<
    Record<string, EnrichmentResult>
  >({})
  const [resolving, setResolving] = useState(false)
  const trackedUrlsRef = useRef<string[]>([])
  const editorRef = useRef<LexicalEditor | null>(null)

  const handleInsertText = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertText(text)
      }
    })
  }, [])

  const handleContentChange = useCallback((next: string) => {
    setContent(next)
    const urls = extractUrls(next)
    setDetectedUrls(urls)
    setEnrichments({})
    setResolving(false)
    trackedUrlsRef.current = urls
  }, [])

  useEffect(() => {
    if (detectedUrls.length === 0) return undefined
    const urls = detectedUrls
    const timer = setTimeout(async () => {
      setResolving(true)
      const results: Record<string, EnrichmentResult> = {}
      await Promise.allSettled(
        urls.map(async (url) => {
          const res = await resolveEnrichmentFromUrl(url)
          if (res?.enrichment) results[url] = res.enrichment
        }),
      )
      const current = trackedUrlsRef.current
      if (current.length !== urls.length || current.some((u, i) => u !== urls[i]))
        return
      setEnrichments(results)
      setResolving(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [detectedUrls])

  const canSend = content.trim().length > 0

  const { mutateAsync: handleSend, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiClient.shorthand.proxy.post({
        data: { content },
      })

      setContent('')
      setDetectedUrls([])
      setEnrichments({})
      trackedUrlsRef.current = []

      queryClient.setQueryData<
        InfiniteData<RecentlyModel[] & { comments: number }>
      >(QUERY_KEY, (old) =>
        produce(old, (draft) => {
          draft?.pages[0].unshift(res.$serialized as any)
          return draft
        }),
      )
    },
    onError: () => {
      toast.error('Failed to send')
    },
  })

  if (!isLogin) return null

  const enrichmentEntries = Object.entries(enrichments)

  return (
    <form className="relative mb-9" onSubmit={preventDefault}>
      <PaperSheet />
      <div className="relative z-1 p-[18px_22px]">
        <MarkdownEditorHeadless
          className="h-[120px] text-copy-14 leading-7"
          placeholder={t('post_placeholder')}
          value={content}
          onChange={handleContentChange}
          onSubmit={() => canSend && handleSend()}
          onEditorReady={(editor) => {
            editorRef.current = editor
          }}
        />

        {detectedUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-label-12 text-neutral-5">
            <span>{t('detected_link')}</span>
            {detectedUrls.map((url) => (
              <code
                className="max-w-[360px] truncate rounded-xs bg-neutral-2/40 px-1.5 py-0.5 font-mono text-label-12 text-neutral-7"
                key={url}
              >
                {url}
              </code>
            ))}
            {resolving && (
              <span className="inline-flex items-center gap-1.5 text-neutral-4 italic">
                <span className="size-1.5 animate-pulse rounded-full bg-neutral-4 motion-reduce:animate-none" />
                {t('resolving')}
              </span>
            )}
          </div>
        )}
        {enrichmentEntries.length > 0 && (
          <div className="pointer-events-none mt-3 space-y-2">
            {enrichmentEntries.map(([url, enrichment]) => (
              <LinkCardVariant data={enrichment} key={url} />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center">
          <div className="flex items-center gap-1 text-neutral-6">
            <FloatPopover
              headless
              mobileAsSheet
              popoverClassNames="pointer-events-auto"
              popoverWrapperClassNames="z-[999]"
              trigger="click"
              triggerElement={
                <div
                  className="inline-flex size-7 items-center justify-center rounded-md text-neutral-6 transition-colors hover:bg-neutral-2 hover:text-neutral-9"
                  role="button"
                  tabIndex={0}
                >
                  <i className="i-mingcute-emoji-2-line text-icon-lg" />
                  <span className="sr-only">{t('emoji_label')}</span>
                </div>
              }
            >
              <EmojiPicker onEmojiSelect={handleInsertText} />
            </FloatPopover>
          </div>
          <MotionButtonBase
            aria-label={t('send')}
            className="relative ml-auto size-7 transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
            disabled={!canSend || isPending}
            transition={microReboundPreset}
            whileHover={canSend ? { scale: 1.05 } : undefined}
            whileTap={canSend ? { scale: 0.95 } : undefined}
            onClick={() => handleSend()}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-md bg-neutral-9 [filter:url(#deckle-edge)]"
            />
            <span className="relative inline-flex size-full items-center justify-center text-neutral-1">
              <i className="i-mingcute-arrow-right-line text-icon-sm" />
            </span>
          </MotionButtonBase>
        </div>
      </div>
    </form>
  )
}
