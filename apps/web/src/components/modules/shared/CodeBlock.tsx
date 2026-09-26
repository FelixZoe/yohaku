import { PortableCodeBlock } from '@yohaku/rich-content/src/lexical/portable/code-block.tsx'
import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import {
  isRenderInShadowDOM,
  shouldInjectHostStyles,
} from '~/components/ui/code-highlighter/shiki/utils'
import { ReactComponentRender } from '~/components/ui/react-component-render'

import { BlockLoading } from './BlockLoading'

const StaticExcalidrawComponent = lazy(() =>
  import('@yohaku/rich-content/src/lexical/portable/excalidraw/index.ts').then(
    (mod) => ({
      default: mod.StaticExcalidraw,
    }),
  ),
)

const ExcalidrawLazy = ({ data }: { data: string }) => {
  const [Excalidraw, setComponent] = useState(null as ReactNode)

  useIsomorphicLayoutEffect(() => {
    setComponent(<StaticExcalidrawComponent data={data} key={data} />)
  }, [data])

  return (
    <ErrorBoundary
      fallback={
        <BlockLoading className="bg-red-200 dark:bg-red-800">
          Excalidraw Load Error
        </BlockLoading>
      }
    >
      <Suspense fallback={<BlockLoading>Whiteboard loading…</BlockLoading>}>
        <div className="aspect-[16/9] w-full">
          {Excalidraw ?? <BlockLoading>Whiteboard loading…</BlockLoading>}
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}

const MermaidLazy = dynamic(() =>
  import('@yohaku/rich-content/src/lexical/portable/mermaid.tsx').then(
    (mod) => mod.Mermaid,
  ),
)

export const CodeBlockRender = (props: {
  lang: string | undefined
  content: string

  attrs?: string
  fold?: boolean
}) => {
  const Content = useMemo(() => {
    switch (props.lang) {
      case 'mermaid': {
        return <MermaidLazy {...props} />
      }
      case 'excalidraw': {
        return <ExcalidrawLazy data={props.content} />
      }
      case 'component': {
        return (
          <div className="not-prose my-4">
            <ReactComponentRender
              dls={props.content}
              injectHostStyles={shouldInjectHostStyles(props.attrs || '')}
              shadow={isRenderInShadowDOM(props.attrs || '')}
            />
          </div>
        )
      }
      default: {
        return (
          <PortableCodeBlock
            code={formatCode(props.content)}
            fold={props.fold !== false}
            language={props.lang}
          />
        )
      }
    }
  }, [props])

  return (
    <Suspense fallback={<BlockLoading>CodeBlock Loading...</BlockLoading>}>
      {Content}
    </Suspense>
  )
}

function formatCode(code: string): string {
  const lines = code.split('\n')

  let minIndent = Number.MAX_SAFE_INTEGER
  lines.forEach((line) => {
    if (line.trim().length > 0) {
      const leadingSpaces = line.match(/^ */)?.[0].length
      if (leadingSpaces === undefined) return
      minIndent = Math.min(minIndent, leadingSpaces)
    }
  })

  if (minIndent === Number.MAX_SAFE_INTEGER) return code

  const formattedLines = lines.map((line) => {
    if (line.trim().length === 0) {
      return line
    } else {
      return line.slice(Math.max(0, minIndent))
    }
  })

  return formattedLines.join('\n')
}
