import { describe, expect, it } from 'vitest'

import { buildNoteLatestPreviewContent } from './note-latest-preview-content'

function createTextNode(text: string) {
  return {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text,
    type: 'text',
    version: 1,
  }
}

function createParagraphNode(text: string) {
  return {
    children: [createTextNode(text)],
    direction: null,
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }
}

function createEditorState(nodeTexts: string[]) {
  return JSON.stringify({
    root: {
      children: nodeTexts.map(createParagraphNode),
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}

function getChildrenLength(content: string) {
  const parsed = JSON.parse(content) as {
    root: { children: unknown[] }
  }

  return parsed.root.children.length
}

describe('buildNoteLatestPreviewContent', () => {
  it('keeps only the minimum nodes when their text is already long enough', () => {
    const content = createEditorState(new Array(6).fill('x'.repeat(80)))

    const preview = buildNoteLatestPreviewContent(content)

    expect(getChildrenLength(preview)).toBe(4)
  })

  it('extends up to the max node count when the first nodes are too short', () => {
    const content = createEditorState(new Array(10).fill('short text'))

    const preview = buildNoteLatestPreviewContent(content)

    expect(getChildrenLength(preview)).toBe(8)
  })

  it('returns the original content when the payload is not valid JSON', () => {
    const content = '{"root":{"children":[]}} trailing'

    expect(buildNoteLatestPreviewContent(content)).toBe(content)
  })
})
