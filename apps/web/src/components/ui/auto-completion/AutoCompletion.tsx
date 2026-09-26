import clsx from 'clsx'
import Fuse from 'fuse.js'
import { AnimatePresence } from 'motion/react'
import type { KeyboardEvent } from 'react'
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { useEventCallback } from '~/hooks/common/use-event-callback'
import { stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'
import { merge, throttle } from '~/lib/lodash'

import type { AdvancedInputProps } from '../input'
import { Input } from '../input'
import { RootPortal } from '../portal'

export type Suggestion = {
  name: string
  value: string
}
interface AutocompleteProps extends AdvancedInputProps {
  onConfirm?: (value: string) => void
  onEndReached?: () => void

  onSuggestionSelected: (suggestion: Suggestion) => void
  portal?: boolean
  renderSuggestion?: (suggestion: Suggestion) => any

  suggestions: Suggestion[]

  // classnames

  wrapperClassName?: string
}

export const Autocomplete = ({
  ref: forwardedRef,
  suggestions,
  renderSuggestion = (suggestion) => suggestion.name,
  onSuggestionSelected,
  onConfirm,
  onEndReached,
  onChange,
  portal,
  wrapperClassName,
  ...inputProps
}: AutocompleteProps & { ref?: React.RefObject<HTMLInputElement | null> }) => {
  const [filterableSuggestions, setFilterableSuggestions] =
    useState(suggestions)
  const [inputValue, setInputValue] = useState(
    inputProps.value || inputProps.defaultValue || '',
  )

  const doFilter = useEventCallback(() => {
    const fuse = new Fuse(suggestions, {
      keys: ['name', 'value'],
    })
    const trimInputValue = (inputValue as string).trim()

    if (!trimInputValue) return setFilterableSuggestions(suggestions)

    const results = fuse.search(trimInputValue)
    setFilterableSuggestions(results.map((result) => result.item))
  })
  useEffect(() => {
    doFilter()
  }, [inputValue, suggestions])

  const [isOpen, setIsOpen] = useState(false)

  const ref = useRef<HTMLDivElement>(null)
  const onBlur = useEventCallback((e: any) => {
    if (ref?.current?.contains(e.relatedTarget)) {
      return
    }
    setIsOpen(false)
  })

  const handleInputKeyDown = useEventCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm?.((e.target as HTMLInputElement).value)
      setIsOpen(false)
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(forwardedRef, () => inputRef.current!)

  const [inputWidth, setInputWidth] = useState(0)
  const [inputPos, setInputPos] = useState(() => ({ x: 0, y: 0 }))

  useLayoutEffect(() => {
    const $input = inputRef.current
    if (!$input) return

    const handler = () => {
      const rect = $input.getBoundingClientRect()
      setInputWidth(rect.width)
      setInputPos({ x: rect.x, y: rect.y + rect.height + 6 })
    }
    handler()

    const resizeObserver = new ResizeObserver(handler)
    resizeObserver.observe($input)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleScroll = useEventCallback(
    throttle(() => {
      const { scrollHeight, scrollTop, clientHeight } = ref.current!
      // gap 50px
      if (scrollHeight - scrollTop - clientHeight < 50) {
        onEndReached?.()
      }
    }, 30),
  )

  const handleChange = useEventCallback((e: any) => {
    setInputValue(e.target.value)
    onChange?.(e)
  })

  const ListElement = (
    <div
      ref={ref}
      className={clsx(
        'pointer-events-auto z-[101] mt-1',
        portal ? 'absolute flex flex-col' : 'absolute w-full',
      )}
      style={merge(
        {},
        portal
          ? {
              width: `${inputWidth}px`,
              left: `${inputPos.x}px`,
              top: `${inputPos.y}px`,
            }
          : {},
      )}
    >
      <ul
        className={clsx(
          'pointer-events-auto max-h-48 grow',
          'overflow-hidden rounded-md border border-neutral-3 bg-neutral-1/90 backdrop-blur',
        )}
        onScroll={handleScroll}
        onWheel={stopPropagation}
      >
        {filterableSuggestions.map((suggestion) => {
          const handleClick = () => {
            onSuggestionSelected(suggestion)
            setIsOpen(false)

            setInputValue(suggestion.name)
          }
          return (
            <li
              className="cursor-default px-4 py-3 text-copy-13 hover:bg-neutral-3"
              key={suggestion.value}
              onClick={handleClick}
              onMouseDown={handleClick}
            >
              {renderSuggestion(suggestion)}
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className={clsxm('pointer-events-auto relative', wrapperClassName)}>
      <Input
        ref={inputRef}
        value={inputValue}
        onBlur={onBlur}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
        {...inputProps}
      />
      <AnimatePresence>
        {isOpen &&
          filterableSuggestions.length > 0 &&
          (portal ? <RootPortal>{ListElement}</RootPortal> : ListElement)}
      </AnimatePresence>
    </div>
  )
}

Autocomplete.displayName = 'Autocomplete'
