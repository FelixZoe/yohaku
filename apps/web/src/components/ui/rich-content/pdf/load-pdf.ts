// pnpm 11.20.0 crashes resolving any new workspace dep
// (inheritedParentPkgBreaksPeerDiamond), so pdfjs is loaded from unpkg.
const PDFJS_VERSION = '4.10.38'
const PDFJS_BASE = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}`

export type PdfDocument = {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPage>
}

type PdfPage = {
  getViewport: (params: { scale: number }) => { height: number; width: number }
  render: (params: {
    canvas: HTMLCanvasElement
    canvasContext: CanvasRenderingContext2D
    viewport: { height: number; width: number }
  }) => { cancel: () => void; promise: Promise<void> }
}

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (src: {
    cMapPacked?: boolean
    cMapUrl?: string
    disableAutoFetch?: boolean
    standardFontDataUrl?: string
    url: string
    withCredentials?: boolean
  }) => { promise: Promise<PdfDocument> }
}

const documents = new Map<string, Promise<PdfDocument>>()

let pdfjsPromise: Promise<PdfjsModule> | null = null

function unwrapModule(mod: unknown): PdfjsModule {
  if (mod && typeof mod === 'object' && 'getDocument' in mod) {
    return mod as PdfjsModule
  }
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: PdfjsModule }).default
  }
  throw new Error('pdfjs module')
}

async function loadPdfjs(): Promise<PdfjsModule> {
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = import(
    /* webpackIgnore: true */
    `${PDFJS_BASE}/build/pdf.min.mjs`
  ).then((mod) => {
    const pdfjs = unwrapModule(mod)
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/build/pdf.worker.min.mjs`
    return pdfjs
  })
  pdfjsPromise.catch(() => {
    pdfjsPromise = null
  })
  return pdfjsPromise
}

export function loadPdfDocument(src: string): Promise<PdfDocument> {
  const cached = documents.get(src)
  if (cached) return cached
  const pending = (async () => {
    const pdfjs = await loadPdfjs()
    return pdfjs.getDocument({
      url: src,
      withCredentials: false,
      disableAutoFetch: true,
      cMapUrl: `${PDFJS_BASE}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
    }).promise
  })()
  documents.set(src, pending)
  pending.catch(() => {
    documents.delete(src)
  })
  return pending
}

export async function getPdfPageSize(
  doc: PdfDocument,
  pageNumber: number,
): Promise<{ height: number; width: number }> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  return { height: viewport.height, width: viewport.width }
}

export async function renderPdfPage(options: {
  canvas: HTMLCanvasElement
  cssWidth: number
  doc: PdfDocument
  maxCssHeight?: number
  pageNumber: number
}): Promise<{ cancel: () => void; promise: Promise<void> }> {
  const { canvas, cssWidth, doc, maxCssHeight, pageNumber } = options
  const page = await doc.getPage(pageNumber)
  const unscaled = page.getViewport({ scale: 1 })
  const dpr = window.devicePixelRatio || 1
  let cssScale = cssWidth / unscaled.width
  if (maxCssHeight) {
    cssScale = Math.min(cssScale, maxCssHeight / unscaled.height)
  }
  const viewport = page.getViewport({ scale: cssScale * dpr })
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${viewport.width / dpr}px`
  canvas.style.height = `${viewport.height / dpr}px`
  const canvasContext = canvas.getContext('2d')
  if (!canvasContext) throw new Error('2d')
  return page.render({ canvas, canvasContext, viewport })
}
