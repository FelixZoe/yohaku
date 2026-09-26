import type { NoteModel, PaginateResult } from '@mx-space/api-client'

type RecentNoteFields = Pick<NoteModel, 'nid' | 'title' | 'createdAt' | 'slug'>
const recentNoteSelect: (keyof NoteModel)[] = [
  'nid',
  'title',
  'createdAt',
  'slug',
]

type NoteClient = {
  note: {
    getList: (
      page?: number,
      perPage?: number,
      options?: { select?: (keyof NoteModel)[]; lang?: string },
    ) => Promise<{
      $serialized: PaginateResult<RecentNoteFields>
    }>
  }
}

export const getRecentNotesQueryOptions = (
  locale: string,
  client: NoteClient,
) => ({
  queryKey: ['nav-recent-notes', locale],
  queryFn: async () => {
    const data = await client.note.getList(1, 4, {
      select: recentNoteSelect,
      lang: locale,
    })

    return data.$serialized
  },
})
