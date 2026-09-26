type NotePathLike = {
  nid: number | string
  slug?: string | null
  createdAt?: string | Date | null
  password?: string | null
}

type NoteLikeWithUnknownSlug = {
  nid: number | string
  createdAt?: string | Date | null
  slug?: unknown
}

const appendPassword = (path: string, password?: string | null) => {
  if (!password) {
    return path
  }

  const query = new URLSearchParams({
    password,
  })

  return `${path}?${query.toString()}`
}

export const buildNoteSeoPath = (
  note: Pick<NotePathLike, 'slug' | 'createdAt'>,
) => {
  if (!note.slug || !note.createdAt) {
    return null
  }

  const date = new Date(note.createdAt)
  if (!Number.isFinite(date.valueOf())) {
    return null
  }

  return `/notes/${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}/${note.slug}`
}

export const buildNotePath = (note: NotePathLike) => {
  return appendPassword(
    buildNoteSeoPath(note) ?? `/notes/${note.nid}`,
    note.password,
  )
}

export const getNoteRouteParams = (note: NoteLikeWithUnknownSlug) => ({
  id: note.nid,
  created: note.createdAt,
  slug: typeof note.slug === 'string' ? note.slug : undefined,
})

const strictDecimalUInt = (s: string): number | null => {
  if (!/^\d+$/.test(s)) {
    return null
  }
  const n = Number(s)
  return Number.isSafeInteger(n) ? n : null
}

/** `notes/:nid` segment must be a positive integer (no leading zeros). */
export const isValidNoteNidSegment = (segment: string): boolean => {
  if (!/^[1-9]\d*$/.test(segment)) {
    return false
  }
  const n = Number(segment)
  return Number.isSafeInteger(n)
}

export type ParsedNotePath =
  | { kind: 'nid'; nid: number; password?: string }
  | {
      kind: 'slug'
      year: number
      month: number
      day: number
      slug: string
      password?: string
    }

const decodeSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export const parseNotePath = (href: string): ParsedNotePath | null => {
  let url: URL
  try {
    url = new URL(href, 'https://note.internal')
  } catch {
    return null
  }

  const [root, ...rest] = url.pathname.split('/').filter(Boolean)
  if (root !== 'notes') {
    return null
  }

  const password = url.searchParams.get('password') ?? undefined

  if (rest.length === 1 && isValidNoteNidSegment(rest[0])) {
    return { kind: 'nid', nid: Number(rest[0]), password }
  }

  if (rest.length === 4) {
    const [year, month, day, slug] = rest
    if (slug && isValidNoteSlugDateParts(year, month, day)) {
      return {
        kind: 'slug',
        year: Number(year),
        month: Number(month),
        day: Number(day),
        slug: decodeSegment(slug),
        password,
      }
    }
  }

  return null
}

/** Validates `notes/y/m/d/slug` date segments (UTC calendar date). */
export const isValidNoteSlugDateParts = (
  year: string,
  month: string,
  day: string,
): boolean => {
  const y = strictDecimalUInt(year)
  const m = strictDecimalUInt(month)
  const d = strictDecimalUInt(day)
  if (y === null || m === null || d === null) {
    return false
  }
  if (y < 1000 || y > 9999 || m < 1 || m > 12) {
    return false
  }
  const maxDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return d >= 1 && d <= maxDay
}
