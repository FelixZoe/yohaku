const POST_DETAIL_PATH = /^\/posts(?:\/[^/]+){2}\/?$/
const NOTE_DETAIL_PATH = /^\/notes\/(?:\d+|\d{4}(?:\/\d{1,2}){2}\/[^/]+)\/?$/

/**
 * Crawlers must always get the default-locale canonical at these paths so the
 * indexed URL never drifts with Accept-Language; human visitors still go
 * through regular locale detection.
 */
export const isUnprefixedContentDetailPath = (pathname: string) =>
  POST_DETAIL_PATH.test(pathname) || NOTE_DETAIL_PATH.test(pathname)
