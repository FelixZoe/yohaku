export function resolveCommentGuard(options: {
  allowComment?: boolean
  disableComment?: boolean
  allowGuestComment?: boolean
  hasSessionReader: boolean
}) {
  const { allowComment, disableComment, allowGuestComment, hasSessionReader } =
    options

  const commentsClosed = allowComment === false || disableComment === true
  const forceAuthOnly =
    !commentsClosed && !hasSessionReader && allowGuestComment === false

  return {
    commentsClosed,
    forceAuthOnly,
  }
}
