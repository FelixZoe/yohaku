import type { ElementTransformer } from '@lexical/markdown'

import {
  $createCommentImageNode,
  $isCommentImageNode,
  CommentImageNode,
} from './ImageNode'

/**
 * Block-level image transformer.
 *
 * - export: ImageNode → `![alt](url)`（每个 block image 单独一行）
 * - import: 整行匹配 `![alt](url)` → 把所在 paragraph 替换为 ImageNode
 *
 * `text-match` 类型 transformer 仅处理 inline 节点；block 节点必须用 `element` 类型。
 */
export const IMAGE_TRANSFORMER: ElementTransformer = {
  dependencies: [CommentImageNode],
  export: (node) => {
    if (!$isCommentImageNode(node)) return null
    return `![${node.getAltText()}](${node.getSrc()})`
  },
  // eslint-disable-next-line unicorn/better-regex
  regExp: /^!\[([^\]]*)\]\(([^\s()]+)\)\s*$/,
  replace: (parentNode, _children, match) => {
    const [, altText, src] = match
    const imageNode = $createCommentImageNode(src, altText)
    parentNode.replace(imageNode)
  },
  type: 'element',
}
