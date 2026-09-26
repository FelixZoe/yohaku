import type { PostModel } from '@mx-space/api-client'

export interface Image {
  accent?: string
  height: number
  src: string
  thumbhash?: string
  type: string
  width: number
}
export type WriteBaseType = {
  title: string
  text: string
  allowComment: boolean

  id: string
  images: Image[]
  createdAt?: string
  modifiedAt?: string

  meta?: any
}

export type PostRelated = Pick<
  PostModel,
  'title' | 'id' | 'slug' | 'categoryId' | 'category'
>
export type PostDto = WriteBaseType & {
  slug: string
  categoryId: string
  copyright: boolean
  tags: string[]
  summary: string
  pinAt: string | null
  relatedId: string[]
  related?: PostRelated[]
}

export interface NoteMusicRecord {
  id: string
  type: string
}

export interface Coordinate {
  latitude: number
  longitude: number
}

export type NoteDto = {
  hide?: boolean
  mood: string | null
  weather: string | null
  slug?: string
  password: string | null
  publicAt?: Date | null
  bookmark?: boolean
  music?: NoteMusicRecord[]
  location?: null | string
  nid?: null | number
  coordinates?: null | Coordinate
  topicId: string | null | undefined
} & WriteBaseType

export { type Pager, type PaginateResult } from '@mx-space/api-client'
