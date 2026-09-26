import 'client-only'

import type {
  CommentUploadConfigDto,
  CommentUploadResultDto,
} from '@mx-space/api-client'

import { apiClient } from './fetch/fetch.client'

export type CommentUploadConfig = CommentUploadConfigDto

export type CommentUploadResult = CommentUploadResultDto

export async function fetchCommentUploadConfig(): Promise<CommentUploadConfig> {
  return apiClient.comment.getUploadConfig()
}

export async function uploadCommentImage(
  file: File,
): Promise<CommentUploadResult> {
  return apiClient.comment.uploadImage(file)
}
