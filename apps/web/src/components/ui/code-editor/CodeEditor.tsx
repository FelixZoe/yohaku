import { useEffect, useState } from 'react'

import { stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'

import { BaseCodeHighlighter } from '../code-highlighter'

export const CodeEditor = ({
  ref,
  content,
  language,
  onChange,
  minHeight,
  className,
  padding = 0,
}: {
  content: string
  language: string

  onChange?: (value: string) => void
  minHeight?: string
  className?: string
  padding?: number
} & { ref?: React.RefObject<HTMLTextAreaElement | null> }) => {
  const [highlighterValue, setHighlighterValue] = useState(content)

  useEffect(() => {
    setHighlighterValue(content)
  }, [content])

  const sharedStyles = {
    minHeight,
  }
  return (
    <div
      contentEditable={false}
      className={clsxm(
        'relative [&_*]:font-mono! [&_*]:text-copy-14! [&_*]:leading-normal!',
        className,
      )}
      style={
        {
          padding: `${padding}px`,
          '--padding': `${padding * 2}px`,
        } as any
      }
    >
      <textarea
        className="absolute size-[calc(100%-var(--padding))] resize-none overflow-hidden bg-transparent p-0 text-transparent caret-accent"
        contentEditable={false}
        ref={ref}
        style={sharedStyles}
        value={highlighterValue}
        onKeyDown={stopPropagation}
        onKeyUp={stopPropagation}
        onPaste={stopPropagation}
        onChange={(e) => {
          setHighlighterValue(e.target.value)
          onChange?.(e.target.value)
        }}
      />
      <BaseCodeHighlighter
        className="code-wrap pointer-events-none relative z-[1] m-0! p-0!"
        content={highlighterValue}
        lang={language}
        style={sharedStyles}
      />
    </div>
  )
}

CodeEditor.displayName = 'CodeEditor'
