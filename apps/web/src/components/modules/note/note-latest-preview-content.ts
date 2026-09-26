import type { SerializedEditorState } from 'lexical'

import { safeJsonParse } from '~/lib/helper'

const PREVIEW_MIN_NODES = 4
const PREVIEW_MAX_NODES = 8
const PREVIEW_MIN_TEXT_LENGTH = 220

type SerializedNodeLike = {
  children?: SerializedNodeLike[]
  text?: string
}

function getNodeTextLength(node: SerializedNodeLike): number {
  let length = 0

  if (typeof node.text === 'string') {
    length += node.text.replaceAll(/\s+/g, '').length
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      length += getNodeTextLength(child)
    }
  }

  return length
}

export function buildNoteLatestPreviewContent(content: string): string {
  const editorState = safeJsonParse(content) as SerializedEditorState | null
  const children = editorState?.root?.children

  if (
    !editorState ||
    !Array.isArray(children) ||
    children.length <= PREVIEW_MIN_NODES
  ) {
    return content
  }

  let previewCount = PREVIEW_MIN_NODES
  let textLength = 0

  for (let i = 0; i < previewCount; i += 1) {
    textLength += getNodeTextLength(children[i] as SerializedNodeLike)
  }

  while (
    previewCount < children.length &&
    previewCount < PREVIEW_MAX_NODES &&
    textLength < PREVIEW_MIN_TEXT_LENGTH
  ) {
    textLength += getNodeTextLength(
      children[previewCount] as SerializedNodeLike,
    )
    previewCount += 1
  }

  if (previewCount >= children.length) {
    return content
  }

  return JSON.stringify({
    ...editorState,
    root: {
      ...editorState.root,
      children: children.slice(0, previewCount),
    },
  })
}
