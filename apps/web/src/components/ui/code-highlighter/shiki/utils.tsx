// import { bundledLanguages } from 'shiki/langs'

export const parseFilenameFromAttrs = (attrs: string) => {
  // filename=""

  const match = attrs.match(/filename="([^"]+)"/)
  if (match) {
    return match[1]
  }
  return null
}

export const parseShouldCollapsedFromAttrs = (attrs: string) =>
  // collapsed
  attrs.includes('collapsed') || !attrs.includes('expand')
export const isRenderInShadowDOM = (attrs: string) => attrs.includes('shadow')

export const shouldInjectHostStyles = (attrs: string) =>
  attrs.includes('with-styles')
