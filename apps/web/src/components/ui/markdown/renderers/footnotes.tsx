import { useTranslations } from 'next-intl'
import type { FC, PropsWithChildren } from 'react'
import * as React from 'react'

import { KeyboardReturnRounded } from '~/components/icons/return'
import { springScrollToElement } from '~/lib/scroller'

import { Divider } from '../../divider'
import { getFootNoteDomId, getFootNoteRefDomId } from '../utils/get-id'
import { redHighlight } from '../utils/redHighlight'

export const MFootNote: FC<PropsWithChildren> = (props) => {
  const t = useTranslations('common')

  return (
    <div className="mt-4" id="md-footnote">
      <Divider />
      <ul className="list-[upper-roman] space-y-3 text-copy-14 text-neutral-7">
        {React.Children.map(props.children, (child) => {
          if (React.isValidElement(child)) {
            const { id } = child.props as any as { id: string }
            return (
              <li id={`${getFootNoteDomId(id)}`} key={id}>
                {React.cloneElement(child as React.ReactElement<any>, {
                  className: 'inline',
                })}
                <a
                  className="ml-2 inline-flex items-center"
                  href={`#${getFootNoteRefDomId(id)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    springScrollToElement(
                      document.getElementById(`${getFootNoteRefDomId(id)}`)!,
                      -window.innerHeight / 2,
                    )
                    redHighlight(`${getFootNoteRefDomId(id)}`)
                  }}
                >
                  <KeyboardReturnRounded />
                  <span className="sr-only">
                    {t('footnote_return')}
                    {id}
                  </span>
                </a>
              </li>
            )
          }

          return null
        })}
      </ul>
    </div>
  )
}
