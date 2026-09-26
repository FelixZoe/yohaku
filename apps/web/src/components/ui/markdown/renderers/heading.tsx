import type { DOMAttributes } from 'react'
import { createElement, useMemo, useRef } from 'react'

import { useIsClient } from '~/hooks/common/use-is-client'
import { springScrollToElement } from '~/lib/scroller'

interface HeadingProps {
  children: React.ReactNode
  className?: string
  id: string
  level: number
}

export const createMarkdownHeadingComponent = () => {
  let index = 0
  return (props: HeadingProps) => {
    const ref = useRef<boolean | number>(false)
    const memoizedIndex = useMemo(() => {
      if (typeof ref.current === 'number') {
        return ref.current
      }
      ref.current = index++
      return ref.current
    }, [])
    return <MHeader index={memoizedIndex} {...props} />
  }
}

const MHeader = (
  props: HeadingProps & {
    index: number
  },
) => {
  const { children, id, level, index } = props

  const isClient = useIsClient()

  const nextId = `${index}__${id}`
  return createElement<DOMAttributes<HTMLHeadingElement>, HTMLHeadingElement>(
    `h${level}`,
    {
      id: nextId,
      className: 'group flex items-center',

      'data-markdown-heading': true,
    } as any,
    null,
    <>
      <span>{children}</span>
      {isClient && (
        <a
          aria-hidden
          className="center ml-2 inline-flex cursor-pointer select-none text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          href={`#${nextId}`}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            const { state } = history
            history.replaceState(state, '', `#${nextId}`)
            springScrollToElement(document.getElementById(nextId)!, -100)
            e.preventDefault()
          }}
        >
          <i className="i-mingcute-hashtag-line" />
        </a>
      )}
    </>,
  )
}
