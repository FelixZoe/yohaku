'use client'

import { useLxgwFont } from '@yohaku/rich-content/src/lexical/portable/excalidraw/use-lxgw-font.ts'
import { useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { useMainMarkdownElement } from '~/atoms/hooks/reading'
import { ReadIndicatorCompact } from '~/components/modules/shared/ReadIndicator'
import { jotaiStore } from '~/lib/store'

type Font = 'serif' | 'lxgw'
const FONT_OPTIONS: readonly Font[] = ['serif', 'lxgw']
const fontAtom = atomWithStorage<Font>('note-font', 'serif')

const FONT_META: Record<Font, { family: string; name: string }> = {
  serif: {
    name: '宋体',
    family: 'var(--font-serif), system-ui',
  },
  lxgw: {
    name: '霞鹜文楷',
    family: `'LXGW WenKai Screen', var(--font-sans), var(--font-serif), system-ui`,
  },
}

function getNextFont(current: Font): Font {
  const idx = FONT_OPTIONS.indexOf(current)
  return FONT_OPTIONS[(idx + 1) % FONT_OPTIONS.length]
}

export const NoteFontAdjuster = () => <FontAdjust />

export const NoteTocAccessory = () => {
  const storedFont = useAtomValue(fontAtom)
  const currentFont: Font = FONT_OPTIONS.includes(storedFont)
    ? storedFont
    : 'serif'
  const nextFont = getNextFont(currentFont)
  const t = useTranslations('note')

  const orderedFonts: readonly Font[] = [currentFont, nextFont]

  useLxgwFont()

  return (
    <div className="space-y-1.5 px-2 pt-2">
      <ReadIndicatorCompact as="div" />
      <button
        className="group relative flex min-h-7 w-full cursor-pointer items-center gap-2 py-0.5 pr-2 pl-4 text-left text-neutral-7 duration-200 hover:text-neutral-9"
        title={t('font_selector_title')}
        type="button"
        onClick={() => jotaiStore.set(fontAtom, nextFont)}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-0 flex size-4 -translate-x-2 -translate-y-1/2 items-center justify-start"
        >
          <i className="i-mingcute-font-line text-icon-sm opacity-70" />
        </span>
        <div className="ml-auto inline-flex items-baseline gap-2">
          {orderedFonts.flatMap((font, i) => {
            const meta = FONT_META[font]
            const isCurrent = i === 0
            const nameSpan = (
              <m.span
                key={font}
                layout="position"
                style={{
                  fontFamily: meta.family,
                  letterSpacing: '0.04em',
                  display: 'inline-block',
                  fontSize: isCurrent ? '14px' : '12px',
                  color: isCurrent
                    ? 'var(--color-neutral-9)'
                    : 'var(--color-neutral-6)',
                  transition: 'color 0.28s ease, font-size 0.28s ease',
                }}
                transition={{
                  layout: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] },
                }}
              >
                {meta.name}
              </m.span>
            )
            if (isCurrent) return [nameSpan]
            return [
              <span
                className="text-label-12 text-neutral-6 select-none"
                key="arrow"
              >
                →
              </span>,
              nameSpan,
            ]
          })}
        </div>
      </button>
    </div>
  )
}

const FontAdjust = () => {
  const storedFont = useAtomValue(fontAtom)
  const currentFont: Font = FONT_OPTIONS.includes(storedFont)
    ? storedFont
    : 'serif'
  const mainContentElement = useMainMarkdownElement()
  const prevFontRef = useRef<Font | null>(null)

  useEffect(() => {
    if (!mainContentElement) return
    if (currentFont === 'serif') return
    return applyFont(mainContentElement, FONT_META[currentFont].family)
  }, [currentFont, mainContentElement])

  useEffect(() => {
    if (!mainContentElement) return
    if (prevFontRef.current === null || prevFontRef.current === currentFont) {
      prevFontRef.current = currentFont
      return
    }
    prevFontRef.current = currentFont
    return applyFadeTransition(mainContentElement)
  }, [currentFont, mainContentElement])

  return null
}

function applyFadeTransition(node: HTMLElement) {
  node.style.transition = 'opacity 180ms ease-out'
  node.style.opacity = '0.45'
  const restore = setTimeout(() => {
    node.style.opacity = '1'
  }, 120)
  const finalize = setTimeout(() => {
    node.style.transition = ''
  }, 380)
  return () => {
    clearTimeout(restore)
    clearTimeout(finalize)
    node.style.opacity = ''
    node.style.transition = ''
  }
}

function applyFont(container: HTMLElement, fontFamily: string) {
  const computedStyle = getComputedStyle(document.documentElement)
  const resolved = fontFamily.replaceAll(
    /var\(--([^)]+)\)/g,
    (_, name) => computedStyle.getPropertyValue(`--${name}`).trim() || '',
  )

  const applyEl = (el: HTMLElement) => {
    el.style.setProperty('--note-font-override', resolved)
    el.style.setProperty('--rc-font-family', resolved)
    el.style.fontFamily = fontFamily
  }
  const cleanupEl = (el: HTMLElement) => {
    el.style.removeProperty('--note-font-override')
    el.style.removeProperty('--rc-font-family')
    el.style.removeProperty('font-family')
  }

  const apply = () => {
    applyEl(container)
    container.querySelectorAll<HTMLElement>('.rich-content').forEach(applyEl)
  }

  apply()

  const observer = new MutationObserver(apply)
  observer.observe(container, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    cleanupEl(container)
    container.querySelectorAll<HTMLElement>('.rich-content').forEach(cleanupEl)
  }
}
