import { NoteMainContainerHeightPlaceholder } from '~/components/modules/note/NoteMainContainer'
import { FullPageLoading } from '~/components/ui/loading'

export default function NoteDetailLoading() {
  return (
    <NoteMainContainerHeightPlaceholder>
      <FullPageLoading />
    </NoteMainContainerHeightPlaceholder>
  )
}
