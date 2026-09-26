import { describe, expect, it } from 'vitest'

import { skillWantsMarkdown } from './skill-content-negotiation'

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

describe('skillWantsMarkdown', () => {
  it('serves html to browsers', () => {
    expect(skillWantsMarkdown({ userAgent: CHROME })).toBe(false)
  })

  it('serves markdown to agents and bare clients', () => {
    expect(skillWantsMarkdown({ userAgent: 'curl/8.7.1' })).toBe(true)
    expect(skillWantsMarkdown({ userAgent: '' })).toBe(true)
    expect(skillWantsMarkdown({})).toBe(true)
  })

  it('honours an explicit markdown accept header over any user agent', () => {
    expect(
      skillWantsMarkdown({ accept: 'text/markdown', userAgent: CHROME }),
    ).toBe(true)
    expect(
      skillWantsMarkdown({
        accept: 'text/markdown',
        userAgent: 'Twitterbot/1.0',
      }),
    ).toBe(true)
  })

  it.each([
    ['Twitterbot/1.0'],
    [
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    ],
    ['Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'],
    ['TelegramBot (like TwitterBot)'],
    ['WhatsApp/2.19.81 A'],
    ['Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'],
    ['LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient)'],
    [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ],
    ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
    [
      'Mozilla/5.0 (Macintosh) AppleWebKit/600 (KHTML, like Gecko) Version/12 Safari/600 Applebot/0.1',
    ],
    ['Mastodon/4.2.1 (+https://mastodon.social/)'],
  ])('serves html to link-preview and indexing bots: %s', (userAgent) => {
    expect(skillWantsMarkdown({ userAgent })).toBe(false)
  })
})
