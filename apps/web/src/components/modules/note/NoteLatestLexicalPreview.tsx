import { LexicalContent } from '~/components/ui/rich-content/LexicalContent'

import { buildNoteLatestPreviewContent } from './note-latest-preview-content'

export function NoteLatestLexicalPreview({ content }: { content: string }) {
  return (
    <LexicalContent
      content={buildNoteLatestPreviewContent(content)}
      variant="note"
    />
  )
}
