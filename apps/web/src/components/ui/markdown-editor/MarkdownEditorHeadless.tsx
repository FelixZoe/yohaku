'use client'

import './MarkdownEditor.css'

import { CodeNode } from '@lexical/code-core'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import type { Transformer } from '@lexical/markdown'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown'
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { EditorState, Klass, LexicalEditor, LexicalNode } from 'lexical'
import { $getRoot, COMMAND_PRIORITY_HIGH, KEY_ENTER_COMMAND } from 'lexical'
import type { MutableRefObject, ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { clsxm } from '~/lib/helper'

import {
  AUTO_LINK_MATCHERS,
  AUTO_LINK_TRANSFORMER,
} from './autoLinkTransformer'

const EMPTY_EDITOR_STATE = {
  root: {
    id: 'root',
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: [],
        direction: null,
        textStyle: '',
        textFormat: 0,
      },
    ],
    direction: null,
  },
} as const

export type MarkdownEditorHeadlessProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: () => void
  autoFocus?: boolean
  scrollIntoView?: boolean
  className?: string
  contentClassName?: string
  actions?: ReactNode
  /**
   * 渲染于 LexicalComposer 内之额外插件（无 UI 输出）。
   * 与 actions 不同：actions 可经 portal 移出，extraPlugin 始终保持在 Composer tree 内，
   * 故可使用 useLexicalComposerContext 注册命令、监听编辑器事件等。
   */
  extraPlugin?: ReactNode
  /**
   * 注册到编辑器之额外 Lexical 节点类。
   */
  extraNodes?: Klass<LexicalNode>[]
  /**
   * 注册到 markdown 序列化 / 反序列化之额外 transformer。
   */
  extraTransformers?: Transformer[]
  onEditorReady?: (editor: LexicalEditor | null) => void
}

const editorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
]

/**
 * Headless markdown editor — bring your own surface (background, border, ring).
 * Wraps Lexical with markdown shortcut + transformer roundtripping.
 *
 * Use `MarkdownEditor` for the standard field-surfaced ergonomic shell.
 */
export const MarkdownEditorHeadless = ({
  value,
  onChange,
  placeholder,
  onSubmit,
  autoFocus,
  scrollIntoView,
  className,
  contentClassName,
  actions,
  extraPlugin,
  extraNodes,
  extraTransformers,
  onEditorReady,
}: MarkdownEditorHeadlessProps) => {
  const initialValueRef = useRef(value)
  const lastMarkdownRef = useRef(value)
  const extraNodesRef = useRef(extraNodes)
  const transformers = useMemo(
    () =>
      extraTransformers && extraTransformers.length > 0
        ? [...extraTransformers, AUTO_LINK_TRANSFORMER, ...TRANSFORMERS]
        : [AUTO_LINK_TRANSFORMER, ...TRANSFORMERS],
    [extraTransformers],
  )
  const transformersRef = useRef(transformers)
  transformersRef.current = transformers

  const initialConfig = useMemo(
    () => ({
      namespace: 'markdown-editor',
      nodes: extraNodesRef.current
        ? [...editorNodes, ...extraNodesRef.current]
        : editorNodes,
      onError(error: Error) {
        throw error
      },
      editorState: initialValueRef.current
        ? () => {
            $convertFromMarkdownString(
              initialValueRef.current,
              transformersRef.current,
              undefined,
              true,
            )
          }
        : JSON.stringify(EMPTY_EDITOR_STATE),
    }),
    [],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={clsxm('markdown-editor', className)}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[inherit]">
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                spellCheck
                aria-label="Markdown editor"
                className={clsxm('markdown-editor__content', contentClassName)}
              />
            }
            placeholder={
              placeholder ? (
                <span className="markdown-editor__placeholder">
                  {placeholder}
                </span>
              ) : null
            }
          />

          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
          <MarkdownShortcutPlugin transformers={transformers} />
          <OnChangePlugin
            onChange={(editorState: EditorState) => {
              editorState.read(() => {
                const markdown = $convertToMarkdownString(
                  transformers,
                  undefined,
                  true,
                )
                if (markdown === lastMarkdownRef.current) return
                lastMarkdownRef.current = markdown
                onChange(markdown)
              })
            }}
          />
          <EditorRefPlugin
            onEditorReady={(editor) => {
              onEditorReady?.(editor)
            }}
          />
          <MarkdownSyncPlugin
            lastMarkdownRef={lastMarkdownRef}
            transformers={transformers}
            value={value}
          />
          {!!onSubmit && <SubmitShortcutPlugin onSubmit={onSubmit} />}
          {!!autoFocus && (
            <AutoFocusPlugin
              autoFocus={autoFocus}
              scrollIntoView={scrollIntoView}
            />
          )}
          {extraPlugin}

          {actions && <div className="markdown-editor__actions">{actions}</div>}
        </div>
      </div>
    </LexicalComposer>
  )
}

const EditorRefPlugin = ({
  onEditorReady,
}: {
  onEditorReady?: (editor: LexicalEditor | null) => void
}) => {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    onEditorReady?.(editor)
    return () => {
      onEditorReady?.(null)
    }
  }, [editor, onEditorReady])
  return null
}

const SubmitShortcutPlugin = ({ onSubmit }: { onSubmit: () => void }) => {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event || !(event.metaKey || event.ctrlKey)) return false
          event.preventDefault()
          onSubmit()
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onSubmit],
  )
  return null
}

const MarkdownSyncPlugin = ({
  value,
  lastMarkdownRef,
  transformers,
}: {
  value: string
  lastMarkdownRef: MutableRefObject<string>
  transformers: Transformer[]
}) => {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    if (value === lastMarkdownRef.current) return
    lastMarkdownRef.current = value
    if (!value) {
      editor.setEditorState(
        editor.parseEditorState(JSON.stringify(EMPTY_EDITOR_STATE)),
      )
      return
    }
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      $convertFromMarkdownString(value, transformers, undefined, true)
    })
  }, [editor, lastMarkdownRef, transformers, value])
  return null
}

const AutoFocusPlugin = ({
  autoFocus,
  scrollIntoView,
}: {
  autoFocus: boolean
  scrollIntoView?: boolean
}) => {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    if (!autoFocus) return
    editor.focus()
    if (scrollIntoView) {
      const rootElement = editor.getRootElement()
      rootElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [editor, autoFocus, scrollIntoView])
  return null
}
