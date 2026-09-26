'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { $insertNodes } from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'

import { $createCommentImageNode } from '~/components/ui/markdown-editor/ImageNode'
import {
  type CommentUploadConfig,
  fetchCommentUploadConfig,
  uploadCommentImage,
} from '~/lib/comment-uploads'
import { getErrorMessageFromRequestError } from '~/lib/request.shared'
import { toast } from '~/lib/toast'

const RATE_LIMIT_DISABLE_MS = 60_000

type UploadHandler = (file: File) => Promise<void>

const uploadHandlerAtom = atom<UploadHandler | null>(null)
const uploadBusyAtom = atom(false)
const uploadDisabledUntilAtom = atom<number | null>(null)

/**
 * Plugin 部分：必须在 LexicalComposer tree 内，注册 paste/drop 处理器
 * 并将 uploadHandler 暴露到 jotai atom，供 actions slot 中的 button 调用。
 */
export const ImageUploadPlugin = ({
  config,
}: {
  config: CommentUploadConfig
}) => {
  const [editor] = useLexicalComposerContext()
  const setHandler = useSetAtom(uploadHandlerAtom)
  const setBusy = useSetAtom(uploadBusyAtom)
  const setDisabledUntil = useSetAtom(uploadDisabledUntilAtom)

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!config.mimeWhitelist.includes(file.type)) {
        toast.error('不支持的图片格式')
        return false
      }
      if (file.size > config.singleFileSizeMB * 1024 * 1024) {
        toast.error(`图片不得大于 ${config.singleFileSizeMB} MB`)
        return false
      }
      return true
    },
    [config],
  )

  const handleUpload = useCallback<UploadHandler>(
    async (file: File) => {
      if (!validateFile(file)) return
      setBusy(true)
      try {
        const result = await uploadCommentImage(file)
        editor.focus()
        editor.update(() => {
          $insertNodes([$createCommentImageNode(result.url)])
        })
      } catch (err) {
        const status =
          (err as { status?: number; statusCode?: number }).status ??
          (err as { statusCode?: number }).statusCode
        if (status === 429) {
          setDisabledUntil(Date.now() + RATE_LIMIT_DISABLE_MS)
          toast.error('上传过于频繁，请稍后再试')
        } else {
          toast.error(getErrorMessageFromRequestError(err))
        }
      } finally {
        setBusy(false)
      }
    },
    [editor, setBusy, setDisabledUntil, validateFile],
  )

  useEffect(() => {
    setHandler(() => handleUpload)
    return () => {
      setHandler(null)
    }
  }, [handleUpload, setHandler])

  useEffect(() => {
    const root = editor.getRootElement()
    if (!root) return

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind !== 'file') continue
        const file = item.getAsFile()
        if (!file || !file.type.startsWith('image/')) continue
        event.preventDefault()
        void handleUpload(file)
        break
      }
    }

    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return
      const file = files[0]
      if (!file.type.startsWith('image/')) return
      event.preventDefault()
      void handleUpload(file)
    }

    const handleDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault()
      }
    }

    root.addEventListener('paste', handlePaste)
    root.addEventListener('drop', handleDrop)
    root.addEventListener('dragover', handleDragOver)
    return () => {
      root.removeEventListener('paste', handlePaste)
      root.removeEventListener('drop', handleDrop)
      root.removeEventListener('dragover', handleDragOver)
    }
  }, [editor, handleUpload])

  return null
}

/**
 * UI 部分：可在 LexicalComposer tree 之外渲染（通过 portal 至 footer）。
 * 通过 jotai atom 调用 plugin 暴露之 uploadHandler。
 */
export const ImageUploadButton = ({
  config,
}: {
  config: CommentUploadConfig
}) => {
  const handler = useAtomValue(uploadHandlerAtom)
  const busy = useAtomValue(uploadBusyAtom)
  const disabledUntil = useAtomValue(uploadDisabledUntilAtom)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDisabled =
    !handler ||
    busy ||
    (disabledUntil !== null && disabledUntil > Date.now()) ||
    !config.enable

  return (
    <>
      <input
        accept={config.mimeWhitelist.join(',')}
        className="hidden"
        ref={inputRef}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file && handler) void handler(file)
        }}
      />
      <button
        aria-label="上传图片"
        className="center inline-flex size-5 text-copy-14 disabled:opacity-50"
        disabled={isDisabled}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <i
          className={
            busy
              ? 'i-mingcute-loading-line animate-spin'
              : 'i-mingcute-pic-line'
          }
        />
      </button>
    </>
  )
}

const stableEmptyConfig: CommentUploadConfig = {
  enable: false,
  singleFileSizeMB: 5,
  commentImageMaxCount: 4,
  mimeWhitelist: [],
  pendingTtlMinutes: 120,
}

export const useCommentUploadConfig = (enabled: boolean) => {
  const [config, setConfig] = useState<CommentUploadConfig | null>(null)

  useEffect(() => {
    if (!enabled) {
      setConfig(stableEmptyConfig)
      return
    }
    let cancelled = false
    fetchCommentUploadConfig()
      .then((c) => {
        if (!cancelled) setConfig(c)
      })
      .catch(() => {
        if (!cancelled) setConfig(stableEmptyConfig)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return config
}
