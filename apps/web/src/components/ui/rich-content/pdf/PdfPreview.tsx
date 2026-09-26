'use client'

import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import {
  type MouseEvent,
  type RefCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useInView } from 'react-intersection-observer'

import { useCurrentModal } from '~/components/ui/modal'
import { SlotText } from '~/components/ui/slot-text'
import { useEventCallback } from '~/hooks/common/use-event-callback'

import {
  getPdfPageSize,
  loadPdfDocument,
  type PdfDocument,
  renderPdfPage,
} from './load-pdf'

const THUMB_WIDTH = 64

type PdfStatus =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; doc: PdfDocument }

function usePdfDocument(src: string): PdfStatus {
  const [result, setResult] = useState<{ src: string; status: PdfStatus }>({
    src,
    status: { status: 'loading' },
  })

  useEffect(() => {
    let cancelled = false
    void loadPdfDocument(src)
      .then((doc) => {
        if (!cancelled) setResult({ src, status: { status: 'ready', doc } })
      })
      .catch(() => {
        if (!cancelled) setResult({ src, status: { status: 'error' } })
      })
    return () => {
      cancelled = true
    }
  }, [src])

  return result.src === src ? result.status : { status: 'loading' }
}

function useElementWidth(): [RefCallback<HTMLDivElement>, number] {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0)
      setWidth((prev) => (prev === next ? prev : next))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return [setNode, width]
}

function PdfPageCanvas({
  doc,
  maxHeight,
  pageNumber,
  width,
}: {
  doc: PdfDocument
  maxHeight?: number
  pageNumber: number
  width: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0) return
    let cancelled = false
    let task: { cancel: () => void } | null = null
    void renderPdfPage({
      canvas,
      cssWidth: width,
      doc,
      maxCssHeight: maxHeight,
      pageNumber,
    })
      .then((next) => {
        if (cancelled) {
          next.cancel()
          return
        }
        task = next
        return next.promise.catch((error: { name?: string }) => {
          if (error?.name === 'RenderingCancelledException') return
          throw error
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, maxHeight, pageNumber, width])

  return <canvas className="mx-auto block max-w-full" ref={canvasRef} />
}

function PdfError({ name, src }: { name: string; src: string }) {
  const t = useTranslations('common')
  return (
    <div className="my-2.5 flex h-80 items-center justify-center rounded-sm bg-neutral-2 text-copy-13 text-neutral-6">
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
  )
}

export function PdfFirstPage({
  name,
  onOpen,
  src,
}: {
  name: string
  onOpen: (event: MouseEvent<HTMLElement>) => void
  src: string
}) {
  const t = useTranslations('common')
  const state = usePdfDocument(src)
  const [widthRef, width] = useElementWidth()
  const [pageSize, setPageSize] = useState<{
    doc: PdfDocument
    width: number
  } | null>(null)
  const doc = state.status === 'ready' ? state.doc : null
  const pageWidth = pageSize?.doc === doc ? pageSize.width : 0

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    void getPdfPageSize(doc, 1).then((size) => {
      if (!cancelled) setPageSize({ doc, width: size.width })
    })
    return () => {
      cancelled = true
    }
  }, [doc])

  if (state.status === 'error') return <PdfError name={name} src={src} />

  const cssWidth = pageWidth > 0 && width > 0 ? Math.min(width, pageWidth) : 0

  return (
    <div className="my-2.5 w-full" ref={widthRef}>
      <div
        className="relative mx-auto overflow-hidden rounded-sm bg-neutral-2 ring-1 ring-black/10 dark:ring-white/10"
        style={cssWidth > 0 ? { width: cssWidth } : undefined}
      >
        <div className="max-h-96 overflow-y-auto overscroll-contain">
          {doc && cssWidth > 0 ? (
            <div
              className="cursor-pointer"
              title={t('file_open_title', { name })}
              onClick={onOpen}
            >
              <PdfPageCanvas doc={doc} pageNumber={1} width={cssWidth} />
            </div>
          ) : (
            <div aria-hidden className="h-96 w-full animate-pulse" />
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-black/45 via-black/15 to-transparent pb-3">
          <button
            className="pointer-events-auto min-h-10 px-3 text-copy-13 font-medium text-black/70 transition-colors hover:text-black"
            title={t('file_open_title', { name })}
            type="button"
            onClick={onOpen}
          >
            {t('file_pdf_see_more')}
          </button>
        </div>
      </div>
    </div>
  )
}

function PdfThumb({
  active,
  doc,
  onJump,
  pageNumber,
}: {
  active: boolean
  doc: PdfDocument
  onJump: (pageNumber: number) => void
  pageNumber: number
}) {
  const { inView, ref } = useInView({ rootMargin: '400px', triggerOnce: true })

  return (
    <button
      aria-current={active}
      className="block w-full leading-none"
      ref={ref}
      type="button"
      onClick={() => onJump(pageNumber)}
    >
      <div
        className={clsx(
          'aspect-[1/1.414] w-full overflow-hidden bg-neutral-2 ring-1',
          active ? 'ring-accent' : 'ring-neutral-4',
        )}
      >
        {inView ? (
          <PdfPageCanvas
            doc={doc}
            pageNumber={pageNumber}
            width={THUMB_WIDTH}
          />
        ) : null}
      </div>
      <span
        className={clsx(
          'mt-1 block text-caption-10 tabular-nums',
          active ? 'text-accent' : 'text-neutral-6',
        )}
      >
        {pageNumber}
      </span>
    </button>
  )
}

function PdfPeekPage({
  doc,
  onVisible,
  pageNumber,
  width,
}: {
  doc: PdfDocument
  onVisible: (pageNumber: number) => void
  pageNumber: number
  width: number
}) {
  const { inView: near, ref: nearRef } = useInView({ rootMargin: '800px' })
  const { inView: focused, ref: focusRef } = useInView({ threshold: 0.35 })
  const [shown, setShown] = useState(false)
  if (near && !shown) setShown(true)

  useEffect(() => {
    if (focused) onVisible(pageNumber)
  }, [focused, onVisible, pageNumber])

  const ref = useEventCallback((node: HTMLDivElement | null) => {
    nearRef(node)
    focusRef(node)
  })

  return (
    <div
      className="overflow-hidden bg-neutral-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-neutral-4"
      data-page={pageNumber}
      data-peek-hero={pageNumber === 1 ? '' : undefined}
      data-peek-stagger=""
      ref={ref}
    >
      {shown ? (
        <PdfPageCanvas doc={doc} pageNumber={pageNumber} width={width} />
      ) : (
        <div aria-hidden className="aspect-[1/1.414] w-full animate-pulse" />
      )}
    </div>
  )
}

export function PdfPeekViewer({ name, src }: { name: string; src: string }) {
  const t = useTranslations('common')
  const state = usePdfDocument(src)
  const [widthRef, width] = useElementWidth()
  const readerRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const { dismiss } = useCurrentModal()
  const [activePage, setActivePage] = useState(1)
  const onVisible = useEventCallback((pageNumber: number) => {
    setActivePage(pageNumber)
    railRef.current
      ?.querySelector(`[data-thumb="${pageNumber}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  })

  const jump = useEventCallback((pageNumber: number) => {
    readerRef.current
      ?.querySelector(`[data-page="${pageNumber}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  if (state.status === 'error') return <PdfError name={name} src={src} />
  if (state.status !== 'ready') {
    return <div aria-hidden className="size-full animate-pulse bg-neutral-2" />
  }

  const { doc } = state
  const pages = Array.from({ length: doc.numPages }, (_, i) => i + 1)

  return (
    <div className="bg-paper flex h-full min-h-0 flex-col">
      <header
        className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-2.5"
        data-peek-chrome="head"
      >
        <span className="min-w-0 flex-1 truncate text-copy-13 text-neutral-8">
          {name}
        </span>
        <span className="shrink-0 text-label-12 tabular-nums text-neutral-6">
          <SlotText text={String(activePage)} /> / {doc.numPages}
        </span>
        <a
          className="shrink-0 text-copy-13 font-medium text-neutral-6 transition-colors hover:text-neutral-10"
          download={name}
          href={src}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('file_download')}
        </a>
        <button
          className="shrink-0 text-copy-13 font-medium text-neutral-6 transition-colors hover:text-neutral-10"
          type="button"
          onClick={dismiss}
        >
          {t('actions_close')}
        </button>
      </header>

      <div className="group/split flex min-h-0 flex-1">
        <div
          className="scrollbar-none flex w-[84px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-neutral-3 px-2.5 pb-10 pt-3.5 opacity-45 transition-opacity duration-300 group-hover/split:opacity-100"
          data-peek-chrome="rail"
          ref={railRef}
        >
          {pages.map((pageNumber) => (
            <div data-thumb={pageNumber} key={pageNumber}>
              <PdfThumb
                active={pageNumber === activePage}
                doc={doc}
                pageNumber={pageNumber}
                onJump={jump}
              />
            </div>
          ))}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-14 pt-6"
          ref={readerRef}
        >
          <div
            className="mx-auto flex max-w-[44rem] flex-col gap-5"
            ref={widthRef}
          >
            {width > 0
              ? pages.map((pageNumber) => (
                  <PdfPeekPage
                    doc={doc}
                    key={pageNumber}
                    pageNumber={pageNumber}
                    width={width}
                    onVisible={onVisible}
                  />
                ))
              : null}
          </div>
        </div>
      </div>
    </div>
  )
}
