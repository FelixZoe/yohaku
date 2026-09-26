const BROWSER_UA_PATTERN =
  /Mozilla\/|Chrome\/|Safari\/|Firefox\/|Edge\/|EdgA\/|EdgiOS\/|OPR\/|Opera\/|FxiOS\/|CriOS\//

// Link-preview and indexing bots must reach the HTML page or they never see the
// OG tags. Most of them advertise no browser token, so the generic UA sniff
// below would hand them raw markdown instead.
export const HTML_CRAWLER_PATTERN =
  /applebot|baiduspider|bingbot|bluesky|bsky|discordbot|duckduckbot|embedly|facebookcatalog|facebookexternalhit|google-inspectiontool|googlebot|iframely|linkedinbot|mastodon|petalbot|pinterest|redditbot|skypeuripreview|slackbot|telegrambot|twitterbot|whatsapp|yandex/i

export const skillWantsMarkdown = ({
  accept,
  userAgent,
}: {
  accept?: string | null
  userAgent?: string | null
}) => {
  const ua = userAgent?.trim() ?? ''
  if (accept?.includes('text/markdown')) return true
  if (HTML_CRAWLER_PATTERN.test(ua)) return false
  if (!ua) return true
  return !BROWSER_UA_PATTERN.test(ua)
}
