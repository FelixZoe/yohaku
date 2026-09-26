export const PEEK_PARAM = 'peek-to'

export const withPeekParam = (href: string, to: string) => {
  const url = new URL(href)
  url.searchParams.set(PEEK_PARAM, to)
  return `${url.pathname}${url.search}`
}

export const withoutPeekParam = (href: string) => {
  const url = new URL(href)
  url.searchParams.delete(PEEK_PARAM)
  return `${url.pathname}${url.search}`
}
