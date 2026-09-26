'use client'

import type { LexicalEditor } from 'lexical'
import { $getSelection, $isRangeSelection } from 'lexical'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useRef } from 'react'

import { useSessionReader } from '~/atoms/hooks/reader'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { FloatPopover } from '~/components/ui/float-popover'
import { MarkdownEditor } from '~/components/ui/markdown-editor'
import { CommentImageNode } from '~/components/ui/markdown-editor/ImageNode'
import { IMAGE_TRANSFORMER } from '~/components/ui/markdown-editor/imageTransformer'
import { useRefValue } from '~/hooks/common/use-ref-value'
import { clsxm } from '~/lib/helper'
import { sample } from '~/lib/lodash'

import { KAOMOJI_LIST } from '../../shared/kaomoji'
import { KaomojiPanel } from '../../shared/KaomojiPanel'
import { getRandomPlaceholder } from './constants'
import {
  useCommentBoxTextValue,
  useCommentCompact,
  useSendComment,
  useSetCommentBoxValues,
} from './hooks'
import {
  ImageUploadButton,
  ImageUploadPlugin,
  useCommentUploadConfig,
} from './ImageUploadPlugin'
import { CommentBoxSlotPortal } from './providers'

const EmojiPicker = dynamic(
  () => import('../../shared/EmojiPicker').then((mod) => mod.EmojiPicker),
  { loading: () => <div className="h-[400px] w-[400px]" /> },
)

export const UniversalTextArea: Component<{ autoFocus?: boolean }> = ({
  className,
  autoFocus,
}) => {
  const t = useTranslations('common')
  const placeholder = useRefValue(() => getRandomPlaceholder(t.raw))
  const setter = useSetCommentBoxValues()
  const value = useCommentBoxTextValue()
  const [sendComment] = useSendComment()
  const isMobile = useIsMobile()

  const editorRef = useRef<LexicalEditor | null>(null)
  const shouldAutoFocusByHash =
    typeof location !== 'undefined' && location.hash === '#comment'
  const shouldAutoFocus = !!autoFocus || shouldAutoFocusByHash

  const handleInsertText = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertText(` ${text} `)
      }
    })
  }, [])

  const contentClassName = useMemo(
    () => clsxm(className, 'overflow-auto flex-1 h-0! min-h-0!'),
    [className],
  )

  const commentCompact = useCommentCompact()
  const sessionReader = useSessionReader()
  const uploadConfig = useCommentUploadConfig(!!sessionReader)
  const showImageUpload = !!sessionReader && !!uploadConfig?.enable

  // node + transformer 始终注册：使 markdown `![](url)` 可被任何人正确渲染为
  // ImageNode，且 MarkdownShortcutPlugin 之依赖检查不致因 session 异步加载而失败。
  // 唯 ImageUploadPlugin / ImageUploadButton 之上传能力受 showImageUpload 闸。
  const extraNodes = useMemo(() => [CommentImageNode], [])
  const extraTransformers = useMemo(() => [IMAGE_TRANSFORMER], [])

  return (
    <MarkdownEditor
      autoFocus={shouldAutoFocus}
      className="relative flex flex-col pb-8"
      contentClassName={contentClassName}
      extraNodes={extraNodes}
      extraTransformers={extraTransformers}
      placeholder={placeholder}
      scrollIntoView={shouldAutoFocusByHash}
      value={value}
      actions={
        <CommentBoxSlotPortal>
          {showImageUpload && uploadConfig && (
            <ImageUploadButton config={uploadConfig} />
          )}
          {!isMobile && (
            <FloatPopover
              headless
              mobileAsSheet
              popoverClassNames="pointer-events-auto"
              popoverWrapperClassNames="z-[999]"
              trigger="click"
              triggerElement={
                <div
                  className={'center inline-flex size-5 text-copy-14'}
                  role="button"
                  tabIndex={0}
                >
                  <i className="i-mingcute-emoji-2-line" />
                  <span className="sr-only">{t('emoji_label')}</span>
                </div>
              }
            >
              <EmojiPicker onEmojiSelect={handleInsertText} />
            </FloatPopover>
          )}
          <KaomojiPanel placement="bottom" onInsert={handleInsertText}>
            <div
              className="center inline-flex shrink-0 text-label-12"
              role="button"
              tabIndex={0}
            >
              {useMemo(() => sample(KAOMOJI_LIST), [])}
              <span className="sr-only">{t('kaomoji_label')}</span>
            </div>
          </KaomojiPanel>
        </CommentBoxSlotPortal>
      }
      extraPlugin={
        showImageUpload && uploadConfig ? (
          <ImageUploadPlugin config={uploadConfig} />
        ) : null
      }
      onChange={(next) => setter('text', next)}
      onSubmit={sendComment}
      onEditorReady={(editor) => {
        editorRef.current = editor
      }}
    />
  )
}
