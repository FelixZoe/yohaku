'use client'

import {
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap,
} from '~/components/ui/input/styles'
import { clsxm } from '~/lib/helper'

import type { MarkdownEditorHeadlessProps } from './MarkdownEditorHeadless'
import { MarkdownEditorHeadless } from './MarkdownEditorHeadless'

type MarkdownEditorProps = MarkdownEditorHeadlessProps & {
  rounded?: keyof typeof inputRoundedMap
}

/**
 * Standard markdown editor with the Yohaku field surface
 * (background, border, focus ring, rounded shell).
 *
 * Use `MarkdownEditorHeadless` directly when you want to bring your own surface
 * (e.g. embedding inside a `<PaperSheet>`).
 */
export const MarkdownEditor = ({
  className,
  rounded = 'xl',
  ...rest
}: MarkdownEditorProps) => (
  <MarkdownEditorHeadless
    {...rest}
    className={clsxm(
      'markdown-editor--field-surface',
      fieldWrapperBaseClassName,
      fieldWrapperFocusClassName,
      inputRoundedMap[rounded],
      className,
    )}
  />
)
