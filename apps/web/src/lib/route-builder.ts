import { buildNotePath } from './note-route'

export const enum Routes {
  Categories = '/categories',

  Category = '/categories/',
  Friends = '/friends',

  Home = '//',
  Login = '/login',
  Note = '/notes/',
  Notes = '/notes',

  NoteTopic = '/notes/series/',

  NoteTopics = '/notes/series',

  Page = '/',

  PageDeletd = '/common/deleted',
  Post = '/posts/',

  Posts = '/posts',
  Project = '/projects/',

  Projects = '/projects',
  Says = '/says',
  Tag = '/posts/tag',
  Thinking = '/thinking',
  ThinkingItem = '/thinking/',

  Timelime = '/timeline',
}

type Noop = never
type Pagination = {
  size?: number
  page?: number
}

type WithId = {
  id: string | number
}
type HomeParams = Noop
type PostsParams = Pagination & {
  sortBy?: string
  orderBy?: 'desc' | 'asc'
}

type PostParams = {
  category: string
  slug: string
}
type NotesParams = Noop
type NoteParams = WithId & {
  password?: string
  slug?: string | null
  createdAt?: string | Date | null
}
type TimelineParams = {
  type: 'note' | 'post' | 'all'
  selectId?: string
}

type OnlySlug = {
  slug: string
}

type OnlyId = {
  id: string
}

type Tag = { name: string }
type RouteParams<T extends Routes> = T extends Routes.Home
  ? HomeParams
  : T extends Routes.Note
    ? NoteParams
    : T extends Routes.Notes
      ? NotesParams
      : T extends Routes.Posts
        ? PostsParams
        : T extends Routes.Post
          ? PostParams
          : T extends Routes.Timelime
            ? TimelineParams
            : T extends Routes.NoteTopic
              ? OnlySlug
              : T extends Routes.NoteTopics
                ? Noop
                : T extends Routes.Page
                  ? OnlySlug
                  : T extends Routes.Category
                    ? OnlySlug
                    : T extends Routes.Project
                      ? OnlyId
                      : T extends Routes.Tag
                        ? Tag
                        : T extends Routes.ThinkingItem
                          ? OnlyId
                          : {}

export function routeBuilder<T extends Routes>(
  route: T,
  params: RouteParams<typeof route>,
) {
  let href: string = route
  switch (route) {
    case Routes.Note: {
      const p = params as NoteParams
      href = buildNotePath({
        nid: p.id,
        slug: p.slug,
        createdAt: p.createdAt,
        password: p.password,
      })
      break
    }
    case Routes.Post: {
      const p = params as PostParams
      href += `${p.category}/${p.slug}`
      break
    }
    case Routes.Posts: {
      const p = params as PostsParams
      href += `?${new URLSearchParams(p as any).toString()}`
      break
    }
    case Routes.Timelime: {
      const p = params as TimelineParams
      href += `?${new URLSearchParams(p as any).toString()}`
      break
    }
    case Routes.NoteTopic:
    case Routes.Category:
    case Routes.Page: {
      const p = params as OnlySlug
      href += p.slug
      break
    }

    case Routes.Home: {
      href = '/'
      break
    }
    case Routes.Tag: {
      const p = params as Tag
      href += `/${p.name}`
      break
    }
    case Routes.Project: {
      const p = params as OnlyId
      href += p.id
      break
    }
    case Routes.ThinkingItem: {
      const p = params as OnlyId
      href += `${p.id}`
      break
    }
  }
  return href
}
