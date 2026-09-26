'use client'

import { fileMetaText } from '@haklex/rich-editor/renderers'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useState,
} from 'react'

import type { PeekOrigin } from '~/components/modules/peek/peek-motion'
import { readPeekOrigin } from '~/components/modules/peek/peek-motion'
import { PeekModal } from '~/components/modules/peek/PeekModal'
import { CollapseContent } from '~/components/ui/collapse'
import { Markdown } from '~/components/ui/markdown'
import { useModalStack } from '~/components/ui/modal'
import { ScrollArea } from '~/components/ui/scroll-area'
import { useEventCallback } from '~/hooks/common/use-event-callback'

import { fileOpensInBrowser, filePreviewKind } from './file-preview'

const PREVIEW_BYTE_LIMIT = 512 * 1024

const PdfFirstPage = dynamic(
  () => import('./pdf/PdfPreview').then((mod) => mod.PdfFirstPage),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="my-2.5 h-96 w-full animate-pulse rounded-sm bg-neutral-2"
      />
    ),
  },
)

const PdfPeekViewer = dynamic(
  () => import('./pdf/PdfPreview').then((mod) => mod.PdfPeekViewer),
  { ssr: false },
)

function pdfPeekModal(origin: PeekOrigin) {
  return function FilePdfPeekModal({ children }: { children?: ReactNode }) {
    return (
      <PeekModal controls={false} origin={origin} size="max">
        {children}
      </PeekModal>
    )
  }
}

interface YohakuFileCardProps {
  display?: 'block' | 'inline'
  ext?: string
  mimeType?: string
  name: string
  size?: number
  src: string
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function isUnmodifiedPrimaryClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; text: string; truncated: boolean }

export function YohakuFileCard(props: YohakuFileCardProps) {
  const { src, name, size, ext, display } = props
  const meta = fileMetaText(name, size, ext)
  const kind = filePreviewKind(props)
  const isPdf = kind === 'pdf'

  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' })
  const t = useTranslations('common')
  const { present } = useModalStack()

  const inlineOpen = fileOpensInBrowser(props)
  const actionLabel = inlineOpen ? t('file_open') : t('file_download')
  const actionTitle = inlineOpen
    ? t('file_open_title', { name })
    : t('file_download_title', { name })
  const actionProps = {
    href: src,
    rel: 'noopener noreferrer' as const,
    target: '_blank' as const,
    ...(inlineOpen ? {} : { download: name }),
  }

  const openPdf = useEventCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    if (!isUnmodifiedPrimaryClick(event)) return
    event.preventDefault()
    const card = event.currentTarget.closest<HTMLElement>('[data-peek-card]')
    present({
      title: name,
      clickOutsideToDismiss: true,
      overlay: true,
      modalContainerClassName:
        'scrollbar-none flex justify-center overflow-hidden',
      CustomModalComponent: pdfPeekModal(
        card
          ? readPeekOrigin(card, 'card')
          : readPeekOrigin(event.currentTarget, 'text'),
      ),
      content: () => <PdfPeekViewer name={name} src={src} />,
    })
  })

  if (display === 'inline') {
    return (
      <a
        className="border-accent hover:text-accent inline whitespace-nowrap border-b border-dashed pb-px font-medium text-(--color-neutral-9) transition-colors"
        title={actionTitle}
        {...actionProps}
        onClick={isPdf ? openPdf : undefined}
      >
        <PaperclipIcon className="mr-0.5 inline size-3 -translate-y-px text-(--color-neutral-6)" />
        {name}
      </a>
    )
  }

  const loadPreview = async () => {
    setPreview({ status: 'loading' })
    try {
      const res = await fetch(src, {
        headers: { Range: `bytes=0-${PREVIEW_BYTE_LIMIT - 1}` },
      })
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`)
      const raw = await res.text()
      const truncated =
        raw.length > PREVIEW_BYTE_LIMIT ||
        res.status === 206 ||
        (size !== undefined && size > PREVIEW_BYTE_LIMIT)
      setPreview({
        status: 'ready',
        text: raw.slice(0, PREVIEW_BYTE_LIMIT),
        truncated,
      })
    } catch {
      setPreview({ status: 'error' })
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && !isPdf && preview.status === 'idle') void loadPreview()
  }

  return (
    <div className="my-4" data-yohaku-file-card="">
      <div
        className={`group flex items-center gap-3 border-y border-border px-1 py-3.5 ${
          kind ? 'cursor-pointer select-none' : ''
        } ${open ? 'border-b-transparent' : ''}`}
        {...(kind
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: toggle,
              onKeyDown: (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle()
                }
              },
            }
          : {})}
      >
        <PaperclipIcon className="size-[15px] shrink-0 text-(--color-neutral-6) transition-colors group-hover:text-accent" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-(--color-neutral-9)">
          <a
            className="hover:border-accent border-b border-transparent pb-px transition-colors"
            title={actionTitle}
            {...actionProps}
            onClick={isPdf ? openPdf : (event) => event.stopPropagation()}
          >
            {name}
          </a>
        </span>
        {meta && (
          <span className="shrink-0 text-[12px] tabular-nums text-(--color-neutral-6)">
            {meta}
          </span>
        )}
        {kind ? (
          <svg
            className={`size-3.5 shrink-0 text-(--color-neutral-6) transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : null}
        <a
          className="text-accent shrink-0 text-[13px] font-medium hover:opacity-80"
          {...actionProps}
          onClick={isPdf ? openPdf : (event) => event.stopPropagation()}
        >
          {actionLabel}
        </a>
      </div>

      <CollapseContent isOpened={!!kind && open}>
        <div className="border-b border-border pb-3.5">
          {isPdf ? (
            <PdfFirstPage name={name} src={src} onOpen={openPdf} />
          ) : (
            <>
              {preview.status === 'loading' && (
                <div
                  aria-hidden
                  className="my-2.5 h-48 w-full animate-pulse rounded-sm bg-(--color-neutral-2)"
                />
              )}
              {preview.status === 'error' && (
                <div className="my-2.5 flex h-48 items-center justify-center rounded-sm bg-(--color-neutral-2) text-[13px] text-(--color-neutral-6)">
                  {t('file_preview_unavailable')} ·
                  <a
                    className="ml-1 font-medium text-accent"
                    download={name}
                    href={src}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t('file_preview_download')}
                  </a>
                </div>
              )}
              {preview.status === 'ready' && (
                <>
                  <ScrollArea.ScrollArea
                    mask
                    rootClassName="border-accent/45 my-2.5 ml-[7px] border-l-2 pl-[18px]"
                    viewportClassName="max-h-48"
                  >
                    {kind === 'markdown' ? (
                      <Markdown className="text-[14px]" value={preview.text} />
                    ) : (
                      <pre className="overflow-x-auto font-mono text-[12.5px] leading-[1.7] text-(--color-neutral-8)">
                        {preview.text}
                      </pre>
                    )}
                  </ScrollArea.ScrollArea>
                  <div className="ml-[27px] text-[12px] text-(--color-neutral-6)">
                    {preview.truncated
                      ? `${t('file_preview_truncated', { size: '512 KB' })} · `
                      : ''}
                    <a
                      className="font-medium text-accent"
                      download={name}
                      href={src}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {t('file_download_full')}
                    </a>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CollapseContent>
    </div>
  )
}
