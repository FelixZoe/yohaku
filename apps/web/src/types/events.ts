export enum EventTypes {
  ACTIVITY_LEAVE_PRESENCE = 'activity.leave_presence',
  ACTIVITY_UPDATE_PRESENCE = 'activity.update_presence',

  ARTICLE_READ_COUNT_UPDATE = 'article.read_count_update',
  AUTH_FAILED = 'auth.failed',

  COMMENT_CREATE = 'comment.create',
  COMMENT_UPDATE = 'comment.update',

  COMPANION_PRESENCE_CHANGED = 'companion_presence.changed',

  FN_MEDIA_UPDATE = 'fn.media-update',
  FN_PS_UPDATE = 'fn.ps-update',
  FN_SHIRO_STATUS = 'fn.shiro#status',
  FN_SHIRO_UPDATE = 'fn.shiro#update',

  GATEWAY_CONNECT = 'gateway.connect',

  GATEWAY_DISCONNECT = 'gateway.disconnect',
  NOTE_CREATE = 'note.create',
  NOTE_DELETE = 'note.delete',
  NOTE_REPUBLISH = 'note.republish',
  NOTE_UNPUBLISH = 'note.unpublish',

  NOTE_UPDATE = 'note.update',
  PAGE_UPDATE = 'page.update',
  // NOTE 历史遗留
  PAGE_UPDATED = 'PAGE_UPDATED',

  POST_CREATE = 'post.create',
  POST_DELETE = 'post.delete',
  POST_REPUBLISH = 'post.republish',
  POST_UNPUBLISH = 'post.unpublish',

  POST_UPDATE = 'post.update',
  RECENTLY_CREATE = 'recently.create',
  RECENTLY_DELETE = 'recently.delete',

  SAY_CREATE = 'say.create',
  SAY_DELETE = 'say.delete',

  SAY_UPDATE = 'say.update',
  // AI Translation
  TRANSLATION_CREATE = 'translation.create',

  TRANSLATION_UPDATE = 'translation.update',
  VISITOR_OFFLINE = 'visitor.offline',
  VISITOR_ONLINE = 'visitor.online',
}

interface VisitorEventPayload {
  count?: number
  online?: number
  online_count?: number
  onlineCount?: number
  sessionId?: string
  timestamp?: string
}
export enum SocketEmitEnum {
  Join = 'join',
  Leave = 'leave',
  UpdateLang = 'updateLang',
  UpdateSid = 'updateSid',
}
