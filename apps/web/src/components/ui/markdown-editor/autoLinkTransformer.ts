import { $isAutoLinkNode, AutoLinkNode } from '@lexical/link'
import type { TextMatchTransformer } from '@lexical/markdown'
import { createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin'

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[\w#%+.:=@~-]{1,256}\.[a-z]{2,6}\b([\w#%&+./:=?@~-]*)/

const EMAIL_MATCHER =
  /[\w!#$%&'*+./=?^`{|}~-]+@(?:[\da-z](?:[\da-z-]{0,61}[\da-z])?\.)+[a-z]{2,}/i

export const AUTO_LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) =>
    text.startsWith('http') ? text : `https://${text}`,
  ),
  createLinkMatcherWithRegExp(EMAIL_MATCHER, (text) => `mailto:${text}`),
]

/**
 * Serialize AutoLinkNode → markdown `[text](url)`.
 *
 * 内置 LINK transformer 显式排除 AutoLinkNode（return null），
 * 故须单独提供 export，以免裸 URL 转 markdown 时丢失链接。
 */
export const AUTO_LINK_TRANSFORMER: TextMatchTransformer = {
  dependencies: [AutoLinkNode],
  export: (node) => {
    if (!$isAutoLinkNode(node)) return null
    const textContent = node.getTextContent()
    const url = node.getURL()
    if (!textContent || textContent === url) return url
    return `[${textContent}](${url})`
  },
  regExp: /\b\B/,
  type: 'text-match',
}
