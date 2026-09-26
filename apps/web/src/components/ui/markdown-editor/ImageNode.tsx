'use client'

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, DecoratorNode } from 'lexical'

export type SerializedCommentImageNode = Spread<
  {
    src: string
    altText: string
  },
  SerializedLexicalNode
>

const convertImageElement = (
  domNode: HTMLElement,
): DOMConversionOutput | null => {
  if (!(domNode instanceof HTMLImageElement)) return null
  const node = $createCommentImageNode(domNode.src, domNode.alt ?? '')
  return { node }
}

export class CommentImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string
  __altText: string

  static getType(): string {
    return 'comment-image'
  }

  static clone(node: CommentImageNode): CommentImageNode {
    return new CommentImageNode(node.__src, node.__altText, node.__key)
  }

  constructor(src: string, altText = '', key?: NodeKey) {
    super(key)
    this.__src = src
    this.__altText = altText
  }

  static importJSON(json: SerializedCommentImageNode): CommentImageNode {
    return $createCommentImageNode(json.src, json.altText)
  }

  exportJSON(): SerializedCommentImageNode {
    return {
      type: CommentImageNode.getType(),
      version: 1,
      src: this.__src,
      altText: this.__altText,
    }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 1,
      }),
    }
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__altText)
    return { element }
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div')
    div.className = 'block max-w-full'
    return div
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  isInline(): false {
    return false
  }

  decorate(): React.JSX.Element {
    return (
      <img
        alt={this.__altText}
        className="my-2 max-h-64 max-w-full rounded-md object-contain"
        loading="lazy"
        src={this.__src}
      />
    )
  }
}

export function $createCommentImageNode(
  src: string,
  altText = '',
): CommentImageNode {
  return $applyNodeReplacement(new CommentImageNode(src, altText))
}

export function $isCommentImageNode(
  node: LexicalNode | null | undefined,
): node is CommentImageNode {
  return node instanceof CommentImageNode
}
