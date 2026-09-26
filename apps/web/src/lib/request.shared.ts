import { RequestError } from '@mx-space/api-client'
import type { FetchError } from 'ofetch'

export const getErrorMessageFromRequestError = (
  error: RequestError | unknown,
) => {
  if (!(error instanceof RequestError)) return (error as Error).message
  const fetchError = (error as RequestError).raw as FetchError
  const errorBody = fetchError.response?._data
  const messagesOrMessage = errorBody?.error?.message ?? errorBody?.message
  const bizMessage =
    typeof messagesOrMessage === 'string'
      ? messagesOrMessage
      : Array.isArray(messagesOrMessage)
        ? messagesOrMessage[0]
        : undefined

  return bizMessage || fetchError.message
}
