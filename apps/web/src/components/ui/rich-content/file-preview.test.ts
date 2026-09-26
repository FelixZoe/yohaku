import { describe, expect, it } from 'vitest'

import { filePreviewKind } from './file-preview'

describe('filePreviewKind', () => {
  it('returns markdown for md files', () => {
    expect(filePreviewKind({ name: 'README.md' })).toBe('markdown')
    expect(filePreviewKind({ ext: 'markdown', name: 'notes' })).toBe('markdown')
  })

  it('returns text for code and plain-text files', () => {
    expect(filePreviewKind({ name: 'main.ts' })).toBe('text')
    expect(filePreviewKind({ ext: 'json', name: 'data' })).toBe('text')
    expect(filePreviewKind({ mimeType: 'text/plain', name: 'untitled' })).toBe(
      'text',
    )
  })

  it('returns pdf for pdf extension or mime type', () => {
    expect(filePreviewKind({ name: '季度报告.pdf' })).toBe('pdf')
    expect(filePreviewKind({ ext: 'PDF', name: 'report' })).toBe('pdf')
    expect(
      filePreviewKind({
        mimeType: 'application/pdf',
        name: 'report',
      }),
    ).toBe('pdf')
  })

  it('prefers pdf over a misleading text mime type', () => {
    expect(
      filePreviewKind({
        mimeType: 'text/plain',
        name: 'report.pdf',
      }),
    ).toBe('pdf')
  })

  it('returns null for files that cannot be previewed', () => {
    expect(filePreviewKind({ name: 'archive.zip' })).toBeNull()
    expect(
      filePreviewKind({
        mimeType: 'application/zip',
        name: 'bundle',
      }),
    ).toBeNull()
  })
})
