import { useCallback } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { useModalStack } from '~/components/ui/modal'
import { parseNotePath } from '~/lib/note-route'

import type { PeekOrigin } from './peek-motion'
import { PeekModal } from './PeekModal'

export const usePeek = () => {
  const isMobile = useIsMobile()
  const { present } = useModalStack()
  return useCallback(
    (href: string, origin?: PeekOrigin) => {
      if (isMobile) return
      const basePresentProps = {
        clickOutsideToDismiss: true,
        overlay: true,
        title: 'Preview',
        modalContainerClassName:
          'scrollbar-none flex justify-center overflow-hidden px-2 lg:p-0',
      }

      const noteRef = parseNotePath(href)
      if (noteRef) {
        requestAnimationFrame(async () => {
          const NotePreview = await import('./NotePreview').then(
            (module) => module.NotePreview,
          )
          present({
            ...basePresentProps,

            CustomModalComponent: () => (
              <PeekModal origin={origin} to={href}>
                <NotePreview noteRef={noteRef} />
              </PeekModal>
            ),
            content: () => null,
          })
        })

        return true
      } else if (href.startsWith('/posts/')) {
        requestAnimationFrame(async () => {
          const PostPreview = await import('./PostPreview').then(
            (module) => module.PostPreview,
          )
          const splitpath = href.split('/')
          const slug = splitpath.pop()!
          const category = splitpath.pop()!
          present({
            ...basePresentProps,
            CustomModalComponent: () => (
              <PeekModal origin={origin} to={href}>
                <PostPreview category={category} slug={slug} />
              </PeekModal>
            ),
            content: () => null,
          })
        })
        return true
      }

      return false
    },
    [isMobile, present],
  )
}
