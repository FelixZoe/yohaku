import type { AfilmoryLayout, AfilmorySource } from '@mx-space/editor'
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical'

export const FORMAT_BOLD = 1
export const FORMAT_ITALIC = 1 << 1
export const FORMAT_STRIKETHROUGH = 1 << 2
export const FORMAT_UNDERLINE = 1 << 3
export const FORMAT_CODE = 1 << 4

type AnyNode = SerializedLexicalNode & Record<string, unknown>

export function text(content: string, format = 0): AnyNode {
  return {
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text: content,
    type: 'text',
    version: 1,
  }
}

export function paragraph(...children: SerializedLexicalNode[]): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    type: 'paragraph',
    version: 1,
  }
}

export function heading(
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    tag,
    type: 'heading',
    version: 1,
  }
}

export function quote(...children: SerializedLexicalNode[]): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'quote',
    version: 1,
  }
}

export function list(
  listType: 'bullet' | 'number',
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    listType,
    start: 1,
    tag: listType === 'bullet' ? 'ul' : 'ol',
    type: 'list',
    version: 1,
  }
}

export function listItem(...children: SerializedLexicalNode[]): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'listitem',
    value: 1,
    version: 1,
  }
}

export function checkList(
  ...items: { checked: boolean; children: SerializedLexicalNode[] }[]
): AnyNode {
  return {
    children: items.map((item, idx) => ({
      checked: item.checked,
      children: item.children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'listitem',
      value: idx + 1,
      version: 1,
    })),
    direction: 'ltr',
    format: '',
    indent: 0,
    listType: 'check',
    start: 1,
    tag: 'ul',
    type: 'list',
    version: 1,
  }
}

export function link(
  url: string,
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    rel: null,
    target: null,
    title: null,
    type: 'link',
    url,
    version: 1,
  }
}

export function autoLink(url: string): AnyNode {
  return {
    children: [text(url)],
    direction: 'ltr',
    format: '',
    indent: 0,
    rel: null,
    target: null,
    title: null,
    type: 'autolink',
    url,
    version: 1,
  }
}

export function horizontalRule(): AnyNode {
  return { type: 'horizontalrule', version: 1 }
}

export function lineBreak(): AnyNode {
  return { type: 'linebreak', version: 1 }
}

export function details(
  summary: string,
  open: boolean,
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    open,
    summary,
    type: 'details',
    version: 1,
  }
}

export function table(...rows: SerializedLexicalNode[]): AnyNode {
  return {
    children: rows,
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'table',
    version: 1,
  }
}

export function tableRow(...cells: SerializedLexicalNode[]): AnyNode {
  return {
    children: cells,
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'tablerow',
    version: 1,
  }
}

export function tableCell(
  headerState: number,
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    children,
    colSpan: 1,
    direction: 'ltr',
    format: '',
    headerState,
    indent: 0,
    type: 'tablecell',
    version: 1,
    width: null,
  }
}

export function codeBlock(language: string, code: string): AnyNode {
  return { code, language, type: 'code-block', version: 1 }
}

export function codeSnippet(
  files: { filename: string; code: string; language: string }[],
): AnyNode {
  return { files, type: 'code-snippet', version: 1 }
}

export function image(payload: {
  src: string
  altText: string
  width?: number
  height?: number
  caption?: string
  accent?: string
  displayWidth?: number
  layout?: 'align-left' | 'align-right' | 'float-left' | 'float-right'
}): AnyNode {
  return {
    accent: payload.accent,
    altText: payload.altText,
    caption: payload.caption,
    displayWidth: payload.displayWidth,
    height: payload.height,
    layout: payload.layout,
    src: payload.src,
    type: 'image',
    version: 1,
    width: payload.width,
  }
}

export function afilmory(payload: {
  baseUrl: string
  source: AfilmorySource
  layout?: AfilmoryLayout
  title?: string
  caption?: string
  alt?: string
  accent?: string
  limit?: number
}): AnyNode {
  return {
    accent: payload.accent,
    alt: payload.alt,
    baseUrl: payload.baseUrl,
    caption: payload.caption,
    layout: payload.layout,
    limit: payload.limit,
    source: payload.source,
    title: payload.title,
    type: 'afilmory',
    version: 1,
  }
}

export function afilmoryPhoto(payload: {
  id: string
  baseUrl: string
  w?: number
  h?: number
  hash?: string
  alt?: string
  accent?: string
  caption?: string
}): AnyNode {
  return afilmory({
    accent: payload.accent,
    alt: payload.alt,
    baseUrl: payload.baseUrl,
    caption: payload.caption,
    source: {
      items: [
        {
          id: payload.id,
          w: payload.w ?? 3000,
          h: payload.h ?? 2000,
          ...(payload.hash ? { hash: payload.hash } : {}),
        },
      ],
      kind: 'list',
    },
  })
}

export function afilmoryCollection(payload: {
  baseUrl: string
  source: AfilmorySource
  layout?: AfilmoryLayout
  title?: string
  caption?: string
  limit?: number
  accent?: string
}): AnyNode {
  return afilmory(payload)
}

export function gallery(payload: {
  layout: 'grid' | 'masonry' | 'carousel'
  images: { src: string; alt?: string; width?: number; height?: number }[]
}): AnyNode {
  return {
    images: payload.images,
    layout: payload.layout,
    type: 'gallery',
    version: 1,
  }
}

export function video(payload: {
  src: string
  poster?: string
  width?: number
  height?: number
}): AnyNode {
  return {
    height: payload.height,
    poster: payload.poster,
    src: payload.src,
    type: 'video',
    version: 1,
    width: payload.width,
  }
}

export function file(payload: {
  src: string
  name: string
  size?: number
  mimeType?: string
  ext?: string
  display?: 'block' | 'inline'
}): AnyNode {
  return {
    display: payload.display,
    ext: payload.ext,
    mimeType: payload.mimeType,
    name: payload.name,
    size: payload.size,
    src: payload.src,
    type: 'file',
    version: 1,
  }
}

export function embed(url: string, source: string | null = null): AnyNode {
  return { source, type: 'embed', url, version: 1 }
}

export function linkCard(url: string): AnyNode {
  return { type: 'link-card', url, version: 1 }
}

export function mermaid(diagram: string): AnyNode {
  return { diagram, type: 'mermaid', version: 1 }
}

export function alertQuote(
  alertType: 'note' | 'tip' | 'important' | 'warning' | 'caution',
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    alertType,
    content: {
      root: {
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    },
    type: 'alert-quote',
    version: 1,
  }
}

export function banner(
  bannerType: 'note' | 'tip' | 'important' | 'warning' | 'caution',
  ...children: SerializedLexicalNode[]
): AnyNode {
  return {
    bannerType,
    content: {
      root: {
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    },
    type: 'banner',
    version: 1,
  }
}

export function ruby(base: string, reading: string): AnyNode {
  return {
    children: [text(base)],
    direction: 'ltr',
    format: '',
    indent: 0,
    reading,
    type: 'ruby',
    version: 1,
  }
}

export function mention(payload: {
  platform: string
  handle: string
  displayName?: string
}): AnyNode {
  return {
    handle: payload.handle,
    platform: payload.platform,
    type: 'mention',
    version: 1,
    ...(payload.displayName ? { displayName: payload.displayName } : {}),
  }
}

export function chat(payload: {
  variant: 'user-agent' | 'user-user'
  participants: {
    id: string
    kind: 'user' | 'agent'
    name?: string
    avatar?: string
  }[]
  messages: { id: string; participantId: string; content: string }[]
}): AnyNode {
  return {
    messages: payload.messages,
    participants: payload.participants,
    type: 'chat',
    variant: payload.variant,
    version: 1,
  }
}

export function poll(payload: {
  pollId: string
  question: string
  options: { id: string; label: string }[]
  mode: 'single' | 'multiple'
}): AnyNode {
  return {
    mode: payload.mode,
    options: payload.options,
    pollId: payload.pollId,
    question: payload.question,
    type: 'poll',
    version: 1,
  }
}

export function excalidraw(snapshot: object): AnyNode {
  return {
    snapshot: JSON.stringify(snapshot),
    type: 'excalidraw',
    version: 1,
  }
}

export function dynamic(payload: {
  url: string
  props?: Record<string, unknown>
  initialHeight?: number
}): AnyNode {
  return {
    initialHeight: payload.initialHeight ?? 320,
    props: payload.props ?? {},
    type: 'dynamic',
    url: payload.url,
    version: 1,
  }
}

export function nestedDoc(...children: SerializedLexicalNode[]): AnyNode {
  return {
    content: {
      root: {
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    },
    type: 'nested-doc',
    version: 1,
  }
}

export function doc(
  ...children: SerializedLexicalNode[]
): SerializedEditorState {
  return {
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    } as SerializedEditorState['root'],
  }
}

export const toJSON = (state: SerializedEditorState): string =>
  JSON.stringify(state)
