import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TimelineProgress } from './TimelineProgress'

describe('TimelineProgress', () => {
  it('renders stat labels', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en"
        timeZone="UTC"
        messages={{
          home: {
            timeline_stat_day: 'Day of Year',
            timeline_stat_year: 'Year Progress',
            timeline_stat_today: 'Today Progress',
          },
        }}
      >
        <TimelineProgress />
      </NextIntlClientProvider>,
    )

    expect(html).toContain('Day of Year')
    expect(html).toContain('Year Progress')
    expect(html).toContain('Today Progress')
  })
})
