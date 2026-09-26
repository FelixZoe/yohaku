import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import commonZh from '~/messages/zh/common.json'

import { aiNoticeChipLabel, aiNoticeTrail } from './notice-card-ai-fold'
import { NoticeCardAiFold } from './NoticeCard'

vi.mock('~/i18n/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push() {}, replace() {} }),
}))

const renderFold = (chips: string[], body = 'LONG BODY') =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale="zh"
      messages={{ common: commonZh }}
      timeZone="UTC"
    >
      <NoticeCardAiFold chips={chips}>
        <div>{body}</div>
      </NoticeCardAiFold>
    </NextIntlClientProvider>,
  )

describe('aiNoticeChipLabel', () => {
  it('strips a trailing colon from summary labels', () => {
    expect(aiNoticeChipLabel('摘要：')).toBe('摘要')
    expect(aiNoticeChipLabel('Summary: ')).toBe('Summary')
  })

  it('leaves labels without a trailing separator unchanged', () => {
    expect(aiNoticeChipLabel('关键洞察')).toBe('关键洞察')
    expect(aiNoticeChipLabel('AI 技能')).toBe('AI 技能')
  })
})

describe('aiNoticeTrail', () => {
  it('joins chip labels with a middle dot', () => {
    expect(aiNoticeTrail(['关键洞察', 'AI 技能'])).toBe('关键洞察 · AI 技能')
  })

  it('returns the single label when there is only one chip', () => {
    expect(aiNoticeTrail(['摘要'])).toBe('摘要')
  })

  it('returns null when there are no chips', () => {
    expect(aiNoticeTrail([])).toBeNull()
  })
})

describe('NoticeCardAiFold', () => {
  it('starts collapsed with the AI header, trail, and body still in the DOM', () => {
    const html = renderFold(['关键洞察', 'AI 技能'])
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('lg:hidden')
    expect(html).toContain('max-lg:h-0')
    expect(html).toContain('lg:h-auto')
    expect(html).toContain('关键洞察 · AI 技能')
    expect(html).toContain(commonZh.ai_section)
    expect(html).toContain('LONG BODY')
  })
})
