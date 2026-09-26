import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { MTable, MTableTd, MTableTh } from './table'

it('lets the table grow past the viewport so the wrapper can scroll', () => {
  const html = renderToStaticMarkup(
    <MTable>
      <tbody>
        <tr>
          <td>cell</td>
        </tr>
      </tbody>
    </MTable>,
  )
  expect(html).toContain('rich-table-scroll')
  expect(html).toContain('overflow-x-auto')
  expect(html).toContain('w-max')
  expect(html).toContain('min-w-full')
})

it('keeps header and body cells on one line', () => {
  expect(renderToStaticMarkup(<MTableTh>键</MTableTh>)).toContain(
    'whitespace-nowrap',
  )
  expect(renderToStaticMarkup(<MTableTd>值</MTableTd>)).toContain(
    'whitespace-nowrap',
  )
})
