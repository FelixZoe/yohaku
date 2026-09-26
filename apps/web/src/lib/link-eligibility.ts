export function isExternalHttpUrl(href: string, currentHost: string): boolean {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false
  }

  return url.host.toLowerCase() !== currentHost.toLowerCase()
}
