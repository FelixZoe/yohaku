import { useQuery } from '@tanstack/react-query'
import { atom } from 'jotai'
import type { FC } from 'react'
import { useMemo } from 'react'

import { NoteMarkdown } from '~/app/[locale]/notes/(note-detail)/[id]/NoteMarkdown'
import {
  IndentArticleContainer,
  NoteMarkdownImageRecordProvider,
  NoteTitle,
} from '~/app/[locale]/notes/(note-detail)/[id]/pageExtra'
import { AckRead } from '~/components/common/AckRead'
import { PaperWithEntrance } from '~/components/layout/container/PaperWithEntrance'
import { Loading } from '~/components/ui/loading'
import { BottomToUpSmoothTransitionView } from '~/components/ui/transition'
import type { ParsedNotePath } from '~/lib/note-route'
import {
  CurrentNoteDataAtomProvider,
  CurrentNoteDataProvider,
} from '~/providers/note/CurrentNoteDataProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'
import { queries } from '~/queries/definition'
import type { NoteWrappedPayloadWithMeta } from '~/queries/definition/note'

import { NoteHideIfSecret, NoteMetaBar, NoteRootBanner } from '../note'
import { NoteHeadCover } from '../note/NoteHeadCover'

interface NotePreviewProps {
  noteRef: ParsedNotePath
}
export const NotePreview: FC<NotePreviewProps> = ({ noteRef }) => {
  return noteRef.kind === 'nid' ? (
    <NotePreviewByNid noteRef={noteRef} />
  ) : (
    <NotePreviewBySlugDate noteRef={noteRef} />
  )
}

const NotePreviewByNid: FC<{
  noteRef: Extract<ParsedNotePath, { kind: 'nid' }>
}> = ({ noteRef }) => {
  const { data, isLoading } = useQuery({
    ...queries.note.byNid(noteRef.nid.toString(), noteRef.password),
  })
  return <NotePreviewBody data={data} isLoading={isLoading} />
}

const NotePreviewBySlugDate: FC<{
  noteRef: Extract<ParsedNotePath, { kind: 'slug' }>
}> = ({ noteRef }) => {
  const { data, isLoading } = useQuery({
    ...queries.note.bySlugDate(
      noteRef.year,
      noteRef.month,
      noteRef.day,
      noteRef.slug,
      noteRef.password,
    ),
  })
  return <NotePreviewBody data={data} isLoading={isLoading} />
}

const NotePreviewBody: FC<{
  data?: NoteWrappedPayloadWithMeta
  isLoading: boolean
}> = ({ data, isLoading }) => {
  const overrideAtom = useMemo(
    () => atom(null! as NoteWrappedPayloadWithMeta),
    [],
  )
  if (isLoading) return <Loading useDefaultLoadingText className="w-full" />
  if (!data) return null
  const note = data.data
  return (
    <CurrentNoteDataAtomProvider overrideAtom={overrideAtom}>
      <CurrentNoteDataProvider data={data} />
      {!!note.id && <AckRead id={note.id} type="note" />}
      <BottomToUpSmoothTransitionView>
        <PaperWithEntrance>
          <NoteHeadCover image={note.meta?.cover} />
          <IndentArticleContainer prose={note.contentFormat !== 'lexical'}>
            <header>
              <NoteTitle />
              <NoteMetaBar />
              <NoteRootBanner />
            </header>

            <NoteHideIfSecret>
              <WrappedElementProvider eoaDetect>
                <NoteMarkdownImageRecordProvider>
                  <NoteMarkdown />
                </NoteMarkdownImageRecordProvider>
              </WrappedElementProvider>
            </NoteHideIfSecret>
          </IndentArticleContainer>
        </PaperWithEntrance>
      </BottomToUpSmoothTransitionView>
    </CurrentNoteDataAtomProvider>
  )
}
