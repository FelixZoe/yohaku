'use client'

import type { Image } from '@mx-space/api-client'
import { atom, useAtomValue } from 'jotai'
import { createContext, use, useEffect, useMemo } from 'react'

import { useRefValue } from '~/hooks/common/use-ref-value'
import { extractLexicalImages } from '~/lib/extract-lexical-images'
import { jotaiStore } from '~/lib/store'

const LexicalImageRecordContext = createContext(atom([] as Image[]))

export const LexicalImageRecordProvider: Component<{
  content?: string | null
}> = ({ children, content }) => {
  const images = useMemo(() => extractLexicalImages(content), [content])
  const atomRef = useRefValue(() => atom(images))

  useEffect(() => {
    jotaiStore.set(atomRef, images)
  }, [images])

  return (
    <LexicalImageRecordContext value={atomRef}>
      {children}
    </LexicalImageRecordContext>
  )
}

export const useLexicalImageList = () =>
  useAtomValue(use(LexicalImageRecordContext))
