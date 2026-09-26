'use client'

import type { Placement } from '@floating-ui/react-dom'
import markdownEscape from 'markdown-escape'
import type { FC, PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { MotionButtonBase } from '~/components/ui/button'
import { FloatPopover } from '~/components/ui/float-popover'
import { ScrollArea } from '~/components/ui/scroll-area'
import { PresentSheet } from '~/components/ui/sheet'

import { KAOMOJI_LIST } from './kaomoji'

export const KaomojiPanel: FC<
  {
    to?: HTMLElement | null
    inputRef?:
      | React.RefObject<HTMLTextAreaElement | null>
      | React.RefObject<HTMLInputElement | null>
    onInsert?: (value: string) => void

    open?: boolean
    onOpenChange?: (open: boolean) => void
    placement?: Placement
    onValueChange?: (value: string) => void
  } & PropsWithChildren
> = ({
  to,
  inputRef,
  placement,
  onOpenChange,
  open,
  children,
  onValueChange,
  onInsert,
}) => {
  const kaomojiGrid = (
    <div className="grid grid-cols-4 gap-4">
      {KAOMOJI_LIST.map((kamoji) => (
        <MotionButtonBase
          key={kamoji}
          onClick={() => {
            const escapeKaomoji = markdownEscape(kamoji)
            if (onInsert) {
              onInsert(escapeKaomoji)
              return
            }

            const $ta = inputRef?.current
            if (!$ta) return
            $ta.focus()

            requestAnimationFrame(() => {
              const start = $ta.selectionStart as number
              const end = $ta.selectionEnd as number
              $ta.value = `${$ta.value.slice(
                0,
                Math.max(0, start),
              )} ${escapeKaomoji} ${$ta.value.substring(end, $ta.value.length)}`
              onValueChange?.($ta.value)

              requestAnimationFrame(() => {
                const shouldMoveToPos = start + escapeKaomoji.length + 2
                $ta.selectionStart = shouldMoveToPos
                $ta.selectionEnd = shouldMoveToPos

                $ta.focus()
              })
            })
          }}
        >
          {kamoji}
        </MotionButtonBase>
      ))}
    </div>
  )

  const sheetContentEl = (
    <ScrollArea.ScrollArea
      mask
      rootClassName="pointer-events-auto h-[250px] w-auto"
    >
      {kaomojiGrid}
    </ScrollArea.ScrollArea>
  )

  const popoverContentEl = (
    <ScrollArea.ScrollArea
      mask
      rootClassName="pointer-events-auto -m-4 h-[calc(250px+2rem)] w-auto lg:h-[calc(200px+2rem)] lg:w-[calc(400px+2rem)]"
    >
      <div className="p-4">{kaomojiGrid}</div>
    </ScrollArea.ScrollArea>
  )

  const [kaomojiPanelOpen, setKaomojiPanelOpen] = useState(open || false)

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(kaomojiPanelOpen)
    }
  }, [kaomojiPanelOpen, onOpenChange])

  const KaomojiButton = children ?? (
    <MotionButtonBase>
      <i className="i-mingcute-emoji-line" />
    </MotionButtonBase>
  )

  const isMobile = useIsMobile()

  return (
    <>
      {isMobile ? (
        <PresentSheet
          content={sheetContentEl}
          triggerAsChild={false}
          zIndex={1002}
          onOpenChange={setKaomojiPanelOpen}
        >
          {KaomojiButton}
        </PresentSheet>
      ) : (
        <FloatPopover
          placement={placement || 'left-end'}
          popoverWrapperClassNames="z-[999]"
          to={to || void 0}
          trigger="click"
          triggerElement={KaomojiButton as any}
          onClose={() => {
            setKaomojiPanelOpen(false)
          }}
          onOpen={() => {
            setKaomojiPanelOpen(true)
          }}
        >
          {popoverContentEl}
        </FloatPopover>
      )}
    </>
  )
}
