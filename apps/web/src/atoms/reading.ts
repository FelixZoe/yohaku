import { atom } from 'jotai'

export const isInReadingAtom = atom(false)
export const isFocusReadingAtom = atom(false)

// 鼠标是否在 markdown 容器内部
export const isMouseInMarkdownAtom = atom(false)

// 沉浸式阅读效果是否启用（focusReading=true 且 mouseInMarkdown=true）
export const immersiveReadingEnabledAtom = atom(false)

// 主 markdown 容器节点
export const mainMarkdownElementAtom = atom<HTMLElement | null>(null)
