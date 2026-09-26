import type {
  CategoryModel,
  NoteModel,
  PageModel,
  PostModel,
} from '@mx-space/api-client'

import { isDev } from '~/lib/env'
import { buildNotePath } from '~/lib/note-route'
import { getAggregationData } from '~/providers/root/aggregation-data-provider'

export function urlBuilder(path = '') {
  if (isDev) return new URL(path, 'http://localhost:2323')
  return new URL(path, getAggregationData()?.url.webUrl)
}

export function isPostModel(model: any): model is PostModel {
  return model.title != null && model.slug != null && model.order == null
}

export function isPageModel(model: any): model is PageModel {
  return model.title != null && model.slug != null && model.order != null
}

export function isNoteModel(model: any): model is NoteModel {
  return model.title != null && model.nid != null
}

function buildUrl(model: PostModel | NoteModel | PageModel) {
  if (isPostModel(model)) {
    if (!model.category) {
      return '#'
    }

    return `/posts/${
      (model.category as CategoryModel).slug
    }/${encodeURIComponent(model.slug)}`
  }

  if (isPageModel(model)) {
    return `/${model.slug}`
  }

  if (isNoteModel(model)) {
    return buildNotePath(model)
  }

  return '/'
}

urlBuilder.build = buildUrl
