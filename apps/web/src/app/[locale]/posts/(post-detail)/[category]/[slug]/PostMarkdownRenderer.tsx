'use client'

import { MainMarkdown } from '~/components/ui/markdown'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

export const PostMarkdownRenderer = () => {
  const text = useCurrentPostDataSelector((data) => data?.text)
  if (!text) return null
  return (
    <MainMarkdown
      allowsScript
      className="min-w-0 overflow-hidden"
      value={text}
    />
  )
}
