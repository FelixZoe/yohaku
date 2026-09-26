import type { Image } from '@mx-space/api-client'

type AnyNode = {
  type?: string
  src?: string
  width?: number
  height?: number
  accent?: string
  thumbhash?: string
  altText?: string
  alt?: string
  children?: AnyNode[]
  images?: AnyNode[]
}

function pushImage(out: Image[], seen: Set<string>, node: AnyNode) {
  if (!node?.src || seen.has(node.src)) return
  seen.add(node.src)
  out.push({
    src: node.src,
    width: node.width ?? 0,
    height: node.height ?? 0,
    type: '',
    accent: node.accent,
    thumbhash: node.thumbhash,
  })
}

function walk(out: Image[], seen: Set<string>, node: AnyNode | undefined) {
  if (!node) return
  if (node.type === 'image') {
    pushImage(out, seen, node)
  } else if (node.type === 'gallery' && Array.isArray(node.images)) {
    for (const img of node.images) pushImage(out, seen, img)
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(out, seen, child)
  }
}

export function extractLexicalImages(
  content: string | undefined | null,
): Image[] {
  if (!content) return []
  let parsed: { root?: AnyNode } | null = null
  try {
    parsed = JSON.parse(content)
  } catch {
    return []
  }
  if (!parsed?.root) return []
  const out: Image[] = []
  const seen = new Set<string>()
  walk(out, seen, parsed.root)
  return out
}
