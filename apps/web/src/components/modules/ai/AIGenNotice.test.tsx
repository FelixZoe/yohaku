import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import aiZh from '~/messages/zh/ai.json'

import { AIGenFullNotice } from './AIGenNotice'

vi.mock('~/i18n/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push() {}, replace() {} }),
}))

const render = (value?: Parameters<typeof AIGenFullNotice>[0]['value']) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="zh" messages={{ ai: aiZh }} timeZone="UTC">
      <AIGenFullNotice value={value} />
    </NextIntlClientProvider>,
  )

describe('AIGenFullNotice', () => {
  it('renders nothing when aiGen is not fully AI-generated', () => {
    expect(render(undefined)).toBe('')
    expect(render(-1)).toBe('')
    expect(render(0)).toBe('')
    expect(render([0, 8])).toBe('')
  })

  it('renders the caution notice when aiGen is 2', () => {
    const html = render(2)
    expect(html).toContain(aiZh.fully_generated_notice)
    expect(html).toContain('i-mingcute-ai-fill')
  })

  it('renders the notice when 2 appears in an array value', () => {
    expect(render([0, 2])).toContain(aiZh.fully_generated_notice)
  })
})
