import { useTranslations } from 'next-intl'
import type * as React from 'react'
import type { FC } from 'react'
import { useCallback, useEffect, useInsertionEffect, useRef } from 'react'

import { useIsPrintMode } from '~/atoms/css-media'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'
import { loadScript, loadStyleSheet } from '~/lib/load-script'
import { toast } from '~/lib/toast'

interface Props {
  content: string
  lang: string | undefined
  startLineNumber?: number
}

export const HighLighterPrismCdn: FC<Props> = (props) => {
  const t = useTranslations('common')
  const { lang: language, content: value, startLineNumber = 1 } = props

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
    toast.success(t('copy_to_clipboard'))
  }, [value, t])

  const ref = useRef<HTMLElement>(null)
  useLoadHighlighter(ref)
  return (
    <div
      className="group relative flex w-full flex-col overflow-auto"
      onCopy={stopPropagation}
    >
      <span
        aria-hidden
        className="absolute right-4 z-[1] translate-x-[-0.5em] translate-y-[0.5em] text-[0.8em] opacity-70"
      >
        {language?.toUpperCase()}
      </span>

      <pre
        className="line-numbers bg-transparent!"
        data-start={startLineNumber}
      >
        <code
          className={`language-${language ?? 'markup'} block! bg-transparent! font-mono! text-copy-14! font-medium!`}
          ref={ref}
        >
          {value}
        </code>
      </pre>

      <div
        aria-hidden
        className="invisible absolute right-[2em] top-[3em] cursor-pointer select-none text-[0.6em] font-semibold uppercase opacity-0 transition-[opacity,visibility] duration-300 ease-in-out after:absolute after:inset-x-[3px] after:bottom-[-3px] after:h-px after:bg-current after:content-[''] hover:opacity-100! group-hover:visible group-hover:opacity-40"
        onClick={handleCopy}
      >
        Copy
      </div>
    </div>
  )
}

export const BaseCodeHighlighter: Component<
  Props & {
    style: React.CSSProperties
  }
> = ({ content, lang, className, style }) => {
  const ref = useRef<HTMLElement>(null)
  useLoadHighlighter(ref)

  useEffect(() => {
    if (ref.current && window.Prism) {
      window.Prism.highlightElement(ref.current)
    }
  }, [content, lang])
  return (
    <pre
      className={clsxm('bg-transparent!', className)}
      data-start="1"
      style={style}
      onCopy={stopPropagation}
    >
      <code
        className={`language-${lang ?? 'markup'} bg-transparent!`}
        ref={ref}
      >
        {content}
      </code>
    </pre>
  )
}

const useLoadHighlighter = (ref: React.RefObject<HTMLElement | null>) => {
  const prevThemeCSS = useRef<ReturnType<typeof loadStyleSheet>>(undefined)
  const isPrintMode = useIsPrintMode()
  const isDark = useIsDark()

  useInsertionEffect(() => {
    const css = loadStyleSheet(
      `https://cdnjs.cloudflare.com/ajax/libs/prism-themes/1.9.0/prism-one-${
        isPrintMode ? 'light' : isDark ? 'dark' : 'light'
      }.css`,
    )

    if (prevThemeCSS.current) {
      const $prev = prevThemeCSS.current
      css.$link.onload = () => {
        $prev.remove()
      }
    }

    prevThemeCSS.current = css
  }, [isDark, isPrintMode])
  useInsertionEffect(() => {
    loadStyleSheet(
      'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/line-numbers/prism-line-numbers.min.css',
    )

    loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-core.min.js',
    )
      .then(() =>
        Promise.all([
          loadScript(
            'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/autoloader/prism-autoloader.min.js',
          ),
          loadScript(
            'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/line-numbers/prism-line-numbers.min.js',
          ),
        ]),
      )
      .then(() => {
        if (ref.current && window.Prism) {
          requestAnimationFrame(() => {
            if (ref.current && window.Prism) {
              window.Prism.highlightElement(ref.current)

              requestAnimationFrame(() => {
                if (ref.current && window.Prism) {
                  window.Prism.highlightElement(ref.current)
                }
              })
            }
          })
        } else if (window.Prism) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.Prism?.highlightAll()
            })
          })
        }
      })
  }, [])
}
