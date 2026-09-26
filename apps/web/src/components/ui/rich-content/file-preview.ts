const MARKDOWN_EXTS = new Set(['md', 'markdown'])
const TEXT_EXTS = new Set([
  'txt',
  'json',
  'yaml',
  'yml',
  'toml',
  'ini',
  'csv',
  'log',
  'js',
  'jsx',
  'ts',
  'tsx',
  'css',
  'scss',
  'html',
  'xml',
  'sh',
  'py',
  'rs',
  'go',
  'swift',
  'sql',
])

export interface FilePreviewSource {
  ext?: string
  mimeType?: string
  name: string
}

export type FilePreviewKind = 'markdown' | 'text' | 'pdf'

const INLINE_EXTS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'svg',
  'bmp',
  'ico',
  'mp4',
  'webm',
  'mov',
  'mp3',
  'wav',
  'ogg',
  'flac',
])

function resolveFileExt(name: string, ext?: string): string {
  if (ext) return ext.toLowerCase()
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index + 1).toLowerCase() : ''
}

export function fileOpensInBrowser(source: FilePreviewSource): boolean {
  if (INLINE_EXTS.has(resolveFileExt(source.name, source.ext))) return true
  const { mimeType } = source
  if (!mimeType) return false
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  )
}

export function filePreviewKind(
  source: FilePreviewSource,
): FilePreviewKind | null {
  const ext = resolveFileExt(source.name, source.ext)
  if (ext === 'pdf' || source.mimeType === 'application/pdf') return 'pdf'
  if (MARKDOWN_EXTS.has(ext)) return 'markdown'
  if (TEXT_EXTS.has(ext)) return 'text'
  if (source.mimeType?.startsWith('text/')) return 'text'
  return null
}
